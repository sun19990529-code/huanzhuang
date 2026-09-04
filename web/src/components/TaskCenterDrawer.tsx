// ====================================================================
// SmartWardrobe 账号独立异步任务中心 (Task Center Drawer)
// 实时展示进行中渲染任务、进度条、阶段文案及最近 5 条历史大片存档
// ====================================================================

import React, { useState, useEffect, useRef } from 'react';
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
  ChevronLeft,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import { UserTaskItem, ExtendedGarmentItem, deleteTaskApi, clearHistoryTasksApi } from '../api';
import { showToast } from './Toast';
import { downloadOriginalImage } from '../utils/imageUpscaler';

export interface TaskCenterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  runningTasks: UserTaskItem[];
  historyTasks: UserTaskItem[];
  garments?: ExtendedGarmentItem[];
  isLoading: boolean;
  onRefresh: () => void;
  onApplyToCanvas?: (imageUrl: string, wornItems?: any[], rawItems?: any[]) => void;
  onWearGarments?: (garments: ExtendedGarmentItem[]) => void;
  onDeleteTask?: (taskId: string) => void;
  onClearHistory?: () => void;
}

export const TaskCenterDrawer: React.FC<TaskCenterDrawerProps> = ({
  isOpen,
  onClose,
  runningTasks,
  historyTasks,
  garments = [],
  isLoading,
  onRefresh,
  onApplyToCanvas,
  onWearGarments,
  onDeleteTask,
  onClearHistory,
}) => {
  const [activeTab, setActiveTab] = useState<'ALL' | 'VTON' | 'GARMENT'>('ALL');
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [previewOriginalImage, setPreviewOriginalImage] = useState<{
    url: string;
    createdAt: string;
    taskId: string;
  } | null>(null);
  const [selectedGarmentPreview, setSelectedGarmentPreview] = useState<ExtendedGarmentItem | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState<boolean>(false);

  // 🍎 Apple Photos 级磁吸居中联动 Ref
  const mobileThumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const pcThumbRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // 监听大片切换，自动将选中的胶囊缩略图丝滑平滑滚动居中
  useEffect(() => {
    if (previewIndex !== null) {
      const mobileEl = mobileThumbRefs.current[previewIndex];
      if (mobileEl) {
        mobileEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
      const pcEl = pcThumbRefs.current[previewIndex];
      if (pcEl) {
        pcEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [previewIndex]);

  // 可预览的试穿大片成片历史列表
  const vtonHistoryItems = historyTasks
    .filter((t) => (t.taskType === 'VTON_RENDER' || !t.taskType) && (t.resultUrl || t.outputResult?.renderedImageUrl))
    .map((t) => ({
      url: (t.resultUrl || t.outputResult?.renderedImageUrl) as string,
      taskId: t.taskId,
      createdAt: t.createdAt,
      currentStage: t.currentStage,
      inputPayload: t.inputPayload,
      outputResult: t.outputResult,
      costCredits: t.costCredits,
    }));

  // 键盘快捷键监听：ESC 退出，左右方向键翻页
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedGarmentPreview !== null) {
          setSelectedGarmentPreview(null);
        } else if (previewOriginalImage !== null) {
          setPreviewOriginalImage(null);
        } else if (previewIndex !== null) {
          setPreviewIndex(null);
        }
      } else if (previewIndex !== null) {
        if (e.key === 'ArrowLeft') {
          setPreviewIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : vtonHistoryItems.length - 1));
        } else if (e.key === 'ArrowRight') {
          setPreviewIndex((prev) => (prev !== null && prev < vtonHistoryItems.length - 1 ? prev + 1 : 0));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewIndex, previewOriginalImage, selectedGarmentPreview, vtonHistoryItems.length]);

  if (!isOpen) return null;

  const handleDeleteTask = async (taskId: string) => {
    try {
      setDeletingTaskId(taskId);
      await deleteTaskApi(taskId);
      if (onDeleteTask) {
        onDeleteTask(taskId);
      }
      showToast('已删除任务记录', 'info');
    } catch (err: any) {
      showToast(err.message || '删除任务记录失败', 'error');
    } finally {
      setDeletingTaskId(null);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('确定要清空所有已完成与失败的历史任务记录吗？正在进行中的任务不会受到影响。')) {
      return;
    }
    try {
      setIsClearing(true);
      const res = await clearHistoryTasksApi();
      if (onClearHistory) {
        onClearHistory();
      }
      showToast(`已成功清空 ${res.deletedCount} 条历史记录`, 'info');
    } catch (err: any) {
      showToast(err.message || '清空历史任务失败', 'error');
    } finally {
      setIsClearing(false);
    }
  };

  const getTaskTypeLabel = (type: string) => {
    switch (type) {
      case 'VTON_RENDER':
        return { label: 'AI 3D 试穿大片', icon: <Sparkles className="w-3.5 h-3.5 text-rose-500" /> };
      case 'GARMENT_DETECTION':
        return { label: '智能衣物多单品识别', icon: <Shirt className="w-3.5 h-3.5 text-indigo-500" /> };
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

  // 根据当前选择的 Tab 进行过滤
  const filterByTab = (task: UserTaskItem) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'VTON') return task.taskType === 'VTON_RENDER';
    if (activeTab === 'GARMENT') {
      return task.taskType === 'GARMENT_DETECTION' || task.taskType === 'GARMENT_NORMALIZE';
    }
    return true;
  };

  const filteredRunning = runningTasks.filter(filterByTab);
  const filteredHistory = historyTasks.filter(filterByTab);

  const vtonCount =
    runningTasks.filter((t) => t.taskType === 'VTON_RENDER' || !t.taskType).length +
    historyTasks.filter((t) => t.taskType === 'VTON_RENDER' || !t.taskType).length;
  const garmentCount =
    runningTasks.filter((t) => t.taskType === 'GARMENT_DETECTION' || t.taskType === 'GARMENT_NORMALIZE').length +
    historyTasks.filter((t) => t.taskType === 'GARMENT_DETECTION' || t.taskType === 'GARMENT_NORMALIZE').length;

  const hasAnyModalOpen =
    previewIndex !== null || previewOriginalImage !== null || selectedGarmentPreview !== null;

  return (
    <>
      {/* 遮罩背景 */}
      <div
        className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs z-[100] transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* 侧滑抽屉面板 (当大图或详情弹窗开启时关闭自身滚动与交互，彻底消除粉色滚动条穿透) */}
      <aside
        className={`fixed inset-y-0 right-0 z-[100] w-full max-w-md bg-[#FAF8F5] border-l border-[#EAE6DF] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 ${
          hasAnyModalOpen ? 'overflow-hidden pointer-events-none opacity-40' : ''
        }`}
      >
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
            {/* 一键清空已完成与失败记录 */}
            {historyTasks.length > 0 && (
              <button
                type="button"
                onClick={handleClearHistory}
                disabled={isClearing}
                title="清空所有已完成与失败的历史任务"
                className="px-2.5 py-1.5 rounded-xl text-stone-500 hover:text-rose-600 hover:bg-rose-50 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">清空历史</span>
              </button>
            )}

            <button
              onClick={onRefresh}
              disabled={isLoading}
              title="手动刷新任务"
              className="p-2 rounded-xl text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#D63031]' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 顶部独立分栏 Tab (选项 A：全部 / 试穿大片 / 衣物识别) */}
        <div className="px-4 md:px-5 pt-3 pb-2.5 bg-white/80 border-b border-[#EAE6DF] flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
              activeTab === 'ALL'
                ? 'bg-[#2D3436] text-white shadow-xs'
                : 'bg-[#EFECE6]/70 text-stone-600 hover:text-stone-900 hover:bg-[#EAE6DF]'
            }`}
          >
            全部 ({runningTasks.length + historyTasks.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('VTON')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'VTON'
                ? 'bg-[#D63031] text-white shadow-xs'
                : 'bg-[#EFECE6]/70 text-stone-600 hover:text-stone-900 hover:bg-[#EAE6DF]'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>试穿大片 ({vtonCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('GARMENT')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'GARMENT'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-[#EFECE6]/70 text-stone-600 hover:text-stone-900 hover:bg-[#EAE6DF]'
            }`}
          >
            <Shirt className="w-3 h-3" />
            <span>衣物识别 ({garmentCount})</span>
          </button>
        </div>

        {/* 滚动内容区域 */}
        <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-6">
          {/* Section 1: 进行中的任务 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <h3 className="text-xs font-black text-stone-800 tracking-wider uppercase">
                  进行中的任务 ({filteredRunning.length})
                </h3>
              </div>
              <span className="text-[11px] text-stone-600">刷新页面不丢失</span>
            </div>

            {filteredRunning.length === 0 ? (
              <div className="p-5 rounded-2xl bg-white/60 border border-dashed border-stone-200 text-center">
                <p className="text-xs font-medium text-stone-600">当前分类下没有正在运行的任务</p>
                <p className="text-[10px] text-stone-600 mt-1">
                  {activeTab === 'GARMENT'
                    ? '点击衣橱中的「智能录入」即可启动后台衣物识别'
                    : '在试衣间点击「AI 试穿大片」即可启动大片渲染'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRunning.map((task) => {
                  const isGarment = task.taskType === 'GARMENT_DETECTION' || task.taskType === 'GARMENT_NORMALIZE';
                  const typeInfo = getTaskTypeLabel(task.taskType);

                  return (
                    <div
                      key={task.taskId}
                      className={`p-4 rounded-2xl bg-white border shadow-xs relative overflow-hidden ${
                        isGarment ? 'border-indigo-200/90' : 'border-rose-200/90'
                      }`}
                    >
                      <div
                        className={`absolute inset-0 pointer-events-none ${
                          isGarment
                            ? 'bg-gradient-to-r from-indigo-50/40 via-blue-50/30 to-transparent'
                            : 'bg-gradient-to-r from-rose-50/40 via-amber-50/30 to-transparent'
                        }`}
                      />

                      <div className="relative z-10 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div
                            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-xs font-bold ${
                              isGarment
                                ? 'bg-indigo-50 border-indigo-200/60 text-indigo-900'
                                : 'bg-rose-50 border-rose-200/60 text-rose-900'
                            }`}
                          >
                            {typeInfo.icon}
                            <span>{typeInfo.label}</span>
                          </div>
                          <span
                            className={`text-xs font-black font-mono ${
                              isGarment ? 'text-indigo-600' : 'text-[#D63031]'
                            }`}
                          >
                            {task.progressPercent}%
                          </span>
                        </div>

                        {/* 如果有原始上传图则展示缩略图与进度 */}
                        <div className="flex items-center gap-3">
                          {task.inputPayload?.imageBase64 && (
                            <div className="w-12 h-14 rounded-xl bg-stone-100 border border-stone-200 overflow-hidden shrink-0">
                              <img
                                src={task.inputPayload.imageBase64}
                                alt="原始输入图"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}

                          <div className="flex-1 space-y-2 min-w-0">
                            {/* 进度条 */}
                            <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden relative">
                              <div
                                className={`h-full transition-all duration-500 rounded-full relative ${
                                  isGarment
                                    ? 'bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-500'
                                    : 'bg-gradient-to-r from-amber-500 via-rose-500 to-[#D63031]'
                                }`}
                                style={{ width: `${Math.max(5, task.progressPercent)}%` }}
                              >
                                <div className="absolute inset-0 bg-white/30 animate-pulse" />
                              </div>
                            </div>

                            {/* 实时阶段文案 */}
                            <div className="flex items-start gap-1.5 text-[11px] text-stone-600 font-medium">
                              <Sparkles
                                className={`w-3.5 h-3.5 shrink-0 mt-0.5 animate-spin ${
                                  isGarment ? 'text-indigo-500' : 'text-rose-500'
                                }`}
                              />
                              <p className="line-clamp-2 leading-relaxed">{task.currentStage || '正在计算中...'}</p>
                            </div>
                          </div>
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

          {/* Section 2: 历史任务存档 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-black text-stone-800 tracking-wider uppercase">
                历史任务存档 ({filteredHistory.length})
              </h3>
              <span className="text-[10px] text-stone-600 font-mono">已持久化归档</span>
            </div>

            {filteredHistory.length === 0 ? (
              <div className="p-6 rounded-2xl bg-white/60 border border-stone-200 text-center">
                <Layers className="w-6 h-6 text-stone-300 mx-auto mb-1.5" />
                <p className="text-xs text-stone-600 font-medium">当前分类下暂无已归档的历史记录</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredHistory.map((task) => {
                  const isSuccess = task.status === 'SUCCESS';
                  const isGarmentDetection = task.taskType === 'GARMENT_DETECTION';
                  const typeInfo = getTaskTypeLabel(task.taskType);
                  const resultImg =
                    task.resultUrl || task.outputResult?.renderedImageUrl || task.outputResult?.normalizedImageUrl;
                  const detectedGarments: ExtendedGarmentItem[] = task.outputResult?.garments || [];

                  // 【重点】：智能衣物识别任务 (多衣服单卡片聚合展示)
                  if (isGarmentDetection) {
                    return (
                      <div
                        key={task.taskId}
                        className="p-3.5 rounded-2xl bg-white border border-stone-200/90 hover:border-indigo-200 hover:shadow-xs transition-all space-y-3"
                      >
                        {/* 任务头部信息 */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-200/60 flex items-center justify-center shrink-0">
                              <Shirt className="w-3.5 h-3.5 text-indigo-600" />
                            </div>
                            <span className="text-xs font-bold text-stone-900 truncate">智能衣物识别入库</span>
                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-200/60 shrink-0">
                              共 {detectedGarments.length} 件单品
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isSuccess ? (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200/60">
                                <CheckCircle2 className="w-3 h-3" />
                                已入库
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-200/60">
                                识别失败
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTask(task.taskId);
                              }}
                              disabled={deletingTaskId === task.taskId}
                              className="p-1 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                              title="删除记录"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* 原图与识别出的多件单品切片阵列 (已接入点击事件：支持点击看原图大图与点击看单品切片) */}
                        <div className="flex gap-2.5 items-center">
                          {/* 原始输入照片 */}
                          {task.inputPayload?.imageBase64 && (
                            <div
                              onClick={() =>
                                setPreviewOriginalImage({
                                  url: task.inputPayload.imageBase64,
                                  createdAt: task.createdAt,
                                  taskId: task.taskId,
                                })
                              }
                              className="w-14 h-16 rounded-xl bg-stone-100 border border-stone-200 overflow-hidden shrink-0 relative group cursor-pointer hover:ring-2 hover:ring-indigo-400 transition-all shadow-2xs"
                              title="点击查看识别来源原图大图"
                            >
                              <img
                                src={task.inputPayload.imageBase64}
                                alt="原图"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                              <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Eye className="w-3.5 h-3.5 text-white" />
                              </div>
                              <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] text-white text-center py-0.5 font-bold">
                                原图
                              </span>
                            </div>
                          )}

                          {/* 多件单品切片横向排列流 */}
                          <div className="flex-1 overflow-x-auto scrollbar-none flex items-center gap-2 py-0.5">
                            {detectedGarments.map((g, gIdx) => {
                              const cutoutUrl = g.assets?.[0]?.pngUrl || (g as any).previewUrl;
                              return (
                                <div
                                  key={g.id || gIdx}
                                  onClick={() => setSelectedGarmentPreview(g)}
                                  className="w-14 h-16 rounded-xl bg-stone-50 border border-stone-200/80 p-1 flex flex-col items-center justify-between shrink-0 hover:border-indigo-400 hover:shadow-xs hover:scale-105 transition-all cursor-pointer group"
                                  title={`点击查看切片大图或单独试穿: ${g.title}`}
                                >
                                  <div className="w-full h-9 flex items-center justify-center overflow-hidden">
                                    <img
                                      src={cutoutUrl}
                                      alt={g.title}
                                      className="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform"
                                    />
                                  </div>
                                  <span className="text-[9px] font-bold text-stone-700 truncate w-full text-center leading-tight">
                                    {g.title}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* 底部操作与穿戴按钮 */}
                        <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-[10px]">
                          <span className="text-stone-400 font-mono">{formatDateTime(task.createdAt)}</span>
                          {detectedGarments.length > 0 && onWearGarments && (
                            <button
                              type="button"
                              onClick={() => {
                                onWearGarments(detectedGarments);
                                showToast(`✨ 已将该任务中的 ${detectedGarments.length} 件单品全套上身试穿！`, 'success');
                                onClose();
                              }}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Sparkles className="w-3 h-3 text-indigo-600" />
                              <span>一键穿戴全套 ({detectedGarments.length})</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // 默认：VTON 试穿大片或素体任务卡片
                  return (
                    <div
                      key={task.taskId}
                      className={`p-3.5 rounded-2xl bg-white border transition-all ${
                        isSuccess
                          ? 'border-stone-200/90 hover:border-stone-300 hover:shadow-xs'
                          : 'border-rose-200/80 bg-rose-50/20'
                      }`}
                    >
                      <div className="flex gap-3">
                        {/* 结果缩略图 */}
                        {isSuccess && resultImg ? (
                          <div
                            onClick={() => {
                              const idx = vtonHistoryItems.findIndex((item) => item.taskId === task.taskId);
                              if (idx !== -1) setPreviewIndex(idx);
                            }}
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
                              <div className="flex items-center gap-1 min-w-0">
                                {typeInfo.icon}
                                <span className="text-xs font-bold text-stone-900 truncate">{typeInfo.label}</span>
                              </div>
                              {isSuccess ? (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200/60 shrink-0">
                                  <CheckCircle2 className="w-3 h-3" />
                                  已完成
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-200/60 shrink-0">
                                  生成失败
                                </span>
                              )}
                            </div>

                            {isSuccess ? (
                              <p className="text-[11px] text-stone-600 line-clamp-1">
                                {task.currentStage || '试穿大片渲染就绪'}
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

                            <div className="flex items-center gap-1">
                              {isSuccess && resultImg && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const idx = vtonHistoryItems.findIndex((item) => item.taskId === task.taskId);
                                      if (idx !== -1) setPreviewIndex(idx);
                                    }}
                                    className="px-2 py-1 rounded-lg text-[10px] font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors flex items-center gap-1 cursor-pointer"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>预览</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => downloadOriginalImage(resultImg, task.taskId)}
                                    className="px-2 py-1 rounded-lg text-[10px] font-bold text-[#D63031] bg-rose-50 hover:bg-rose-100 transition-colors flex items-center gap-1 cursor-pointer"
                                    title={"下载试穿成片"}
                                  >
                                    <Download className="w-3 h-3" />
                                    <span>下载成片</span>
                                  </button>
                                  {onApplyToCanvas && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const taskWorn = (task.inputPayload?.items || task.inputPayload?.garments || [])
                                          .map((ti: any) => {
                                            const found = (garments || []).find((g) => g.id === ti.garmentId);
                                            if (found) {
                                              return {
                                                ...found,
                                                appliedState: ti.appliedState || 'DEFAULT',
                                                transformMatrix: ti.transformMatrix,
                                                zIndex: ti.zIndex,
                                              };
                                            }
                                            return null;
                                          })
                                          .filter(Boolean);
                                        onApplyToCanvas(resultImg, taskWorn, task.inputPayload?.items);
                                        onClose();
                                      }}
                                      className="px-2 py-1 rounded-lg text-[10px] font-bold text-white bg-[#D63031] hover:bg-[#b02526] transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                                      title="装载成片及放置单品至试衣间"
                                    >
                                      <Shirt className="w-3 h-3 stroke-[2]" />
                                      <span>装载</span>
                                    </button>
                                  )}
                                </>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTask(task.taskId);
                                }}
                                disabled={deletingTaskId === task.taskId}
                                className="p-1 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer ml-0.5"
                                title="删除记录"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
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
        <div className="p-3 border-t border-[#EAE6DF] bg-stone-50/80 text-center text-[10px] sm:text-[11px] text-stone-600 shrink-0">
          每个账号独立隔离 · 历史记录最多保留 30 条自动轮转淘汰
        </div>
      </aside>

      {/* 🌟 历史大片预览 Lightbox (方案 2: 高定型录两栏画廊 + 纯净磨砂白玻璃 + 真实穿戴搭配方案 + 原生高清成片导出) */}
      {previewIndex !== null && vtonHistoryItems[previewIndex] && (() => {
        const currentVton = vtonHistoryItems[previewIndex];
        // 核心解构：从任务 items 中反查衣橱全局库中的单品数据，彻底消灭占位废话
        const taskItems = currentVton.inputPayload?.items || [];
        type WornGarmentWithState = ExtendedGarmentItem & { appliedState?: string };
        const matchedItemsFromTask: WornGarmentWithState[] = taskItems
          .map((ti: any) => {
            const found = (garments || []).find((g) => g.id === ti.garmentId);
            if (found) {
              return {
                ...found,
                appliedState: ti.appliedState || 'DEFAULT',
              };
            }
            return null;
          })
          .filter(Boolean) as WornGarmentWithState[];

        const wornItems: WornGarmentWithState[] =
          matchedItemsFromTask.length > 0
            ? matchedItemsFromTask
            : currentVton.inputPayload?.wornGarments ||
              currentVton.outputResult?.garments ||
              currentVton.outputResult?.wornItems ||
              [];

        return (
          <div
            className="fixed inset-0 z-[120] bg-white/80 backdrop-blur-2xl flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in"
            onClick={() => setPreviewIndex(null)}
          >
            {/* 📱 移动端单栏布局 (md:hidden: 经用户认可的高定画册排版，微缩相册不拥挤) */}
            <div
              className="md:hidden relative w-full h-full rounded-3xl bg-[#FAF8F5] border border-[#EAE6DF] shadow-2xl shadow-stone-400/30 overflow-hidden flex flex-col items-center justify-between p-2.5 select-none"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 移动端顶层胶囊坞 */}
              <div className="w-full px-3.5 py-2 bg-white/95 backdrop-blur-md border border-[#EAE6DF] rounded-full shadow-xs flex items-center justify-between shrink-0 z-10">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-rose-50 border border-rose-200/80 flex items-center justify-center shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-[#D63031]" />
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-xs font-black text-stone-800 tracking-tight truncate">
                      AI 试穿大片
                    </span>
                    <span className="px-1.5 py-0.5 rounded-full bg-[#FAF8F5] border border-[#EAE6DF] text-[10px] font-mono font-bold text-stone-600 shrink-0">
                      {previewIndex + 1}/{vtonHistoryItems.length}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {onApplyToCanvas && (
                    <button
                      type="button"
                      onClick={() => {
                        onApplyToCanvas(currentVton.url, wornItems, currentVton.inputPayload?.items);
                        setPreviewIndex(null);
                        onClose();
                      }}
                      className="px-2.5 py-1 rounded-full bg-[#D63031] hover:bg-[#b02526] text-white text-xs font-bold flex items-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer"
                      title="装载至试衣间模特舞台"
                    >
                      <Shirt className="w-3.5 h-3.5 stroke-[2]" />
                      <span>装载</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => downloadOriginalImage(currentVton.url, currentVton.taskId)}
                    className="p-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors cursor-pointer"
                    title={"下载高清试穿大片"}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreviewIndex(null)}
                    className="p-1.5 rounded-full text-stone-400 hover:text-stone-800 hover:bg-stone-200/70 transition-colors cursor-pointer"
                    title="关闭"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 移动端居中大图 (高度收紧至 50vh，杜绝挤压底部相册) */}
              <div className="relative w-full flex-1 flex items-center justify-center p-1 overflow-hidden min-h-0 my-1">
                {vtonHistoryItems.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : vtonHistoryItems.length - 1));
                    }}
                    className="absolute left-1 z-10 w-8 h-8 rounded-full bg-white/95 hover:bg-white text-stone-700 border border-[#EAE6DF] shadow-md flex items-center justify-center transition-all active:scale-90 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}

                <div className="h-full max-h-[50vh] flex items-center justify-center bg-white p-1.5 rounded-2xl border border-[#EAE6DF] shadow-xl shadow-stone-300/30">
                  <img
                    src={currentVton.url}
                    alt="高清试穿成片"
                    className="h-full w-auto max-h-[48vh] rounded-xl object-contain select-none transition-all duration-300"
                  />
                </div>

                {vtonHistoryItems.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewIndex((prev) => (prev !== null && prev < vtonHistoryItems.length - 1 ? prev + 1 : 0));
                    }}
                    className="absolute right-1 z-10 w-8 h-8 rounded-full bg-white/95 hover:bg-white text-stone-700 border border-[#EAE6DF] shadow-md flex items-center justify-center transition-all active:scale-90 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* 移动端底部缩略图相册胶囊 (Apple Photos 磁吸居中 + 防遮挡安全外壳 + 柔光聚焦) */}
              {vtonHistoryItems.length > 1 && (
                <div className="w-auto max-w-full px-3 py-1.5 mb-2.5 pb-1 bg-white/95 backdrop-blur-xl border border-[#EAE6DF] rounded-2xl shadow-lg shadow-stone-300/40 flex items-center justify-start gap-2 overflow-x-auto scrollbar-none shrink-0 z-20">
                  {vtonHistoryItems.map((item, idx) => {
                    const isSelected = idx === previewIndex;
                    return (
                      <button
                        key={item.taskId}
                        ref={(el) => (mobileThumbRefs.current[idx] = el)}
                        type="button"
                        onClick={() => setPreviewIndex(idx)}
                        className={`group relative w-8 h-10 rounded-xl overflow-hidden transition-all duration-300 ease-out shrink-0 cursor-pointer ${
                          isSelected
                            ? 'scale-110 -translate-y-0.5 border-2 border-white ring-2 ring-[#D63031] shadow-lg shadow-rose-500/25 opacity-100 z-10'
                            : 'border border-[#EAE6DF] opacity-55 hover:opacity-100 hover:scale-105 active:scale-95'
                        }`}
                        title={`切换到第 ${idx + 1} 张大片`}
                      >
                        <img src={item.url} alt="缩略图" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 🖥️ PC 宽屏两栏型录画廊 (磨砂白玻璃环境 + 左68%大图相册 + 右32%搭配方案) */}
            <div
              className="hidden md:flex relative w-[94vw] max-w-6xl max-h-[92vh] rounded-3xl bg-[#FAF8F5] border border-[#EAE6DF] shadow-2xl shadow-stone-400/30 overflow-hidden items-stretch p-5 lg:p-6 gap-6 select-none"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 左栏 (约 68% 宽幅)：高清成片与翻页箭头、底部相册胶囊坞 */}
              <div className="flex-1 flex flex-col items-center justify-between min-w-0 h-full">
                {/* 左栏微顶标 */}
                <div className="w-full flex items-center justify-between px-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#D63031]" />
                    <span className="text-xs font-bold text-stone-500 tracking-wider uppercase">AI 影棚试穿成片</span>
                    <span className="px-2 py-0.5 rounded-full bg-white border border-[#EAE6DF] text-[11px] font-mono font-bold text-stone-700">
                      {previewIndex + 1} / {vtonHistoryItems.length}
                    </span>
                  </div>
                  <span className="text-[11px] text-stone-400 font-mono">
                    键盘 ← → 翻页 · ESC 退出
                  </span>
                </div>

                {/* 居中大图 (左右箭头紧贴大片两侧) */}
                <div className="relative flex-1 w-full flex items-center justify-center min-h-0 my-2">
                  {vtonHistoryItems.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : vtonHistoryItems.length - 1));
                      }}
                      className="absolute left-2 lg:left-4 z-10 w-10 h-10 rounded-full bg-white/95 hover:bg-white text-stone-700 border border-[#EAE6DF] shadow-md flex items-center justify-center transition-all active:scale-90 cursor-pointer group"
                      title="上一张 (← 键盘左键)"
                    >
                      <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                  )}

                  {/* 3:4 模特大片 (高定白卡立面，垂直拉满至 74vh) */}
                  <div className="h-full max-h-[74vh] flex items-center justify-center bg-white p-2 rounded-3xl border border-[#EAE6DF] shadow-xl shadow-stone-300/30">
                    <img
                      src={currentVton.url}
                      alt="高清试穿成片"
                      className="h-full w-auto max-h-[72vh] rounded-2xl object-contain select-none"
                    />
                  </div>

                  {vtonHistoryItems.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewIndex((prev) => (prev !== null && prev < vtonHistoryItems.length - 1 ? prev + 1 : 0));
                      }}
                      className="absolute right-2 lg:right-4 z-10 w-10 h-10 rounded-full bg-white/95 hover:bg-white text-stone-700 border border-[#EAE6DF] shadow-md flex items-center justify-center transition-all active:scale-90 cursor-pointer group"
                      title="下一张 (→ 键盘右键)"
                    >
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}
                </div>

                {/* 左栏底部：悬浮 3:4 缩略图相册胶囊坞 (Apple Dock 磁吸居中 + 悬浮微上浮 + 流动高定双层聚光环) */}
                {vtonHistoryItems.length > 1 && (
                  <div className="w-auto max-w-full px-4 py-2 mb-1 bg-white/95 backdrop-blur-xl border border-[#EAE6DF] rounded-full shadow-lg shadow-stone-300/30 flex items-center justify-start gap-2.5 overflow-x-auto scrollbar-none shrink-0 z-10">
                    {vtonHistoryItems.map((item, idx) => {
                      const isSelected = idx === previewIndex;
                      return (
                        <button
                          key={item.taskId}
                          ref={(el) => (pcThumbRefs.current[idx] = el)}
                          type="button"
                          onClick={() => setPreviewIndex(idx)}
                          className={`group relative w-11 h-14 rounded-xl overflow-hidden transition-all duration-300 ease-out shrink-0 cursor-pointer ${
                            isSelected
                              ? 'scale-110 -translate-y-1 border-2 border-white ring-2 ring-[#D63031] ring-offset-2 ring-offset-white shadow-xl shadow-rose-500/30 opacity-100 z-10'
                              : 'border border-[#EAE6DF] opacity-55 hover:opacity-100 hover:scale-115 hover:-translate-y-1 hover:shadow-lg active:scale-95'
                          }`}
                          title={`切换到第 ${idx + 1} 张大片`}
                        >
                          <img src={item.url} alt="缩略图" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                          <span
                            className={`absolute bottom-0.5 right-0.5 text-[8px] font-mono font-bold px-1 rounded-sm ${
                              isSelected
                                ? 'bg-[#D63031] text-white'
                                : 'bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity'
                            }`}
                          >
                            {idx + 1}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 右栏 (约 32% 宽幅)：搭配档案卡 (展示真实搭配方案，消灭废话) */}
              <div className="w-80 lg:w-96 shrink-0 h-full flex flex-col bg-white rounded-3xl border border-[#EAE6DF] shadow-xl p-5 lg:p-6 justify-between">
                <div>
                  {/* 右栏顶头 */}
                  <div className="flex items-center justify-between pb-3.5 border-b border-stone-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-stone-900 tracking-tight">搭配方案</h3>
                        <span className="text-[10px] font-bold text-[#D63031] bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded-full font-mono">
                          AI 试穿大片
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-400 font-mono mt-0.5">
                        Look Dossier · 生成于 {formatDateTime(currentVton.createdAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewIndex(null)}
                      className="p-1.5 rounded-full text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer"
                      title="关闭 (ESC)"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 穿戴单品搭配矩阵：真实呈现切片图、名称、分类与穿戴状态 */}
                  <div className="mt-4 space-y-3.5 max-h-[52vh] overflow-y-auto pr-1 scrollbar-thin">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                        <Shirt className="w-3.5 h-3.5 text-[#D63031]" />
                        包含穿戴单品 ({wornItems.length > 0 ? `${wornItems.length} 件` : '全身套装'})
                      </span>
                      <span className="text-[10px] font-mono text-stone-400">已智能吸附成型</span>
                    </div>

                    {wornItems.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2.5">
                        {wornItems.map((g, gIdx) => {
                          const img = g.assets?.[0]?.pngUrl || (g as any).previewUrl || (g as any).cutoutUrl;
                          const stateText =
                            g.appliedState === 'OPEN'
                              ? '敞开'
                              : g.appliedState === 'TUCKED'
                              ? '塞入'
                              : g.appliedState === 'UNTUCKED'
                              ? '外放'
                              : g.appliedState === 'CLOSED'
                              ? '扣合'
                              : '标准';

                          return (
                            <div
                              key={g.id || gIdx}
                              className="p-2.5 rounded-2xl bg-[#FAF8F5] border border-[#EAE6DF] hover:border-[#D63031]/40 flex flex-col items-center text-center group transition-all shadow-2xs"
                              title={`${g.title} (${g.primaryCategory})`}
                            >
                              <div className="w-full h-16 flex items-center justify-center mb-1.5 p-1">
                                {img ? (
                                  <img
                                    src={img}
                                    alt={g.title}
                                    className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
                                  />
                                ) : (
                                  <Shirt className="w-8 h-8 text-stone-300" />
                                )}
                              </div>
                              <span className="text-[11px] font-bold text-stone-800 truncate w-full px-1">
                                {g.title}
                              </span>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white border border-[#EAE6DF] text-stone-500 font-medium">
                                  {g.primaryCategory}
                                </span>
                                {g.appliedState && g.appliedState !== 'DEFAULT' && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-50 border border-rose-200 text-[#D63031] font-bold">
                                    {stateText}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EAE6DF] text-center space-y-1.5 text-stone-500 text-xs">
                        <Shirt className="w-6 h-6 mx-auto text-stone-400" />
                        <p className="font-bold text-stone-700">AI 试穿成套大片</p>
                        <p className="text-[11px] text-stone-400 leading-relaxed">
                          已完整融合画布穿搭效果，支持一键装载至试衣间继续试穿。
                        </p>
                      </div>
                    )}

                    {/* 精炼成片规格属性卡 */}
                    <div className="p-3 rounded-2xl bg-stone-50 border border-stone-100 text-[11px] space-y-1.5">
                      <div className="flex justify-between text-stone-500">
                        <span>输出规格</span>
                        <span className="font-mono font-bold text-[#D63031]">原生高保真 (3:4)</span>
                      </div>
                      <div className="flex justify-between text-stone-500">
                        <span>任务编号</span>
                        <span className="font-mono text-stone-600">{currentVton.taskId}</span>
                      </div>
                      <div className="flex justify-between text-stone-500">
                        <span>成片归档</span>
                        <span className="text-emerald-600 font-bold">渲染完成 · 商业可用</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 右栏底部核心操作 */}
                <div className="pt-4 border-t border-stone-100 space-y-2 shrink-0">
                  {onApplyToCanvas && (
                    <button
                      type="button"
                      onClick={() => {
                        onApplyToCanvas(currentVton.url, wornItems, currentVton.inputPayload?.items);
                        setPreviewIndex(null);
                        onClose();
                      }}
                      className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#D63031] to-[#E17055] hover:opacity-95 text-white font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      title="将此套搭配重新装载至试衣间模特舞台"
                    >
                      <Shirt className="w-4 h-4 stroke-[2]" />
                      <span>装载至试衣间</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => downloadOriginalImage(currentVton.url, currentVton.taskId)}
                    className="w-full py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    title={"下载高清试穿大片"}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>下载试穿大片</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteTask(currentVton.taskId);
                      setPreviewIndex(null);
                    }}
                    className="w-full py-1 text-center text-[11px] text-stone-400 hover:text-rose-600 transition-colors cursor-pointer flex items-center justify-center gap-1"
                    title="删除此条历史记录"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>删除此记录</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 🌟 智能衣物识别：原始输入照片全屏高清大图模态框 */}
      {previewOriginalImage && (
        <div
          className="fixed inset-0 z-[130] bg-black/95 backdrop-blur-md flex items-center justify-center p-0 sm:p-6 animate-in fade-in"
          onClick={() => setPreviewOriginalImage(null)}
        >
          <div
            className="relative w-full h-full sm:w-auto sm:max-w-3xl sm:max-h-[92vh] bg-stone-900/95 sm:rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 顶栏 */}
            <div className="w-full px-4 py-3 bg-stone-950/90 border-b border-white/10 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-2">
                <Shirt className="w-4 h-4 text-indigo-400" />
                <span className="text-xs sm:text-sm font-bold">智能衣物识别 · 原始上传照片</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleDownloadImage(previewOriginalImage.url, `garment-original-${previewOriginalImage.taskId}.png`)
                  }
                  className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1 border border-white/10 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">下载原图</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewOriginalImage(null)}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            {/* 照片大图展示 */}
            <div className="flex-1 w-full flex items-center justify-center p-3 sm:p-6 overflow-hidden min-h-0">
              <img
                src={previewOriginalImage.url}
                alt="识别原图"
                className="max-h-[82vh] max-w-full rounded-xl object-contain shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* 🌟 智能衣物识别：单个切片单品高清详情与独立穿戴模态框 */}
      {selectedGarmentPreview && (
        <div
          className="fixed inset-0 z-[130] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setSelectedGarmentPreview(null)}
        >
          <div
            className="relative w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl border border-stone-200 flex flex-col animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 顶栏 */}
            <div className="px-5 py-3.5 bg-stone-50 border-b border-stone-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <span className="text-xs font-bold text-stone-500 tracking-wider uppercase">
                  {selectedGarmentPreview.primaryCategory || '衣物资产'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGarmentPreview(null)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 切片高清图展示 */}
            <div className="p-6 bg-[#FAF8F5] flex flex-col items-center justify-center min-h-[220px]">
              <div className="w-48 h-48 flex items-center justify-center">
                <img
                  src={selectedGarmentPreview.assets?.[0]?.pngUrl || (selectedGarmentPreview as any).previewUrl}
                  alt={selectedGarmentPreview.title}
                  className="max-h-full max-w-full object-contain drop-shadow-md hover:scale-105 transition-transform"
                />
              </div>
              <h3 className="text-sm font-black text-stone-900 mt-4 text-center">
                {selectedGarmentPreview.title}
              </h3>
              {selectedGarmentPreview.subCategory && (
                <p className="text-[11px] text-stone-500 mt-0.5">
                  细分类别: {selectedGarmentPreview.subCategory}
                </p>
              )}
            </div>

            {/* 底部操作区 */}
            <div className="p-4 bg-white border-t border-stone-100 flex items-center gap-2.5">
              {onWearGarments && (
                <button
                  type="button"
                  onClick={() => {
                    onWearGarments([selectedGarmentPreview]);
                    showToast(`✨ 已成功将「${selectedGarmentPreview.title}」穿戴到模特舞台！`, 'success');
                    setSelectedGarmentPreview(null);
                    onClose();
                  }}
                  className="flex-1 py-2.5 px-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:opacity-95 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  <Shirt className="w-3.5 h-3.5 stroke-[2]" />
                  <span>单独试穿这件</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const cutoutUrl =
                    selectedGarmentPreview.assets?.[0]?.pngUrl || (selectedGarmentPreview as any).previewUrl;
                  if (cutoutUrl) {
                    handleDownloadImage(cutoutUrl, `${selectedGarmentPreview.title}.png`);
                  }
                }}
                className="py-2.5 px-3.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="下载透明去底切片"
              >
                <Download className="w-3.5 h-3.5" />
                <span>下载切片</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
