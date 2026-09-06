import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  RotateCcw,
  Play,
  Pause,
  Download,
  Compass,
} from 'lucide-react';
import { UserProfile, UserAvatar } from '@smart-wardrobe/shared';
import { WornItemData } from '../views/FittingStudioView';
import { showToast } from './Toast';

export interface Studio360LabModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  avatar: UserAvatar | null;
  wornItems: WornItemData[];
  initialFrontImageUrl?: string | null;
}

// 工业级 180 帧等角超清序列 (严格每 2.0° 一帧，四象限各 45 帧，全量 7.6 MB)
const TOTAL_FRAMES = 180;
const FRAMES_LIST = Array.from(
  { length: TOTAL_FRAMES },
  (_, i) => `/experiments/frames_v4_180fps/frame_${String(i + 1).padStart(3, '0')}.jpg`
);

export const Studio360LabModal: React.FC<Studio360LabModalProps> = ({
  isOpen,
  onClose,
}) => {
  // 目标旋转角与平滑渲染角（带物理阻尼插值）
  const [targetDegree, setTargetDegree] = useState<number>(0);
  const [displayDegree, setDisplayDegree] = useState<number>(0);

  // 交互状态
  const [isAutoSpinning, setIsAutoSpinning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // 引用
  const dragStartXRef = useRef<number>(0);
  const dragStartDegreeRef = useRef<number>(0);
  const lastMoveXRef = useRef<number>(0);
  const lastMoveTimeRef = useRef<number>(0);
  const flickVelocityRef = useRef<number>(0);

  const autoSpinTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const inertiaRafRef = useRef<number | null>(null);

  // 预热加载 180 帧全量序列图片，保证 0 延迟秒开与极速跟手
  useEffect(() => {
    if (isOpen) {
      FRAMES_LIST.forEach((src) => {
        const img = new Image();
        img.src = src;
      });
      setTargetDegree(0);
      setDisplayDegree(0);
      setIsAutoSpinning(false);
      flickVelocityRef.current = 0;
    }
  }, [isOpen]);

  // 物理阻尼平滑插值引擎 (RAF Lerp Damping Engine)
  useEffect(() => {
    const updateDamping = () => {
      setDisplayDegree((prev) => {
        let diff = targetDegree - prev;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;

        if (Math.abs(diff) < 0.08) {
          return (targetDegree + 360) % 360;
        }
        // 0.4 阻尼：跟手迅捷且完全消除阶梯跳变
        const next = (prev + diff * 0.4 + 360) % 360;
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
    if (isAutoSpinning) {
      autoSpinTimerRef.current = window.setInterval(() => {
        setTargetDegree((prev) => (prev + 1.2) % 360);
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
  }, [isAutoSpinning]);

  // 180 帧严格等角线性映射 (严格每 2.0° 一帧)
  const currentFrameIndex = useMemo(() => {
    const normDeg = ((displayDegree % 360) + 360) % 360;
    const rawIdx = Math.floor((normDeg / 360) * TOTAL_FRAMES);
    return Math.max(0, Math.min(TOTAL_FRAMES - 1, rawIdx));
  }, [displayDegree]);

  // 当前视角方位标签解析
  const currentAngleLabel = useMemo(() => {
    const deg = Math.round(displayDegree);
    if (deg >= 350 || deg <= 10) return '正面 0°';
    if (deg >= 80 && deg <= 100) return '右侧 90°';
    if (deg >= 170 && deg <= 190) return '背面 180°';
    if (deg >= 260 && deg <= 280) return '左侧 270°';
    return `${deg}°`;
  }, [displayDegree]);

  const currentImageUrl = FRAMES_LIST[currentFrameIndex] || FRAMES_LIST[0];

  // 停止惯性滑行动画
  const stopInertia = () => {
    if (inertiaRafRef.current) {
      cancelAnimationFrame(inertiaRafRef.current);
      inertiaRafRef.current = null;
    }
  };

  // 全局指针事件：按下开始拖拽并捕获
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    stopInertia();
    setIsDragging(true);
    setIsAutoSpinning(false);
    dragStartXRef.current = e.clientX;
    dragStartDegreeRef.current = targetDegree;
    lastMoveXRef.current = e.clientX;
    lastMoveTimeRef.current = performance.now();
    flickVelocityRef.current = 0;

    // 捕获指针事件，即使拖出容器也不会丢失手势
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
  };

  // 全局指针事件：移动计算物理旋转度数与瞬时角速度
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const now = performance.now();
    const dt = Math.max(1, now - lastMoveTimeRef.current);
    const dx = e.clientX - lastMoveXRef.current;

    // 计算瞬时甩动角速度 (度/毫秒)
    const instantVelocity = (dx * 0.42) / dt;
    // 平滑滤波累计速度
    flickVelocityRef.current = flickVelocityRef.current * 0.6 + instantVelocity * 0.4;

    lastMoveXRef.current = e.clientX;
    lastMoveTimeRef.current = now;

    // 基础拖动灵敏度：横向每移动 2.4px 推进 1 度，跟手丝滑
    const totalDeltaX = e.clientX - dragStartXRef.current;
    const deltaDegree = totalDeltaX * 0.42;
    let nextDeg = (dragStartDegreeRef.current + deltaDegree) % 360;
    if (nextDeg < 0) nextDeg += 360;
    setTargetDegree(nextDeg);
  };

  // 全局指针事件：抬起/释放并触发轻量惯性滑行
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}

    // 若松手时存在较高初速度，启动阻尼惯性减速滑行
    let v = flickVelocityRef.current * 16; // 换算到每帧度数
    if (Math.abs(v) > 0.6) {
      // 速度限幅，防止甩得太猛
      v = Math.max(-12, Math.min(12, v));
      const stepInertia = () => {
        if (Math.abs(v) > 0.12) {
          setTargetDegree((prev) => {
            let next = (prev + v) % 360;
            if (next < 0) next += 360;
            return next;
          });
          v *= 0.91; // 摩擦阻尼系数
          inertiaRafRef.current = requestAnimationFrame(stepInertia);
        } else {
          stopInertia();
        }
      };
      inertiaRafRef.current = requestAnimationFrame(stepInertia);
    }
  };

  // 保存当前角度大片
  const handleDownloadCurrent = () => {
    if (!currentImageUrl) {
      showToast('暂无当前视角大片可供保存', 'info');
      return;
    }
    const a = document.createElement('a');
    a.href = currentImageUrl;
    a.download = `smart_wardrobe_360_view_${Math.round(displayDegree)}deg_frame${currentFrameIndex + 1}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('已开始保存当前角度大片', 'info');
  };

  if (!isOpen) return null;

  return typeof document !== 'undefined'
    ? createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/92 backdrop-blur-xl p-2 sm:p-6 overflow-hidden animate-in fade-in select-none"
          onClick={onClose}
        >
          {/* 大视窗沉浸式舞台核心卡片 */}
          <div
            className="relative flex flex-col items-center justify-center max-w-full max-h-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 顶部极简悬浮徽标与关闭入口 */}
            <div className="absolute -top-12 inset-x-0 flex items-center justify-between px-2 text-stone-300 pointer-events-auto">
              <div className="flex items-center gap-2 bg-stone-900/80 backdrop-blur-md px-3 py-1 rounded-full border border-stone-700/60 shadow-lg">
                <RotateCcw className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
                <span className="text-xs font-bold text-white tracking-wide">360° 沉浸环视舞台</span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/30">
                  180 帧 (2.0°/帧)
                </span>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-stone-900/80 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-700/60 flex items-center justify-center transition-all cursor-pointer shadow-lg"
                title="关闭环视大视窗"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 3:4 黄金画幅大视窗展示区 (高度自适应锁定 74vh，最大 840px，居中无界拖拽) */}
            <div
              className={`relative aspect-[3/4] h-[74vh] max-h-[840px] rounded-3xl overflow-hidden shadow-2xl border-2 border-stone-800/80 bg-stone-950 flex items-center justify-center cursor-grab active:cursor-grabbing transition-all ${
                isDragging ? 'border-amber-500/80 shadow-2xl shadow-amber-500/10 scale-[0.995]' : 'hover:border-stone-700'
              }`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              {/* 大片展示：180 帧绝对等角序列 */}
              <img
                src={currentImageUrl}
                alt={`360度视角 ${Math.round(displayDegree)}°`}
                className="w-full h-full object-contain pointer-events-none transition-none select-none"
                draggable={false}
              />

              {/* 左上角极简度数与象限微标 */}
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-mono font-bold text-amber-300 flex items-center gap-2 border border-amber-500/30 shadow-lg pointer-events-none">
                <Compass className="w-4 h-4 animate-pulse text-amber-400" />
                <span>{currentAngleLabel}</span>
                <span className="text-[10px] text-stone-400 font-normal">
                  ({currentFrameIndex + 1}/180)
                </span>
              </div>

              {/* 底部悬浮毛玻璃药丸控制坞 */}
              <div
                className="absolute bottom-5 inset-x-0 flex justify-center pointer-events-auto px-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 bg-black/75 backdrop-blur-md px-4 py-2 rounded-full border border-stone-700/60 shadow-2xl">
                  {/* 拖动提示 */}
                  <span className="text-xs text-stone-300 flex items-center gap-1">
                    <span className="text-amber-400 font-black text-sm">⇄</span>
                    <span className="hidden sm:inline">拖拽或轻甩旋转</span>
                  </span>

                  <div className="w-px h-4 bg-stone-700/60" />

                  {/* 进度环形条 */}
                  <div className="relative w-24 sm:w-32 h-1.5 bg-stone-800 rounded-full overflow-hidden border border-stone-700/80">
                    <div
                      className="absolute top-0 bottom-0 bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-75"
                      style={{ width: `${(displayDegree / 360) * 100}%` }}
                    />
                  </div>

                  <div className="w-px h-4 bg-stone-700/60" />

                  {/* 自动环视切换 */}
                  <button
                    type="button"
                    onClick={() => {
                      stopInertia();
                      setIsAutoSpinning(!isAutoSpinning);
                    }}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isAutoSpinning
                        ? 'bg-amber-500 text-stone-950 font-extrabold shadow-md shadow-amber-500/30'
                        : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
                    }`}
                    title={isAutoSpinning ? '暂停环视' : '开启自动环视'}
                  >
                    {isAutoSpinning ? (
                      <>
                        <Pause className="w-3 h-3" />
                        <span>暂停</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3" />
                        <span>自转</span>
                      </>
                    )}
                  </button>

                  {/* 保存大片按钮 */}
                  <button
                    type="button"
                    onClick={handleDownloadCurrent}
                    className="p-1.5 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer"
                    title="保存当前角度高清大片"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;
};
