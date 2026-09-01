// ====================================================================
// SmartWardrobe AI 异步任务管线与 WebSocket 推送调度器
// 深度集成 AIService，实现真实 AI 生成与进度广播
// ====================================================================

import { WebSocket } from 'ws';
import { db, DBAsyncTask } from './db';
import { TaskType, TaskStatus } from '@smart-wardrobe/shared';
import { AIService } from './aiService';
import { GENERATED_ASSETS } from './generatedAssets';

export interface TaskProgressMessage {
  event: 'TASK_PROGRESS_UPDATED';
  data: {
    taskId: string;
    taskType: TaskType;
    status: TaskStatus;
    progress: number;
    currentStage: string;
    resultUrl: string | null;
    error: string | null;
  };
}

class TaskPipelineService {
  private activeConnections: Set<WebSocket> = new Set();

  public registerConnection(ws: WebSocket) {
    this.activeConnections.add(ws);
    ws.on('close', () => {
      this.activeConnections.delete(ws);
    });
  }

  public broadcastProgress(msg: TaskProgressMessage) {
    const payload = JSON.stringify(msg);
    for (const ws of this.activeConnections) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }

  /**
   * 提交并异步运行 AI 任务
   */
  public submitTask(
    userId: string,
    taskType: TaskType,
    costCredits: number,
    inputPayload: any
  ): { taskId: string; estimatedSeconds: number } {
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date().toISOString();

    const task: DBAsyncTask = {
      id: taskId,
      userId,
      taskType,
      status: 'PENDING',
      progressPercent: 0,
      currentStage: '排队中 (Queued)...',
      inputPayload,
      costCredits,
      createdAt: now,
      updatedAt: now,
    };

    db.asyncTasks.set(taskId, task);

    // 启动异步真实/模拟双轨计算管线
    this.runPipelineStages(taskId, taskType, userId, inputPayload);

    return {
      taskId,
      estimatedSeconds: taskType === 'VTON_RENDER' ? 6 : 3,
    };
  }

  private async runPipelineStages(
    taskId: string,
    taskType: TaskType,
    userId: string,
    inputPayload: any
  ) {
    const task = db.asyncTasks.get(taskId);
    if (!task) return;

    task.status = 'PROCESSING';

    try {
      if (taskType === 'VTON_RENDER') {
        // 1. 解析穿戴与身材 Prompt
        task.progressPercent = 20;
        task.currentStage = '正在解析人物五官、发型与身材骨骼...';
        this.broadcastProgress({
          event: 'TASK_PROGRESS_UPDATED',
          data: {
            taskId: task.id,
            taskType: task.taskType,
            status: task.status,
            progress: task.progressPercent,
            currentStage: task.currentStage,
            resultUrl: null,
            error: null,
          },
        });

        await new Promise((r) => setTimeout(r, 600));

        // 2. 组装穿戴单品与多层渲染参数
        task.progressPercent = 45;
        task.currentStage = '正在调度 GPU 算力融合光影与织物垂坠仿真...';
        this.broadcastProgress({
          event: 'TASK_PROGRESS_UPDATED',
          data: {
            taskId: task.id,
            taskType: task.taskType,
            status: task.status,
            progress: task.progressPercent,
            currentStage: task.currentStage,
            resultUrl: null,
            error: null,
          },
        });

        const profile = db.profiles.get(inputPayload.profileId) || {
          name: '时尚博主',
          gender: 'FEMALE' as const,
          heightCm: 168,
          weightKg: 50,
          bustCm: 84,
          waistCm: 62,
          hipsCm: 89,
        };

        const avatar = db.avatars.get(inputPayload.profileId);
        const referenceImages: string[] = [];

        // Image 1: 模特素体原图 (Target Model)
        if (avatar?.normalizedImageUrl) {
          referenceImages.push(avatar.normalizedImageUrl);
        } else if (avatar?.originalImageUrl) {
          referenceImages.push(avatar.originalImageUrl);
        } else {
          referenceImages.push(GENERATED_ASSETS.avatarUrl);
        }

        // Image 2: 2D 画布搭配空间拓扑快照 (Spatial 2D Assembly Layout)
        if (inputPayload.canvasSnapshotBase64 && typeof inputPayload.canvasSnapshotBase64 === 'string') {
          referenceImages.push(inputPayload.canvasSnapshotBase64);
        }

        const garmentDetailsList: Array<{
          title: string;
          category: string;
          subCategory?: string;
          colors?: string[];
          material?: string;
          appliedState?: string;
        }> = [];

        const itemsDesc =
          inputPayload.items
            ?.map((i: any) => {
              const g = db.garments.get(i.garmentId);
              if (g) {
                const appliedState = i.appliedState || 'DEFAULT';
                garmentDetailsList.push({
                  title: g.title,
                  category: g.primaryCategory,
                  subCategory: g.subCategory,
                  colors: g.colors,
                  material: (g as any).material || '高定丝绸面料',
                  appliedState,
                });

                const stateAsset = g.assets?.find((a) => a.stateType === appliedState) || g.assets?.[0];
                const gImg =
                  stateAsset?.pngUrl ||
                  (g as any).previewUrl ||
                  (g as any).cutoutUrl ||
                  (g as any).defaultImageUrl;
                if (gImg) {
                  referenceImages.push(gImg);
                }

                let stateNote = '';
                if (appliedState === 'OPEN') stateNote = ' [敞开穿戴/露出内搭]';
                if (appliedState === 'CLOSED') stateNote = ' [扣合穿戴]';
                if (appliedState === 'TUCKED') stateNote = ' [衣角塞入下装]';
                if (appliedState === 'UNTUCKED') stateNote = ' [衣角自然外放]';

                return `${g.title} (${g.primaryCategory} ${g.subCategory || ''}, 颜色: ${g.colors?.join('/') || ''}${stateNote})`;
              }
              return `单品: ${i.garmentId}`;
            })
            .join(' 搭配穿戴: ') || '精选时尚高定穿搭';

        task.progressPercent = 75;
        task.currentStage = '正在使用 gemini-3.1-flash-image 融合原图生成 8K 影棚级大片...';
        this.broadcastProgress({
          event: 'TASK_PROGRESS_UPDATED',
          data: {
            taskId: task.id,
            taskType: task.taskType,
            status: task.status,
            progress: task.progressPercent,
            currentStage: task.currentStage,
            resultUrl: null,
            error: null,
          },
        });

        const renderedUrl = await AIService.renderVtonWithAI(
          profile.name,
          profile.gender,
          itemsDesc,
          {
            heightCm: profile.heightCm || 168,
            bustCm: profile.bustCm || 84,
            waistCm: profile.waistCm || 62,
            hipsCm: profile.hipsCm || 89,
          },
          (avatar as any)?.featureSummary,
          referenceImages,
          garmentDetailsList
        );

        task.progressPercent = 100;
        task.status = 'SUCCESS';
        task.currentStage = 'AI 高清试穿大片渲染完成！';
        task.outputResult = { renderedImageUrl: renderedUrl };
        task.updatedAt = new Date().toISOString();

        this.broadcastProgress({
          event: 'TASK_PROGRESS_UPDATED',
          data: {
            taskId: task.id,
            taskType: task.taskType,
            status: task.status,
            progress: 100,
            currentStage: task.currentStage,
            resultUrl: renderedUrl,
            error: null,
          },
        });
      } else if (taskType === 'AVATAR_NORMALIZE') {
        task.progressPercent = 25;
        task.currentStage = '正在分析面部五官、发型与冷白肤色特征...';
        this.broadcastProgress({
          event: 'TASK_PROGRESS_UPDATED',
          data: {
            taskId: task.id,
            taskType: task.taskType,
            status: task.status,
            progress: 25,
            currentStage: task.currentStage,
            resultUrl: null,
            error: null,
          },
        });

        await new Promise((r) => setTimeout(r, 600));

        task.progressPercent = 60;
        task.currentStage = '正在使用 gemini-3.1-flash-image 构建正面 A-Pose 标准骨骼姿态...';
        this.broadcastProgress({
          event: 'TASK_PROGRESS_UPDATED',
          data: {
            taskId: task.id,
            taskType: task.taskType,
            status: task.status,
            progress: 60,
            currentStage: task.currentStage,
            resultUrl: null,
            error: null,
          },
        });

        const profile = db.profiles.get(inputPayload.profileId) || {
          gender: 'FEMALE' as const,
          heightCm: 168,
          weightKg: 50,
        };

        const normalizedAvatarUrl = await AIService.generateStandardMannequinFromPhoto(
          inputPayload.photoBase64 || '',
          profile.gender === 'MALE' ? 'MALE' : 'FEMALE',
          profile.heightCm,
          profile.weightKg
        );

        task.progressPercent = 100;
        task.status = 'SUCCESS';
        task.currentStage = 'A-Pose 标准影棚素体已生成并装载！';
        task.outputResult = { normalizedImageUrl: normalizedAvatarUrl };
        task.updatedAt = new Date().toISOString();

        this.broadcastProgress({
          event: 'TASK_PROGRESS_UPDATED',
          data: {
            taskId: task.id,
            taskType: task.taskType,
            status: task.status,
            progress: 100,
            currentStage: task.currentStage,
            resultUrl: normalizedAvatarUrl,
            error: null,
          },
        });
      } else {
        // GARMENT_NORMALIZE
        task.progressPercent = 30;
        task.currentStage = 'Vision 视觉多模态分析服装属性与材质...';
        this.broadcastProgress({
          event: 'TASK_PROGRESS_UPDATED',
          data: {
            taskId: task.id,
            taskType: task.taskType,
            status: task.status,
            progress: 30,
            currentStage: task.currentStage,
            resultUrl: null,
            error: null,
          },
        });

        await new Promise((r) => setTimeout(r, 600));

        task.progressPercent = 70;
        task.currentStage = '正在生成 Ghost Mannequin 纯白底切片并转透明底...';
        this.broadcastProgress({
          event: 'TASK_PROGRESS_UPDATED',
          data: {
            taskId: task.id,
            taskType: task.taskType,
            status: task.status,
            progress: 70,
            currentStage: task.currentStage,
            resultUrl: null,
            error: null,
          },
        });

        const cutoutUrl = await AIService.generateGhostMannequinAsset(
          inputPayload.title || '时尚单品',
          inputPayload.primaryCategory || 'TOPS',
          inputPayload.subCategory || '单品',
          inputPayload.colors || ['#f43f5e']
        );

        task.progressPercent = 100;
        task.status = 'SUCCESS';
        task.currentStage = '服装切片已透明化并入库！';
        task.outputResult = { renderedImageUrl: cutoutUrl };
        task.updatedAt = new Date().toISOString();

        this.broadcastProgress({
          event: 'TASK_PROGRESS_UPDATED',
          data: {
            taskId: task.id,
            taskType: task.taskType,
            status: task.status,
            progress: 100,
            currentStage: task.currentStage,
            resultUrl: cutoutUrl,
            error: null,
          },
        });
      }
    } catch (err: any) {
      console.error(`[Pipeline Error] Task ${taskId} failed:`, err);
      task.status = 'FAILED';
      task.currentStage = `任务生成失败: ${err.message || '未知错误'}`;
      (task as any).error = err.message || '生成失败';
      task.updatedAt = new Date().toISOString();

      if (task.costCredits > 0) {
        db.refundCredits(userId, task.costCredits, `AI 生成失败自动退款 (${err.message || '网络异常'})`, task.id);
      }

      this.broadcastProgress({
        event: 'TASK_PROGRESS_UPDATED',
        data: {
          taskId: task.id,
          taskType: task.taskType,
          status: 'FAILED',
          progress: 0,
          currentStage: task.currentStage,
          resultUrl: null,
          error: err.message || '生成失败',
        },
      });
    }
  }
}

export const pipeline = new TaskPipelineService();
