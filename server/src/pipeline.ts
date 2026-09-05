// ====================================================================
// SmartWardrobe AI 异步任务管线与 WebSocket 推送调度器
// 深度集成 AIService，实现真实 AI 生成与进度广播
// ====================================================================

import { WebSocket } from 'ws';
import { db, DBAsyncTask, ExtendedGarmentItem } from './db';
import { TaskType, TaskStatus, generateFissionAssets } from '@smart-wardrobe/shared';
import { AIService } from './aiService';
import { GENERATED_ASSETS } from './generatedAssets';
import { ImageProcessor } from './imageProcessor';

export interface TaskProgressMessage {
  event: 'TASK_PROGRESS_UPDATED';
  data: {
    taskId: string;
    userId?: string;
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
  private userSockets: Map<string, Set<WebSocket>> = new Map();

  public registerConnection(ws: WebSocket, userId?: string) {
    this.activeConnections.add(ws);
    if (userId) {
      this.bindUserSocket(ws, userId);
    }

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'AUTH' && msg.userId) {
          this.bindUserSocket(ws, msg.userId);
        }
      } catch {}
    });

    ws.on('close', () => {
      this.activeConnections.delete(ws);
      for (const [uid, sockets] of this.userSockets.entries()) {
        sockets.delete(ws);
        if (sockets.size === 0) {
          this.userSockets.delete(uid);
        }
      }
    });
  }

  public bindUserSocket(ws: WebSocket, userId: string) {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(ws);
  }

  public broadcastProgress(msg: TaskProgressMessage) {
    const payload = JSON.stringify(msg);
    const targetUserId = msg.data.userId;

    if (targetUserId && this.userSockets.has(targetUserId)) {
      // 严格仅向任务归属用户的已连接 WebSocket 推送，彻底物理隔离
      const sockets = this.userSockets.get(targetUserId)!;
      for (const ws of sockets) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(payload);
        }
      }
    } else if (!targetUserId) {
      for (const ws of this.activeConnections) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(payload);
        }
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

    db.saveAsyncTask(task);

    // 启动异步真实/模拟双轨计算管线
    this.runPipelineStages(taskId, taskType, userId, inputPayload);

    return {
      taskId,
      estimatedSeconds: taskType === 'VTON_RENDER' ? 6 : taskType === 'GARMENT_DETECTION' ? 8 : 3,
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
    task.updatedAt = new Date().toISOString();
    db.saveAsyncTask(task);

    try {
      if (taskType === 'VTON_RENDER') {
        // 1. 解析穿戴与身材 Prompt
        task.progressPercent = 20;
        task.currentStage = '正在解析人物五官、发型与身材骨骼...';
        task.updatedAt = new Date().toISOString();
        db.saveAsyncTask(task);
        this.broadcastProgress({
          event: 'TASK_PROGRESS_UPDATED',
          data: {
            taskId: task.id,
            userId: task.userId,
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
        task.updatedAt = new Date().toISOString();
        db.saveAsyncTask(task);
        this.broadcastProgress({
          event: 'TASK_PROGRESS_UPDATED',
          data: {
            taskId: task.id,
            userId: task.userId,
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
        task.updatedAt = new Date().toISOString();
        db.saveAsyncTask(task);
        this.broadcastProgress({
          event: 'TASK_PROGRESS_UPDATED',
          data: {
            taskId: task.id,
            userId: task.userId,
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
            weightKg: profile.weightKg || (profile.gender === 'MALE' ? 70 : 50),
            bustCm: profile.bustCm || (profile.gender === 'MALE' ? 95 : 84),
            waistCm: profile.waistCm || (profile.gender === 'MALE' ? 76 : 62),
            hipsCm: profile.hipsCm || (profile.gender === 'MALE' ? 92 : 89),
            bodyType: (profile as any).bodyType,
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
        db.saveAsyncTask(task);

        this.broadcastProgress({
          event: 'TASK_PROGRESS_UPDATED',
          data: {
            taskId: task.id,
            userId: task.userId,
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
        task.updatedAt = new Date().toISOString();
        db.saveAsyncTask(task);
        this.broadcastProgress({
          event: 'TASK_PROGRESS_UPDATED',
          data: {
            taskId: task.id,
            userId: task.userId,
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
        task.updatedAt = new Date().toISOString();
        db.saveAsyncTask(task);
        this.broadcastProgress({
          event: 'TASK_PROGRESS_UPDATED',
          data: {
            taskId: task.id,
            userId: task.userId,
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
        db.saveAsyncTask(task);

        this.broadcastProgress({
          event: 'TASK_PROGRESS_UPDATED',
          data: {
            taskId: task.id,
            userId: task.userId,
            taskType: task.taskType,
            status: task.status,
            progress: 100,
            currentStage: task.currentStage,
            resultUrl: normalizedAvatarUrl,
            error: null,
          },
        });
      } else if (taskType === 'GARMENT_DETECTION') {
        // GARMENT_DETECTION: 多模态多单品检测、幽灵模特白底图生成、透明化、入库
        task.progressPercent = 15;
        task.currentStage = 'Vision 视觉多模态正在深度扫描与定位图中的穿搭单品...';
        task.updatedAt = new Date().toISOString();
        db.saveAsyncTask(task);
        this.broadcastProgress({
          event: 'TASK_PROGRESS_UPDATED',
          data: {
            taskId: task.id,
            userId: task.userId,
            taskType: task.taskType,
            status: task.status,
            progress: 15,
            currentStage: task.currentStage,
            resultUrl: null,
            error: null,
          },
        });

        const imageBase64 = inputPayload.imageBase64 || '时尚休闲单品';
        const profileId = inputPayload.profileId;
        const detectedItems = await AIService.analyzeGarmentsFromImageVision(imageBase64);

        task.progressPercent = 40;
        task.currentStage = `成功识别出 ${detectedItems.length} 件穿搭单品，正在调用 AI 生成平铺白底切片...`;
        task.updatedAt = new Date().toISOString();
        db.saveAsyncTask(task);
        this.broadcastProgress({
          event: 'TASK_PROGRESS_UPDATED',
          data: {
            taskId: task.id,
            userId: task.userId,
            taskType: task.taskType,
            status: task.status,
            progress: 40,
            currentStage: task.currentStage,
            resultUrl: null,
            error: null,
          },
        });

        const createdGarments: ExtendedGarmentItem[] = [];
        for (let index = 0; index < detectedItems.length; index++) {
          const item = detectedItems[index];
          const garmentId = `garment-${Date.now()}-${index}`;

          let flatLayUrl = '';
          let flatLayClosedUrl = '';

          if (item.primaryCategory === 'OUTERWEAR') {
            console.log(`[Pipeline] 检测到外套单品 "${item.title}"，并行生成【OPEN 敞开】与【CLOSED 合拢】独立双态平铺素图...`);
            try {
              const [openResult, closedResult] = await Promise.all([
                AIService.generateGhostMannequinAsset(
                  item.title,
                  item.primaryCategory,
                  item.subCategory,
                  item.colors,
                  item.material,
                  imageBase64,
                  undefined,
                  'OPEN'
                ),
                AIService.generateGhostMannequinAsset(
                  item.title,
                  item.primaryCategory,
                  item.subCategory,
                  item.colors,
                  item.material,
                  imageBase64,
                  undefined,
                  'CLOSED'
                ),
              ]);
              flatLayUrl = openResult;
              flatLayClosedUrl = closedResult;
            } catch (err: any) {
              console.warn(`[Pipeline] 外套双态平铺素图生成异常:`, err.message);
            }
          } else {
            try {
              console.log(`[Pipeline] 正在为识别出的单品 "${item.title}" (${item.primaryCategory}) 生成 AI 幽灵模特平铺素图...`);
              flatLayUrl = await AIService.generateGhostMannequinAsset(
                item.title,
                item.primaryCategory,
                item.subCategory,
                item.colors,
                item.material,
                imageBase64
              );
            } catch (err: any) {
              console.warn(`[Pipeline] 单品 ${item.title} 平铺素图生成异常:`, err.message);
            }
          }

          let baseImage = flatLayUrl || item.previewUrl || imageBase64 || GENERATED_ASSETS.dressCutoutUrl;
          if (baseImage && (baseImage.startsWith('data:image') || baseImage.length > 100)) {
            try {
              baseImage = await ImageProcessor.removeBackground(baseImage);
            } catch (err: any) {
              console.warn(`[Pipeline] 单品 ${item.title} 主素图透明化异常:`, err.message);
            }
          }

          let secondaryImage = flatLayClosedUrl;
          if (secondaryImage && (secondaryImage.startsWith('data:image') || secondaryImage.length > 100)) {
            try {
              secondaryImage = await ImageProcessor.removeBackground(secondaryImage);
            } catch (err: any) {
              console.warn(`[Pipeline] 单品 ${item.title} 次级素图透明化异常:`, err.message);
            }
          }

          const assets = generateFissionAssets(garmentId, item.primaryCategory, baseImage, secondaryImage);
          for (const a of assets) {
            if (a.pngUrl && (a.pngUrl.startsWith('data:image') || a.pngUrl.length > 100)) {
              try {
                a.pngUrl = await ImageProcessor.removeBackground(a.pngUrl);
              } catch (e: any) {
                console.warn(`[Pipeline] 单品 ${item.title} 切片 ${a.stateType} 透明化异常:`, e.message);
              }
            }
          }

          const newGarment: ExtendedGarmentItem = {
            id: garmentId,
            profileId,
            isPublic: false,
            title: item.title,
            primaryCategory: item.primaryCategory,
            subCategory: item.subCategory,
            colors: item.colors,
            patterns: item.patterns,
            material: item.material,
            box_2d: item.box_2d,
            assets,
          };

          db.saveGarment(newGarment);
          createdGarments.push(newGarment);

          const stepProgress = Math.min(95, 40 + Math.round(((index + 1) / detectedItems.length) * 55));
          task.progressPercent = stepProgress;
          task.currentStage = `已完成 (${index + 1}/${detectedItems.length}) 件切片: ${item.title}`;
          task.updatedAt = new Date().toISOString();
          db.saveAsyncTask(task);
          this.broadcastProgress({
            event: 'TASK_PROGRESS_UPDATED',
            data: {
              taskId: task.id,
              userId: task.userId,
              taskType: task.taskType,
              status: task.status,
              progress: stepProgress,
              currentStage: task.currentStage,
              resultUrl: null,
              error: null,
            },
          });
        }

        task.progressPercent = 100;
        task.status = 'SUCCESS';
        task.currentStage = `成功识别出 ${createdGarments.length} 件单品并入库！`;
        task.outputResult = { garments: createdGarments, count: createdGarments.length };
        task.updatedAt = new Date().toISOString();
        db.saveAsyncTask(task);

        const finalResultUrl = createdGarments[0]?.assets?.[0]?.pngUrl || null;
        this.broadcastProgress({
          event: 'TASK_PROGRESS_UPDATED',
          data: {
            taskId: task.id,
            userId: task.userId,
            taskType: task.taskType,
            status: task.status,
            progress: 100,
            currentStage: task.currentStage,
            resultUrl: finalResultUrl,
            error: null,
          },
        });
      } else {
        // GARMENT_NORMALIZE
        task.progressPercent = 30;
        task.currentStage = 'Vision 视觉多模态分析服装属性与材质...';
        task.updatedAt = new Date().toISOString();
        db.saveAsyncTask(task);
        this.broadcastProgress({
          event: 'TASK_PROGRESS_UPDATED',
          data: {
            taskId: task.id,
            userId: task.userId,
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
        task.updatedAt = new Date().toISOString();
        db.saveAsyncTask(task);
        this.broadcastProgress({
          event: 'TASK_PROGRESS_UPDATED',
          data: {
            taskId: task.id,
            userId: task.userId,
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
        db.saveAsyncTask(task);

        this.broadcastProgress({
          event: 'TASK_PROGRESS_UPDATED',
          data: {
            taskId: task.id,
            userId: task.userId,
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
      task.errorMessage = err.message || '生成失败';
      (task as any).error = err.message || '生成失败';
      task.updatedAt = new Date().toISOString();
      db.saveAsyncTask(task);

      if (task.costCredits > 0) {
        db.refundCredits(userId, task.costCredits, `AI 生成失败自动退款 (${err.message || '网络异常'})`, task.id);
      }

      this.broadcastProgress({
        event: 'TASK_PROGRESS_UPDATED',
        data: {
          taskId: task.id,
          userId: task.userId,
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
