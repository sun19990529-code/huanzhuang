import React, { useState, useRef, useEffect } from 'react';
import {
  UserProfile,
  UserAvatar,
  GarmentItem,
  GarmentState,
  calculateNormalizedDistance,
  evaluateSnapAlignment,
  calculateRenderZIndex,
} from '@smart-wardrobe/shared';
import {
  RotateCcw,
  Sparkles,
  Maximize2,
  Trash2,
  Undo2,
  Redo2,
  Layers,
  ChevronUp,
  ChevronDown,
  Compass,
  Sliders,
  CheckCircle2,
  Scissors,
} from 'lucide-react';

interface WornItemData {
  garment: GarmentItem;
  state: GarmentState;
  zIndex: number;
  offsetX: number;
  offsetY: number;
  scale: number;
}

interface DressingCanvasProps {
  profile: UserProfile | null;
  avatar: UserAvatar | null;
  wornItems: WornItemData[];
  onUpdateWornItem: (
    garmentId: string,
    updates: Partial<{ state: GarmentState; offsetX: number; offsetY: number; scale: number; zIndex: number }>
  ) => void;
  onRemoveWornItem: (garmentId: string) => void;
  onClearCanvas: () => void;
}

export const DressingCanvas: React.FC<DressingCanvasProps> = ({
  profile,
  avatar,
  wornItems,
  onUpdateWornItem,
  onRemoveWornItem,
  onClearCanvas,
}) => {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialItemOffset, setInitialItemOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [snapTriggered, setSnapTriggered] = useState<string | null>(null);
  const [history, setHistory] = useState<WornItemData[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const canvasRef = useRef<HTMLDivElement>(null);

  // 预设骨骼吸附锚点 (PRD 6.2)
  const snapAnchors = [
    { name: '肩颈锚点', anchor: { x: 0.5, y: 0.28 } },
    { name: '腰线锚点', anchor: { x: 0.5, y: 0.53 } },
    { name: '脚踝锚点', anchor: { x: 0.5, y: 0.88 } },
  ];

  // 记录历史操作 (Undo / Redo 栈)
  useEffect(() => {
    if (wornItems.length > 0 && (history.length === 0 || JSON.stringify(history[historyIndex]) !== JSON.stringify(wornItems))) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(wornItems);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  }, [wornItems]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
    }
  };

  // 排序穿戴单品（按 Z-Index 升序渲染）
  const sortedItems = [...wornItems].sort((a, b) => a.zIndex - b.zIndex);

  const selectedItem = wornItems.find((i) => i.garment.id === selectedItemId);
  const hasOuterwear = wornItems.some((i) => i.garment.primaryCategory === 'OUTERWEAR');
  const hasTops = wornItems.some((i) => i.garment.primaryCategory === 'TOPS');

  // 鼠标 / 触摸拖拽开始
  const handlePointerDown = (garmentId: string, e: React.PointerEvent) => {
    e.stopPropagation();
    setSelectedItemId(garmentId);
    setIsDragging(true);
    setDragStartPos({ x: e.clientX, y: e.clientY });

    const item = wornItems.find((i) => i.garment.id === garmentId);
    if (item) {
      setInitialItemOffset({ x: item.offsetX, y: item.offsetY });
    }
  };

  // 拖拽移动
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !selectedItemId || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const deltaX = (e.clientX - dragStartPos.x) / rect.width;
    const deltaY = (e.clientY - dragStartPos.y) / rect.height;

    const newOffsetX = initialItemOffset.x + deltaX;
    const newOffsetY = initialItemOffset.y + deltaY;

    onUpdateWornItem(selectedItemId, {
      offsetX: Math.max(-0.4, Math.min(0.4, newOffsetX)),
      offsetY: Math.max(-0.4, Math.min(0.4, newOffsetY)),
    });
  };

  // 拖拽松手，触发智能 Snap 磁吸计算 (<0.08)
  const handlePointerUp = () => {
    if (!isDragging || !selectedItemId) return;
    setIsDragging(false);

    const item = wornItems.find((i) => i.garment.id === selectedItemId);
    if (item) {
      const currentPos = { x: 0.5 + item.offsetX, y: 0.5 + item.offsetY };
      const snapResult = evaluateSnapAlignment(currentPos, snapAnchors, 0.08);

      if (snapResult.isSnapped) {
        onUpdateWornItem(selectedItemId, { offsetX: 0, offsetY: 0 });
        setSnapTriggered(snapResult.targetName || '骨骼锚点');
        setTimeout(() => setSnapTriggered(null), 1800);
      }
    }
  };

  return (
    <div
      className="flex-1 h-full flex flex-col items-center justify-between p-4 relative select-none overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* 顶部工具栏 (Glassmorphism 毛玻璃工具栏) */}
      <div className="w-full max-w-xl flex items-center justify-between z-30 px-4 py-2.5 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl shadow-purple-950/20">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-bold bg-gradient-to-r from-purple-400 to-indigo-300 bg-clip-text text-transparent">
            <Compass className="w-4 h-4 text-purple-400 animate-spin-slow" />
            2D 拼装试衣间
          </span>
          <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/40 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> 60 FPS 极速
          </span>
        </div>

        {/* 撤销 / 重做 / 清空操作组 */}
        <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800/80">
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            title="撤销 (Undo)"
            className="p-1.5 text-slate-400 hover:text-purple-300 hover:bg-purple-950/50 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-all"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            title="重做 (Redo)"
            className="p-1.5 text-slate-400 hover:text-purple-300 hover:bg-purple-950/50 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-all"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
          <div className="w-[1px] h-3 bg-slate-800 mx-1" />
          <button
            onClick={onClearCanvas}
            title="清空当前试衣间"
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-rose-300 hover:text-rose-200 hover:bg-rose-950/40 rounded-lg transition-colors"
          >
            <Trash2 className="w-3 h-3" /> 清空
          </button>
        </div>
      </div>

      {/* Snap 磁吸成功金色微光涟漪提示 */}
      {snapTriggered && (
        <div className="absolute top-20 z-40 px-4 py-1.5 rounded-full bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/40 text-yellow-200 text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-yellow-500/10 animate-bounce">
          <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
          已自动磁吸对齐至【{snapTriggered}】
        </div>
      )}

      {/* 画布核心区域 (Canvas Viewport) */}
      <div className="relative flex-1 w-full flex items-center justify-center my-2">
        <div
          ref={canvasRef}
          className="w-[360px] h-[540px] md:w-[380px] md:h-[570px] bg-slate-950/90 rounded-3xl border border-purple-500/30 shadow-2xl relative overflow-hidden flex items-center justify-center backdrop-blur-md group"
          onClick={() => setSelectedItemId(null)}
        >
          {/* 精致微点阵与科技标尺背景 */}
          <div className="absolute inset-0 bg-[radial-gradient(#a855f7_1px,transparent_1px)] [background-size:18px_18px] opacity-15 pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />

          {/* 1. L0 人物素体层 (Avatar Silhouette) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
            {/* 头部与面部特征 */}
            <div className="w-16 h-20 rounded-full border border-purple-500/30 bg-gradient-to-b from-purple-950/40 to-slate-900/60 shadow-inner flex items-center justify-center mt-6">
              <div className="w-12 h-16 rounded-full bg-slate-900/80 border border-purple-400/20" />
            </div>

            {/* 颈部 */}
            <div className="w-6 h-4 bg-slate-900 border-x border-purple-500/20" />

            {/* 躯干 & 贴身素衣平角裤 (PRD 3.2.1 标准) */}
            <div className="w-32 h-44 bg-gradient-to-b from-purple-950/30 to-slate-900/50 border border-purple-500/20 rounded-2xl flex flex-col items-center justify-between p-1.5 shadow-sm">
              <div className="w-28 h-12 bg-purple-900/20 rounded-t-xl border-b border-purple-500/20 flex items-center justify-center">
                <span className="text-[9px] text-purple-400/60 font-mono">CHEST 84cm</span>
              </div>
              <div className="w-26 h-10 bg-purple-900/40 rounded-b-xl border-t border-purple-500/30 flex items-center justify-center">
                <span className="text-[9px] text-purple-300/70 font-mono">WAIST 62cm</span>
              </div>
            </div>

            {/* 腿部与双脚 */}
            <div className="flex gap-4 w-28 h-44 justify-between mt-1">
              <div className="w-11 h-full bg-gradient-to-b from-slate-900 to-slate-950 border border-purple-500/20 rounded-b-xl" />
              <div className="w-11 h-full bg-gradient-to-b from-slate-900 to-slate-950 border border-purple-500/20 rounded-b-xl" />
            </div>

            {/* 模特档案体型水印 */}
            <div className="absolute bottom-3 left-4 text-[10px] text-slate-400 font-mono bg-slate-950/80 px-2 py-0.5 rounded-md border border-slate-800">
              {profile ? `${profile.name} · ${profile.heightCm}cm / ${profile.weightKg}kg` : '标准 A-Pose 素体'}
            </div>
          </div>

          {/* 2. 骨骼吸附锚点微光 (Snap Anchor Points) */}
          {snapAnchors.map((sa, idx) => (
            <div
              key={idx}
              className="absolute w-3 h-3 rounded-full border border-yellow-400/50 bg-yellow-400/20 flex items-center justify-center pointer-events-none animate-pulse"
              style={{
                left: `${sa.anchor.x * 100}%`,
                top: `${sa.anchor.y * 100}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div className="w-1 h-1 rounded-full bg-yellow-400" />
            </div>
          ))}

          {/* 3. 逐层渲染穿戴的衣物切片 */}
          {sortedItems.map((item) => {
            const isSelected = selectedItemId === item.garment.id;
            const primaryColor = item.garment.colors[0] || '#7c3aed';

            return (
              <div
                key={item.garment.id}
                onPointerDown={(e) => handlePointerDown(item.garment.id, e)}
                style={{
                  zIndex: item.zIndex,
                  transform: `translate(${item.offsetX * 360}px, ${item.offsetY * 540}px) scale(${item.scale})`,
                  transition: isDragging && isSelected ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
                }}
                className={`absolute cursor-grab active:cursor-grabbing select-none group/item ${
                  isSelected
                    ? 'ring-2 ring-purple-400 ring-offset-2 ring-offset-slate-950 shadow-2xl shadow-purple-500/30'
                    : 'hover:ring-1 hover:ring-purple-400/50'
                }`}
              >
                {/* 动态服装切片形态视觉渲染 */}
                {item.garment.primaryCategory === 'TOPS' && (
                  <div
                    className={`w-36 rounded-2xl flex flex-col items-center justify-between p-2 shadow-xl backdrop-blur-xs transition-all ${
                      item.state === 'TUCKED' ? 'h-32 rounded-b-sm border-b-2 border-dashed border-indigo-400/60' : 'h-40 rounded-b-2xl'
                    }`}
                    style={{
                      backgroundColor: primaryColor,
                      boxShadow: `0 10px 25px -5px ${primaryColor}40`,
                    }}
                  >
                    <div className="w-14 h-4 rounded-full bg-black/20 border border-white/20" />
                    <span className="text-[10px] font-bold text-white/90 drop-shadow-md">{item.garment.title}</span>
                    <span className="text-[8px] uppercase tracking-wider text-white/70 bg-black/30 px-1.5 py-0.5 rounded-full font-mono">
                      {item.state === 'TUCKED' ? '塞衣角 (Tucked)' : '外放 (Untucked)'}
                    </span>
                  </div>
                )}

                {item.garment.primaryCategory === 'BOTTOMS' && (
                  <div
                    className="w-32 h-52 rounded-2xl flex flex-col justify-between p-2 shadow-xl backdrop-blur-xs"
                    style={{
                      backgroundColor: primaryColor,
                      boxShadow: `0 10px 25px -5px ${primaryColor}40`,
                    }}
                  >
                    <div className="w-full h-3 rounded-full bg-black/20 border border-white/20" />
                    <div className="flex gap-2 h-44">
                      <div className="flex-1 bg-black/10 rounded-b-xl" />
                      <div className="flex-1 bg-black/10 rounded-b-xl" />
                    </div>
                    <span className="text-[9px] font-bold text-white/90 text-center drop-shadow-md">{item.garment.title}</span>
                  </div>
                )}

                {item.garment.primaryCategory === 'OUTERWEAR' && (
                  <div
                    className={`h-56 rounded-2xl flex items-center justify-between p-2 shadow-2xl transition-all ${
                      item.state === 'OPEN' ? 'w-48 bg-transparent' : 'w-44'
                    }`}
                    style={{
                      boxShadow: `0 15px 30px -5px ${primaryColor}50`,
                    }}
                  >
                    {item.state === 'OPEN' ? (
                      <>
                        <div
                          className="w-16 h-full rounded-2xl flex flex-col justify-between p-1.5 shadow-lg"
                          style={{ backgroundColor: primaryColor }}
                        >
                          <span className="text-[8px] text-white/80 font-mono">L-FLAP</span>
                        </div>
                        <div className="w-12 h-full border-x border-dashed border-purple-400/40 flex items-center justify-center">
                          <span className="text-[8px] text-purple-300 font-bold bg-slate-950/80 px-1 py-0.5 rounded">内搭露光</span>
                        </div>
                        <div
                          className="w-16 h-full rounded-2xl flex flex-col justify-between p-1.5 shadow-lg"
                          style={{ backgroundColor: primaryColor }}
                        >
                          <span className="text-[8px] text-white/80 font-mono">R-FLAP</span>
                        </div>
                      </>
                    ) : (
                      <div
                        className="w-full h-full rounded-2xl flex flex-col justify-between p-2"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <div className="w-full h-4 border-b border-black/30" />
                        <span className="text-[10px] font-bold text-white/90 text-center drop-shadow-md">
                          {item.garment.title} (合拢扣合)
                        </span>
                        <div className="w-full h-2 bg-black/20 rounded-full" />
                      </div>
                    )}
                  </div>
                )}

                {item.garment.primaryCategory === 'FOOTWEAR' && (
                  <div
                    className="w-28 h-8 rounded-xl flex items-center justify-center p-1 shadow-lg"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <span className="text-[9px] font-bold text-white/90">{item.garment.title}</span>
                  </div>
                )}

                {item.garment.primaryCategory === 'ACCESSORIES' && (
                  <div
                    className="w-20 h-10 rounded-full flex items-center justify-center p-1 shadow-lg"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <span className="text-[8px] font-bold text-white/90">{item.garment.title}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 底部浮动形态控制器 (Floating State Capsule Controller) */}
      <div className="w-full max-w-xl z-30 flex flex-wrap items-center justify-center gap-2">
        {/* 外套 Open / Closed 控制 */}
        {hasOuterwear && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-purple-500/30 shadow-xl">
            <span className="text-[11px] font-bold text-purple-300 flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-purple-400" /> 外套形态:
            </span>
            {wornItems
              .filter((i) => i.garment.primaryCategory === 'OUTERWEAR')
              .map((outer) => (
                <div key={outer.garment.id} className="flex gap-1">
                  <button
                    onClick={() => onUpdateWornItem(outer.garment.id, { state: 'OPEN' })}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                      outer.state === 'OPEN'
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    敞开 (Open)
                  </button>
                  <button
                    onClick={() => onUpdateWornItem(outer.garment.id, { state: 'CLOSED' })}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                      outer.state === 'CLOSED'
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    合拢 (Closed)
                  </button>
                </div>
              ))}
          </div>
        )}

        {/* 上装塞衣角 Tuck-in / Untuck 控制 */}
        {hasTops && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-indigo-500/30 shadow-xl">
            <span className="text-[11px] font-bold text-indigo-300 flex items-center gap-1">
              <Scissors className="w-3.5 h-3.5 text-indigo-400" /> 上装下摆:
            </span>
            {wornItems
              .filter((i) => i.garment.primaryCategory === 'TOPS')
              .map((top) => (
                <div key={top.garment.id} className="flex gap-1">
                  <button
                    onClick={() => onUpdateWornItem(top.garment.id, { state: 'TUCKED' })}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                      top.state === 'TUCKED' || top.state === 'DEFAULT'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    塞衣角 (Tuck-in)
                  </button>
                  <button
                    onClick={() => onUpdateWornItem(top.garment.id, { state: 'UNTUCKED' })}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                      top.state === 'UNTUCKED'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    外放 (Untucked)
                  </button>
                </div>
              ))}
          </div>
        )}

        {/* 选中单品的图层升降操作 */}
        {selectedItem && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-900/90 backdrop-blur-xl border border-yellow-500/30 shadow-xl text-xs text-yellow-300">
            <span className="font-bold">{selectedItem.garment.title}</span>
            <button
              onClick={() => onUpdateWornItem(selectedItem.garment.id, { zIndex: selectedItem.zIndex + 1 })}
              className="p-1 hover:bg-yellow-950/60 rounded-lg text-yellow-400"
              title="图层上移一层"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onUpdateWornItem(selectedItem.garment.id, { zIndex: Math.max(1, selectedItem.zIndex - 1) })}
              className="p-1 hover:bg-yellow-950/60 rounded-lg text-yellow-400"
              title="图层下移一层"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onRemoveWornItem(selectedItem.garment.id)}
              className="p-1 hover:bg-rose-950/60 text-rose-400 rounded-lg ml-1"
              title="脱下此单品"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
