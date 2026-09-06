import fs from 'fs';
import path from 'path';
import http from 'http';
import { execSync } from 'child_process';
import { WebSocket, WebSocketServer } from 'ws';
import express, { Request, Response } from 'express';
import { VideoLoopValidator, QualityGateResult } from './videoLoopValidator';
import { EquiangularResampler } from './equiangularResampler';

export interface FlowTask {
  taskId: string;
  prompt: string;
  maxRetries: number;
  currentAttempt: number;
  status: 'PENDING' | 'GENERATING' | 'VALIDATING' | 'SUCCESS' | 'FAILED';
  history: Array<{
    attempt: number;
    videoPath?: string;
    gateResult?: QualityGateResult;
    timestamp: number;
  }>;
  resultFramesDir?: string;
  createdAt: number;
  updatedAt: number;
}

export class FlowBridgeManager {
  private static instance: FlowBridgeManager;
  private activeWs: WebSocket | null = null;
  private tasks: Map<string, FlowTask> = new Map();
  private tempBaseDir: string;

  private constructor() {
    this.tempBaseDir = path.resolve(process.cwd(), 'temp/flow_bridge');
    if (!fs.existsSync(this.tempBaseDir)) {
      fs.mkdirSync(this.tempBaseDir, { recursive: true });
    }
  }

  public static getInstance(): FlowBridgeManager {
    if (!FlowBridgeManager.instance) {
      FlowBridgeManager.instance = new FlowBridgeManager();
    }
    return FlowBridgeManager.instance;
  }

  /**
   * 挂载 WebSocket 桥接与 Express REST API
   */
  public attach(server: http.Server, app: express.Application) {
    const wss = new WebSocketServer({ noServer: true });

    // 升级 /v1/ws/flow-bridge 协议
    server.on('upgrade', (request, socket, head) => {
      const pathname = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`).pathname;
      if (pathname === '/v1/ws/flow-bridge') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      }
    });

    wss.on('connection', (ws: WebSocket) => {
      console.log('🔗 [FlowBridge] Google Labs 浏览器助手已接入连接！');
      this.activeWs = ws;

      ws.send(JSON.stringify({
        type: 'HEARTBEAT_ACK',
        message: 'FlowBridge 服务端已就绪，保持长连接保活中',
        timestamp: Date.now(),
      }));

      ws.on('message', (data: any) => {
        try {
          const msg = JSON.parse(data.toString());
          this.handleClientMessage(msg);
        } catch (e) {
          console.warn('[FlowBridge] 消息解析异常:', e);
        }
      });

      ws.on('close', () => {
        console.warn('⚠️ [FlowBridge] Google Labs 浏览器助手断开连接');
        if (this.activeWs === ws) this.activeWs = null;
      });
    });

    // REST: 获取当前助手在线状态及活跃任务
    app.get('/v1/flow/status', (_req: Request, res: Response) => {
      res.json({
        code: 200,
        isHelperConnected: this.activeWs !== null && this.activeWs.readyState === WebSocket.OPEN,
        activeTasks: Array.from(this.tasks.values()),
      });
    });

    // REST: 下发新的 360° 生成任务
    app.post('/v1/flow/dispatch', (req: Request, res: Response) => {
      const { prompt, maxRetries = 3 } = req.body;
      if (!prompt) {
        return res.status(400).json({ code: 400, message: '必须指定生成提示词 prompt' });
      }

      if (!this.activeWs || this.activeWs.readyState !== WebSocket.OPEN) {
        return res.status(503).json({
          code: 503,
          message: 'Google Labs 网页助手未连接！请先在 Chrome 浏览器中打开 Google Labs 页面并启动油猴助手。',
        });
      }

      const taskId = `flow_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const task: FlowTask = {
        taskId,
        prompt,
        maxRetries,
        currentAttempt: 1,
        status: 'PENDING',
        history: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      this.tasks.set(taskId, task);
      this.sendToHelper({
        type: 'DISPATCH_GENERATION',
        taskId,
        prompt,
        attempt: 1,
      });

      task.status = 'GENERATING';
      res.json({ code: 200, message: '生成任务已成功下发至浏览器助手', taskId });
    });

    // REST: 接收浏览器助手上传的视频文件
    app.post('/v1/flow/upload-video', express.raw({ type: '*/*', limit: '200mb' }), async (req: Request, res: Response) => {
      const taskId = req.query.taskId as string;
      if (!taskId || !this.tasks.has(taskId)) {
        return res.status(404).json({ code: 404, message: '无效或已过期的任务 taskId' });
      }

      const task = this.tasks.get(taskId)!;
      const attempt = task.currentAttempt;
      const taskDir = path.join(this.tempBaseDir, taskId);
      if (!fs.existsSync(taskDir)) fs.mkdirSync(taskDir, { recursive: true });

      const videoPath = path.join(taskDir, `attempt_${attempt}.mp4`);
      fs.writeFileSync(videoPath, req.body);
      console.log(`📥 [FlowBridge] 收到任务 ${taskId} 第 ${attempt} 次生成的视频 (${(req.body.length / (1024 * 1024)).toFixed(2)} MB)`);

      // 异步触发硬核 5 重质检与自愈重试流水线
      this.processIncomingVideo(task, videoPath).catch(err => {
        console.error(`[FlowBridge] 质检流水线异常:`, err);
      });

      res.json({ code: 200, message: '视频接收成功，已启动 5 重物理硬核质检门禁' });
    });
  }

  /**
   * 处理助手传回的消息
   */
  private handleClientMessage(msg: any) {
    if (msg.type === 'PONG' || msg.type === 'HEARTBEAT') {
      return;
    }
    if (msg.type === 'GENERATION_ERROR') {
      console.error(`🚨 [FlowBridge] 浏览器助手汇报生成失败: ${msg.error}`);
      const task = this.tasks.get(msg.taskId);
      if (task) {
        task.status = 'FAILED';
        task.updatedAt = Date.now();
      }
    }
  }

  /**
   * 向浏览器助手发送控制信令
   */
  private sendToHelper(data: any) {
    if (this.activeWs && this.activeWs.readyState === WebSocket.OPEN) {
      this.activeWs.send(JSON.stringify(data));
    }
  }

  /**
   * 核心自愈重试流水线：提取帧 -> 5重质检 -> 合格则等角切片，不合格则触发重试
   */
  private async processIncomingVideo(task: FlowTask, videoPath: string) {
    task.status = 'VALIDATING';
    task.updatedAt = Date.now();

    const taskDir = path.dirname(videoPath);
    const extractDir = path.join(taskDir, `extract_${task.currentAttempt}`);
    if (!fs.existsSync(extractDir)) fs.mkdirSync(extractDir, { recursive: true });

    // 1. FFmpeg 快速提取帧
    console.log(`[FlowBridge] 正在抽取第 ${task.currentAttempt} 次视频帧...`);
    execSync(`ffmpeg -y -i "${videoPath}" -q:v 2 "${extractDir}/frame_%04d.jpg"`, { stdio: 'ignore' });

    // 2. 运行 5 重硬核质检 (严格卡死 358.0°，杜绝反向/跳切/停滞)
    console.log(`[FlowBridge] 正在执行 5 重硬核质检门禁...`);
    const qResult = await VideoLoopValidator.validateFrames(extractDir, 358.0);

    task.history.push({
      attempt: task.currentAttempt,
      videoPath,
      gateResult: qResult,
      timestamp: Date.now(),
    });

    if (!qResult.passed) {
      console.warn(`\n🚨 [FlowBridge] 第 ${task.currentAttempt} 次生成未通过物理质检！`);
      console.warn(`- 原因: [${qResult.code}] ${qResult.reason}`);

      if (task.currentAttempt < task.maxRetries) {
        task.currentAttempt++;
        task.status = 'GENERATING';
        task.updatedAt = Date.now();

        console.log(`🔁 [FlowBridge] 自动重试自愈启动！准备下发第 ${task.currentAttempt} 次生成指令...\n`);
        this.sendToHelper({
          type: 'RETRY_GENERATION',
          taskId: task.taskId,
          prompt: task.prompt,
          attempt: task.currentAttempt,
          rejectReason: qResult.reason,
        });
        return;
      } else {
        task.status = 'FAILED';
        task.updatedAt = Date.now();
        console.error(`❌ [FlowBridge] 已达最大重试次数 (${task.maxRetries})，任务标记失败，坚决拦截瑕疵数据入库。`);
        return;
      }
    }

    // 3. 质检通过！执行标准 180 帧等角物理重采样
    console.log(`\n🎉 [FlowBridge] 第 ${task.currentAttempt} 次生成 100% 完美通过质检！启动 180 帧等角重采样...`);
    const finalOutputDir = path.resolve(process.cwd(), 'web/public/experiments/frames_v4_180fps');
    
    await EquiangularResampler.resample({
      inputDir: extractDir,
      outputDir: finalOutputDir,
      targetTotalFrames: 180,
      enableBlending: true,
    });

    task.status = 'SUCCESS';
    task.resultFramesDir = finalOutputDir;
    task.updatedAt = Date.now();
    console.log(`✨ [FlowBridge] 180 帧高定展台切片已完全交付！任务 ${task.taskId} 成功完成！\n`);

    this.sendToHelper({
      type: 'TASK_COMPLETED',
      taskId: task.taskId,
      message: '360° 视频已通过质检并完成 180 帧等角重采样',
    });
  }
}
