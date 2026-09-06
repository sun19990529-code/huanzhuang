import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Sparkles,
  RotateCcw,
  Play,
  Pause,
  Download,
  Compass,
  CheckCircle2,
  Info,
  Film,
  Layers,
  Video,
  Sliders,
  Gauge,
} from 'lucide-react';
import { UserProfile, UserAvatar } from '@smart-wardrobe/shared';
import { WornItemData } from '../views/FittingStudioView';
import { generate360LabPreview } from '../api';
import { showToast } from './Toast';

export interface Studio360LabModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  avatar: UserAvatar | null;
  wornItems: WornItemData[];
  initialFrontImageUrl?: string | null;
}

// 4 个标准关键视角定义
const STANDARD_ANGLES = [
  { key: 'FRONT', label: '正面', degree: 0, desc: '正立挺拔·前胸腰线·鞋履正面' },
  { key: 'SIDE_RIGHT', label: '右侧', degree: 90, desc: '侧面剪裁·袖部垂坠·侧廓线条' },
  { key: 'BACK', label: '背面', degree: 180, desc: '后背版型·后腰褶皱·背影轮廓' },
  { key: 'SIDE_LEFT', label: '左侧', degree: 270, desc: '左侧身形·利落开合·全景环视' },
];

// 预定义各档位序列帧生成器
const FRAMES_MAP = {
  36: Array.from({ length: 36 }, (_, i) => `/experiments/frames/frame_${String(i + 1).padStart(2, '0')}.jpg`),
  72: Array.from({ length: 72 }, (_, i) => `/experiments/frames/frame_72_${String(i + 1).padStart(2, '0')}.jpg`),
  144: Array.from({ length: 144 }, (_, i) => `/experiments/frames/frame_144_${String(i + 1).padStart(3, '0')}.jpg`),
};

export const Studio360LabModal: React.FC<Studio360LabModalProps> = ({
  isOpen,
  onClose,
  profile,
  avatar,
  wornItems,
  initialFrontImageUrl,
}) => {
  // 模式：ORBIT (高密轨道无缝转盘) | MULTI_STATIC (静态 4 视角推演)
  const [labMode, setLabMode] = useState<'ORBIT' | 'MULTI_STATIC'>('ORBIT');

  // 帧密度选择：144 帧 (2.5°/帧 极致丝滑) | 72 帧 (5°/帧 黄金均衡) | 36 帧 (10°/帧 基础)
  const [frameDensity, setFrameDensity] = useState<144 | 72 | 36>(144);

  // 目标旋转角与平滑渲染角（带物理阻尼插值）
  const [targetDegree, setTargetDegree] = useState<number>(0);
  const [displayDegree, setDisplayDegree] = useState<number>(0);

  // 静态多视角大片映射 (degree -> imageUrl)
  const [staticAngleImages, setStaticAngleImages] = useState<Record<number, string>>({});

  // 状态
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<string>('');
  const [isAutoSpinning, setIsAutoSpinning] = useState(false);
  const [showRawVideo, setShowRawVideo] = useState(false);

  // 手势拖拽状态
  const [isDragging, setIsDragging] = useState(false);
  const dragStartXRef = useRef<number>(0);
  const dragStartDegreeRef = useRef<number>(0);
  const autoSpinTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // 预热加载当前密度档位的全部序列图片
  useEffect(() => {
    if (isOpen) {
      const activeList = FRAMES_MAP[frameDensity];
      activeList.forEach((src) => {
        const img = new Image();
        img.src = src;
      });
      if (initialFrontImageUrl) {
        setStaticAngleImages((prev) => ({
          ...prev,
          0: initialFrontImageUrl,
        }));
      }
      setTargetDegree(0);
      setDisplayDegree(0);
      setIsAutoSpinning(false);
      setShowRawVideo(false);
    }
  }, [isOpen, frameDensity, initialFrontImageUrl]);

  // 物理阻尼平滑插值引擎 (RAF Lerp Damping Engine)
  // 当用户拖动或松开手时，让画面带微阻尼平滑逼近目标角度，彻底消除卡顿生硬感
  useEffect(() => {
    const updateDamping = () => {
      setDisplayDegree((prev) => {
        let diff = targetDegree - prev;
        // 处理环形 0° ~ 360° 跨界跳跃平滑
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;

        if (Math.abs(diff) < 0.1) {
          return (targetDegree + 360) % 360;
        }
        // 阻尼系数 0.35：跟手又带有高级阻尼质感
        const next = (prev + diff * 0.35 + 360) % 360;
        return next;
      });
      rafRef.current = requestAnimationFrame(updateDamping);
    };

    rafRef.current = requestAnimationFrame(updateDamping);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [targetDegree]);

  // 自动自转计时器 (Auto-Spin)
  useEffect(() => {
    if (isAutoSpinning && !showRawVideo) {
      // 每 33ms 前进约 1.5 度（约 30fps 匀速自转）
      autoSpinTimerRef.current = window.setInterval(() => {
        setTargetDegree((prev) => (prev + 1.6) % 360);
      }, 33);
    } else {
      if (autoSpinTimerRef.current) {
        clearInterval(autoSpinTimerRef.current);
        autoSpinTimerRef.current = null;
      }
    }
    return () => {
      if (autoSpinTimerRef.current) {
        clearInterval(autoSpinTimerRef.current);
        autoSpinTimerRef.current = null;
      }
    };
  }, [isAutoSpinning, showRawVideo]);

  // 当前高密帧索引计算
  const currentFrameIndex = useMemo(() => {
    const rawIdx = Math.floor((displayDegree / 360) * frameDensity);
    return Math.max(0, Math.min(frameDensity - 1, rawIdx));
  }, [displayDegree, frameDensity]);

  // 静态 4 视角最近邻算法
  const { currentStaticImageUrl, activeClosestStaticAngle } = useMemo(() => {
    const availableDegrees = Object.keys(staticAngleImages).map(Number);
    if (availableDegrees.length === 0) {
      return {
        currentStaticImageUrl: initialFrontImageUrl || avatar?.normalizedImageUrl || '',
        activeClosestStaticAngle: 0,
      };
    }

    let minDiff = 360;
    let closestDeg = availableDegrees[0];

    for (const deg of availableDegrees) {
      let diff = Math.abs(displayDegree - deg);
      if (diff > 180) diff = 360 - diff;
      if (diff < minDiff) {
        minDiff = diff;
        closestDeg = deg;
      }
    }

    return {
      currentStaticImageUrl: staticAngleImages[closestDeg] || '',
      activeClosestStaticAngle: closestDeg,
    };
  }, [displayDegree, staticAngleImages, initialFrontImageUrl, avatar]);

  // 当前展示大片 URL
  const displayImageUrl = useMemo(() => {
    if (labMode === 'ORBIT') {
      const activeList = FRAMES_MAP[frameDensity];
      return activeList[currentFrameIndex] || activeList[0];
    }
    return currentStaticImageUrl;
  }, [labMode, frameDensity, currentFrameIndex, currentStaticImageUrl]);

  // 触发静态 4 视角 AI 推演
  const handleGenerate360Views = async () => {
    if (!profile) {
      showToast('未检测到模特档案，请先在工作台选择模特', 'info');
      return;
    }
    if (wornItems.length === 0) {
      showToast('请先穿戴至少 1 件单品上身再推演 360° 空间视角', 'info');
      return;
    }

    try {
      setIsGenerating(true);
      setIsAutoSpinning(false);
      setGenerationProgress('正在启动 360° 空间多视角推演引擎 (正面/右侧/背面)...');

      const garmentIds = wornItems.map((w) => w.garment.id);

      const result = await generate360LabPreview({
        profileId: profile.id,
        garmentIds,
      });

      const newMap: Record<number, string> = { ...staticAngleImages };
      for (const v of result.views) {
        newMap[v.degrees] = v.imageUrl;
      }

      setStaticAngleImages(newMap);
      setLabMode('MULTI_STATIC');
      showToast('🎉 静态 4 视角大片推演完成！可在上方切换查看', 'info');
    } catch (err: any) {
      console.error('360 Lab 推演错误:', err);
      showToast(err.message || '推演失败，请重试', 'error');
    } finally {
      setIsGenerating(false);
      setGenerationProgress('');
    }
  };

  // 手势拖拽事件：鼠标
  const handleMouseDown = (e: React.MouseEvent) => {
    if (showRawVideo) return;
    setIsDragging(true);
    setIsAutoSpinning(false);
    dragStartXRef.current = e.clientX;
    dragStartDegreeRef.current = targetDegree;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartXRef.current;
    // 阻尼灵敏度：横向每移动 2.5px 推进约 1 度，手感细腻温和
    const deltaDegree = deltaX * 0.45;
    let nextDeg = (dragStartDegreeRef.current + deltaDegree) % 360;
    if (nextDeg < 0) nextDeg += 360;
    setTargetDegree(Math.round(nextDeg));
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
    }
  };

  // 手势拖拽事件：移动端触控
  const handleTouchStart = (e: React.TouchEvent) => {
    if (showRawVideo) return;
    if (e.touches.length === 1) {
      setIsDragging(true);
      setIsAutoSpinning(false);
      dragStartXRef.current = e.touches[0].clientX;
      dragStartDegreeRef.current = targetDegree;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const deltaX = e.touches[0].clientX - dragStartXRef.current;
    const deltaDegree = deltaX * 0.55;
    let nextDeg = (dragStartDegreeRef.current + deltaDegree) % 360;
    if (nextDeg < 0) nextDeg += 360;
    setTargetDegree(Math.round(nextDeg));
  };

  const handleTouchEnd = () => {
    if (isDragging) {
      setIsDragging(false);
    }
  };

  // 下载当前帧
  const handleDownloadCurrent = () => {
    if (!displayImageUrl) {
      showToast('暂无当前视角大片可供保存', 'info');
      return;
    }
    const a = document.createElement('a');
    a.href = displayImageUrl;
    a.download = `smart_wardrobe_360_view_${Math.round(displayDegree)}deg_${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('已开始下载当前视角大片', 'info');
  };

  if (!isOpen) return null;

  return typeof document !== 'undefined'
    ? createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 overflow-hidden animate-in fade-in select-none"
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* 居中实验台主卡片 */}
          <div
            className="relative w-full max-w-4xl max-h-[96vh] bg-[#121214] border border-amber-500/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-stone-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 顶部标题栏：高定极客实验风格 */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-stone-800 bg-stone-900/60 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
                  <RotateCcw className="w-5 h-5 animate-spin-slow" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-white tracking-wide">
                      360° 空间多视角环视实验室
                    </h3>
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full">
                      {frameDensity} 帧无缝流
                    </span>
                  </div>
                  <p className="text-xs text-stone-400">
                    每 {frameDensity === 144 ? '2.5°' : frameDensity === 72 ? '5°' : '10°'} 一帧 · 阻尼平滑插值 · 0ms 延迟无缝转盘
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* 帧密度档位切换器 */}
                {labMode === 'ORBIT' && (
                  <div className="hidden sm:flex items-center bg-stone-950 p-1 rounded-2xl border border-stone-800 text-[11px] font-mono">
                    <span className="px-2 text-stone-500 flex items-center gap-1">
                      <Gauge className="w-3 h-3 text-amber-400" />
                      密度:
                    </span>
                    {([144, 72, 36] as const).map((density) => (
                      <button
                        key={density}
                        type="button"
                        onClick={() => setFrameDensity(density)}
                        className={`px-2.5 py-0.5 rounded-xl font-bold transition-all cursor-pointer ${
                          frameDensity === density
                            ? 'bg-amber-500 text-stone-950 shadow-xs'
                            : 'text-stone-400 hover:text-white'
                        }`}
                        title={
                          density === 144
                            ? '144 帧 (每 2.5° 一帧，极致丝滑无级旋转)'
                            : density === 72
                            ? '72 帧 (每 5° 一帧，黄金均衡)'
                            : '36 帧 (每 10° 一帧，轻量基础)'
                        }
                      >
                        {density}帧
                      </button>
                    ))}
                  </div>
                )}

                {/* 核心双模切换胶囊 */}
                <div className="flex items-center bg-stone-950 p-1 rounded-2xl border border-stone-800">
                  <button
                    type="button"
                    onClick={() => {
                      setLabMode('ORBIT');
                      setShowRawVideo(false);
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      labMode === 'ORBIT'
                        ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span>连续转盘</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLabMode('MULTI_STATIC');
                      setShowRawVideo(false);
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      labMode === 'MULTI_STATIC'
                        ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>静态4视角</span>
                  </button>
                </div>

                {/* 关闭按钮 */}
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded-full transition-colors cursor-pointer"
                  title="关闭实验室"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 核心工作台视域 */}
            <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-6 p-4 sm:p-6 overflow-y-auto">
              {/* 左侧：3:4 黄金比例 360° 环视舞台 */}
              <div className="relative flex flex-col items-center">
                {/* 模特舞台容器 (3:4 画幅) */}
                <div
                  className={`relative aspect-[3/4] w-[270px] sm:w-[320px] md:w-[340px] rounded-2xl overflow-hidden shadow-2xl border-2 border-stone-700/60 bg-stone-950 cursor-grab active:cursor-grabbing transition-all ${
                    isDragging ? 'scale-[0.99] border-amber-500/70 shadow-amber-500/10' : ''
                  }`}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  {/* 大片展示：无缝连续切片 或 原版连续视频 */}
                  {showRawVideo ? (
                    <video
                      ref={videoRef}
                      src="/experiments/orbit_360.mp4"
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-contain pointer-events-none"
                    />
                  ) : displayImageUrl ? (
                    <img
                      src={displayImageUrl}
                      alt={`360度视角 ${Math.round(displayDegree)}°`}
                      className="w-full h-full object-contain pointer-events-none transition-none select-none"
                      draggable={false}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-stone-500">
                      <RotateCcw className="w-10 h-10 mb-3 text-stone-600 animate-spin-slow" />
                      <p className="text-sm font-bold text-stone-300">尚未加载大片</p>
                    </div>
                  )}

                  {/* 手势拖拽提示遮罩（实时度数与帧索引） */}
                  <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-mono font-medium text-amber-300 flex items-center gap-1.5 border border-amber-500/30">
                    <Compass className="w-3.5 h-3.5 animate-pulse" />
                    <span>{Math.round(displayDegree)}°</span>
                    {labMode === 'ORBIT' ? (
                      <span className="text-stone-400">
                        (第 {currentFrameIndex + 1}/{frameDensity} 帧 · {frameDensity === 144 ? '2.5°' : frameDensity === 72 ? '5°' : '10°'}/帧)
                      </span>
                    ) : (
                      <span className="text-stone-400">
                        (匹配 {activeClosestStaticAngle}° 视角)
                      </span>
                    )}
                  </div>

                  {/* 生图中高光遮罩 */}
                  {isGenerating && (
                    <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20 animate-in fade-in">
                      <div className="w-12 h-12 rounded-full border-3 border-amber-500 border-t-transparent animate-spin mb-4" />
                      <h4 className="text-sm font-bold text-amber-300">正在推演空间大片</h4>
                      <p className="text-xs text-stone-300 mt-2 max-w-xs">{generationProgress}</p>
                      <p className="text-[10px] text-stone-500 mt-3 font-mono">
                        独占 gemini-3.1-flash-image · 零文字硬核保真
                      </p>
                    </div>
                  )}

                  {/* 拖动引导指示器 */}
                  {!showRawVideo && (
                    <div className="absolute bottom-3 inset-x-0 flex justify-center pointer-events-none">
                      <div className="bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] text-stone-300 border border-white/10 flex items-center gap-1.5 shadow-lg">
                        <span className="text-amber-400 font-bold">⇄</span>
                        <span>左右拖拽感受物理级平滑无缝旋转</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 360° 空间罗盘旋转标尺与自动控制 */}
                <div className="mt-4 flex items-center gap-3">
                  {/* 环视度数刻度指示 */}
                  <div className="relative w-36 h-2 bg-stone-800 rounded-full overflow-hidden border border-stone-700">
                    <div
                      className="absolute top-0 bottom-0 bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-75"
                      style={{ width: `${(displayDegree / 360) * 100}%` }}
                    />
                  </div>

                  {/* 自动自转切换 */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowRawVideo(false);
                      setIsAutoSpinning(!isAutoSpinning);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isAutoSpinning
                        ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
                        : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                    }`}
                    title={isAutoSpinning ? '暂停自转' : '开启自动平滑环视自转'}
                  >
                    {isAutoSpinning ? (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        <span>暂停自转</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>自动环视</span>
                      </>
                    )}
                  </button>

                  {/* 视频原片直放对比 */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsAutoSpinning(false);
                      setShowRawVideo(!showRawVideo);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      showRawVideo
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                        : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                    }`}
                    title="播放原版 360° 连续视频流"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>{showRawVideo ? '返回手势转盘' : '原片循环'}</span>
                  </button>
                </div>
              </div>

              {/* 右侧：控制中枢与视角档案 */}
              <div className="flex-1 w-full max-w-md flex flex-col gap-4">
                {/* 1. 轨道视频采样报告卡片 */}
                <div className="p-4 bg-stone-900/90 border border-stone-800 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Film className="w-4 h-4 text-amber-400" />
                      <h4 className="text-sm font-extrabold text-white">
                        {labMode === 'ORBIT' ? `${frameDensity} 帧高密无缝连续转盘` : '静态 4 视角推演引擎'}
                      </h4>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {labMode === 'ORBIT' ? `${frameDensity} 帧全部就绪` : `${Object.keys(staticAngleImages).length}/4 视角就绪`}
                    </span>
                  </div>

                  <p className="text-xs text-stone-400 leading-relaxed">
                    {labMode === 'ORBIT'
                      ? `已将 360° 轨道视频解算为 ${frameDensity} 帧高密序列（每帧仅相差 ${frameDensity === 144 ? '2.5°' : frameDensity === 72 ? '5°' : '10°'}），配合物理阻尼平滑插值，彻底消除跳帧感！`
                      : `基于已穿戴单品与模特素体，定向推演 4 方位大片。当前已就绪 ${Object.keys(staticAngleImages).length} 视角。`}
                  </p>

                  {labMode === 'MULTI_STATIC' && (
                    <button
                      type="button"
                      onClick={handleGenerate360Views}
                      disabled={isGenerating || wornItems.length === 0}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 hover:opacity-95 active:scale-[0.98] text-white rounded-xl text-xs font-black shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                      <span>
                        {isGenerating
                          ? 'AI 正在推演空间视角...'
                          : Object.keys(staticAngleImages).length > 1
                          ? '🔄 重新推演 4 视角大片'
                          : '✨ 一键推演 4 视角大片'}
                      </span>
                    </button>
                  )}
                </div>

                {/* 2. 快捷四分位视角切片卡片 */}
                <div className="p-4 bg-stone-900/90 border border-stone-800 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-stone-300 uppercase tracking-wider">
                      四方位精准吸附对齐
                    </h4>
                    <span className="text-[10px] text-stone-500 font-mono">点击直接转到对应角度</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {STANDARD_ANGLES.map((ang) => {
                      const isCurrentActive =
                        labMode === 'ORBIT'
                          ? Math.abs(displayDegree - ang.degree) < 15 || Math.abs(displayDegree - ang.degree) > 345
                          : activeClosestStaticAngle === ang.degree;

                      const matchedFrame =
                        labMode === 'ORBIT'
                          ? Math.round((ang.degree / 360) * frameDensity) % frameDensity + 1
                          : null;

                      return (
                        <button
                          key={ang.key}
                          type="button"
                          onClick={() => {
                            setShowRawVideo(false);
                            setIsAutoSpinning(false);
                            setTargetDegree(ang.degree);
                          }}
                          className={`relative p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                            isCurrentActive
                              ? 'bg-amber-500/15 border-amber-500/80 shadow-md shadow-amber-500/10'
                              : 'bg-stone-950/60 border-stone-800 hover:border-stone-700 text-stone-400'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-xs font-bold ${
                                isCurrentActive ? 'text-amber-400' : 'text-stone-200'
                              }`}
                            >
                              {ang.label} ({ang.degree}°)
                            </span>
                            <span className="text-[10px] text-emerald-400 font-mono">
                              {labMode === 'ORBIT' ? `第 ${matchedFrame} 帧` : '✓'}
                            </span>
                          </div>
                          <span className="text-[10px] text-stone-500 line-clamp-1">
                            {ang.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. 底部行动栏 */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={handleDownloadCurrent}
                    disabled={!displayImageUrl}
                    className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-40 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-stone-400" />
                    <span>保存当前角度大片</span>
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 bg-stone-200 hover:bg-white text-stone-900 rounded-xl text-xs font-black transition-all cursor-pointer"
                  >
                    完成体验 / 返回工作台
                  </button>
                </div>
              </div>
            </div>

            {/* 底部隔离防辐射备忘 */}
            <div className="px-6 py-2.5 border-t border-stone-800/80 bg-stone-950/80 text-[11px] text-stone-500 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-amber-500" />
                <span>沙盒隔离模式：{frameDensity} 帧高密无缝旋转实验中，手势阻尼平滑插值，零污染主库</span>
              </div>
              <span className="font-mono text-[10px] text-stone-600">Smart Wardrobe 144-Frame Orbit Engine</span>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;
};
