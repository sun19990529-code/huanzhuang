// ====================================================================
// SmartWardrobe 账号独立异步任务中心 (Task Center Drawer)
// 实时展示进行中渲染任务、进度条、阶段文案及最近 5 条历史大片存档
// ====================================================================

import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  Download,
  Eye,
  RefreshCw,
  Layers,
  Shirt,
  User,
} from 'lucide-react';
import { UserTaskItem } from '../api';

interface TaskCenterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  runningTasks: UserTaskItem[];
  historyTasks: UserTaskItem[];
  isLoading: boolean;
  onRefresh: () => void;
}

export const TaskCenterDrawer: React.FC<TaskCenterDrawerProps> = ({
  isOpen,
  onClose,
  runningTasks,
  historyTasks,
  isLoading,
  onRefresh,
}) => {
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);

  if (!isOpen) return null;

  const getTaskTypeLabel = (type: string) => {
    switch (type) {
      case 'VTON_RENDER':
        return { label: 'AI 3D 试穿大片', icon: <Sparkles className="w-3.5 h-3.5 text-rose-500" /> };
      case 'AVATAR_NORMALIZE':
        return { label: 'A-Pose 素体建模', icon: <User className="w-3.5 h-3.5 text-amber-500" /> };
      case 'GARMENT_NORMALIZE':
        return { label: '单品切片提取', icon: <Shirt className="w-3.5 h-3.5 text-blue-500" /> };
      default:
        return { label: 'AI 智能生成', icon: <Layers className="w-3.5 h-3.5 text-stone-500" /> };
    }
  };

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch {
      return dateStr;
    }
  };

  const handleDownloadImage = (url: string, filename = 'smartwardrobe-vton.png') => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      {/* 遮罩背景 */}
      <div
        className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs z-50 transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* 侧滑抽屉面板 */}
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#FAF8F5] border-l border-[#EAE6DF] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* 顶部 Header */}
        <div className="p-4 md:p-5 border-b border-[#EAE6DF] bg-white/70 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-50 to-amber-50 border border-rose-200/80 flex items-center justify-center shadow-xs">
              <Clock className="w-4 h-4 text-[#D63031]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-stone-900 tracking-tight">任务中心</h2>
                {runningTasks.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[#D63031] text-white text-[10px] font-bold animate-pulse">
                    {runningTasks.length} 项生成中
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-500 font-medium">账号独立 · 实时进度监控与历史存档</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              title="手动刷新任务"
              className="p-2 rounded-xl text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#D63031]' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 滚动内容区域 */}
        <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-6">
          {/* Section 1: 进行中的任务 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <h3 className="text-xs font-black text-stone-800 tracking-wider uppercase">进行中的任务 ({runningTasks.length})</h3>
              </div>
              <span className="text-[11px] text-stone-600">刷新页面不丢失</span>
            </div>

            {runningTasks.length === 0 ? (
              <div className="p-5 rounded-2xl bg-white/60 border border-dashed border-stone-200 text-center">
                <p className="text-xs font-medium text-stone-600">当前没有正在后台渲染的任务</p>
                <p className="text-[10px] text-stone-600 mt-1">在试衣间点击「AI 试穿大片」即可启动后台生成</p>
              </div>
            ) : (
              <div className="space-y-3">
                {runningTasks.map((task) => {
                  const typeInfo = getTaskTypeLabel(task.taskType);
                  return (
                    <div
                      key={task.taskId}
                      className="p-4 rounded-2xl bg-white border border-rose-200/90 shadow-xs relative overflow-hidden"
                    >
                      {/* 背景微光 */}
                      <div className="absolute inset-0 bg-gradient-to-r from-rose-50/40 via-amber-50/30 to-transparent pointer-events-none" />

                      <div className="relative z-10 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-rose-50 border border-rose-200/60 text-xs font-bold text-rose-900">
                            {typeInfo.icon}
                            <span>{typeInfo.label}</span>
                          </div>
                          <span className="text-xs font-black font-mono text-[#D63031]">
                            {task.progressPercent}%
                          </span>
                        </div>

                        {/* 进度条 */}
                        <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden relative">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 via-rose-500 to-[#D63031] transition-all duration-500 rounded-full relative"
                            style={{ width: `${Math.max(5, task.progressPercent)}%` }}
                          >
                            <div className="absolute inset-0 bg-white/30 animate-pulse" />
                          </div>
                        </div>

                        {/* 实时阶段文案 */}
                        <div className="flex items-start gap-1.5 text-[11px] text-stone-600 font-medium">
                          <Sparkles className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5 animate-spin" />
                          <p className="line-clamp-2 leading-relaxed">{task.currentStage || '正在计算中...'}</p>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-stone-600 pt-1 border-t border-stone-100">
                          <span>任务 ID: {task.taskId.slice(-8)}</span>
                          <span>提交于 {formatDateTime(task.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: 历史任务存档 (最近 5 条) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-black text-stone-800 tracking-wider uppercase">历史生成记录 (最近 5 条)</h3>
              <span className="text-[10px] text-stone-600 font-mono">已持久化归档</span>
            </div>

            {historyTasks.length === 0 ? (
              <div className="p-6 rounded-2xl bg-white/60 border border-stone-200 text-center">
                <Layers className="w-6 h-6 text-stone-300 mx-auto mb-1.5" />
                <p className="text-xs text-stone-600 font-medium">暂无历史生成大片</p>
              </div>
            ) : (
              <div className="space-y-3">
                {historyTasks.map((task) => {
                  const isSuccess = task.status === 'SUCCESS';
                  const typeInfo = getTaskTypeLabel(task.taskType);
                  const resultImg = task.resultUrl || task.outputResult?.renderedImageUrl || task.outputResult?.normalizedImageUrl;

                  return (
                    <div
                      key={task.taskId}
                      className={`p-3.5 rounded-2xl bg-white border transition-all ${
                        isSuccess
                          ? 'border-stone-200/90 hover:border-stone-300 hover:shadow-sm'
                          : 'border-rose-200/80 bg-rose-50/20'
                      }`}
                    >
                      <div className="flex gap-3">
                        {/* 结果缩略图 */}
                        {isSuccess && resultImg ? (
                          <div
                            onClick={() => setSelectedPreviewImage(resultImg)}
                            className="w-16 h-20 rounded-xl bg-stone-100 border border-stone-200/80 overflow-hidden shrink-0 cursor-pointer relative group"
                          >
                            <img
                              src={resultImg}
                              alt="成片缩略图"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Eye className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-16 h-20 rounded-xl bg-rose-50 border border-rose-200/80 flex flex-col items-center justify-center text-rose-500 shrink-0">
                            <AlertCircle className="w-5 h-5 mb-1" />
                            <span className="text-[9px] font-bold">失败</span>
                          </div>
                        )}

                        {/* 任务详情信息 */}
                        <div className="flex-1 flex flex-col justify-between min-w-0">
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <div className="flex items-center gap-1">
                                {typeInfo.icon}
                                <span className="text-xs font-bold text-stone-900 truncate">
                                  {typeInfo.label}
                                </span>
                              </div>
                              {isSuccess ? (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200/60">
                                  <CheckCircle2 className="w-3 h-3" />
                                  已完成
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-200/60">
                                  生成失败
                                </span>
                              )}
                            </div>

                            {isSuccess ? (
                              <p className="text-[11px] text-stone-600 line-clamp-1">
                                {task.currentStage || '8K 影棚大片渲染就绪'}
                              </p>
                            ) : (
                              <p className="text-[11px] text-rose-600 line-clamp-1">
                                {task.errorMessage || 'AI 生成异常，已自动原路返还积分'}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-1.5 border-t border-stone-100 mt-1">
                            <span className="text-[10px] text-stone-600 font-mono">
                              {formatDateTime(task.createdAt)}
                            </span>

                            {isSuccess && resultImg && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setSelectedPreviewImage(resultImg)}
                                  className="px-2 py-1 rounded-lg text-[10px] font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors flex items-center gap-1"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>预览</span>
                                </button>
                                <button
                                  onClick={() => handleDownloadImage(resultImg, `smartwardrobe-${task.taskId}.png`)}
                                  className="px-2 py-1 rounded-lg text-[10px] font-bold text-[#D63031] bg-rose-50 hover:bg-rose-100 transition-colors flex items-center gap-1"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>下载</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 底部信息提示 */}
        <div className="p-3.5 border-t border-[#EAE6DF] bg-stone-50/80 text-center text-[11px] text-stone-600">
          每个账号独立隔离 · 历史记录保留最近 5 条高定成片
        </div>
      </aside>

      {/* 8K 高清大图预览弹窗 */}
      {selectedPreviewImage && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-in fade-in"
          onClick={() => setSelectedPreviewImage(null)}
        >
          <div
            className="relative max-w-2xl w-full max-h-[90vh] bg-stone-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 顶栏控制 */}
            <div className="w-full px-5 py-3.5 bg-stone-950/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-bold tracking-wider uppercase">8K 影棚高定试穿大片预览</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadImage(selectedPreviewImage)}
                  className="px-3 py-1 rounded-xl bg-[#D63031] hover:bg-[#b02526] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>下载原图</span>
                </button>
                <button
                  onClick={() => setSelectedPreviewImage(null)}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 成片展示 */}
            <div className="p-4 flex-1 flex items-center justify-center max-h-[75vh] overflow-auto">
              <img
                src={selectedPreviewImage}
                alt="8K 高清大片"
                className="max-h-full w-auto rounded-2xl shadow-xl object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
