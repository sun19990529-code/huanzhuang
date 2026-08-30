import React, { useState } from 'react';
import { GarmentItem, GarmentState } from '@smart-wardrobe/shared';
import {
  Sparkles,
  Layers,
  Save,
  Send,
  Zap,
  CheckCircle2,
  Clock,
  Eye,
  Sliders,
  ChevronRight,
  SplitSquareVertical,
} from 'lucide-react';

interface WornItemData {
  garment: GarmentItem;
  state: GarmentState;
  zIndex: number;
}

interface VtonWorkshopProps {
  wornItems: WornItemData[];
  onSaveLookbook: (title: string) => void;
  onRenderVton: () => void;
  onSuggestToFriend: () => void;
  isRendering: boolean;
  renderProgress: number;
  renderStage: string;
  renderedImageUrl: string | null;
  dailyCredits: number;
}

export const VtonWorkshop: React.FC<VtonWorkshopProps> = ({
  wornItems,
  onSaveLookbook,
  onRenderVton,
  onSuggestToFriend,
  isRendering,
  renderProgress,
  renderStage,
  renderedImageUrl,
  dailyCredits,
}) => {
  const [outfitTitle, setOutfitTitle] = useState('');
  const [isIsometricView, setIsIsometricView] = useState(true);
  const [sliderPosition, setSliderPosition] = useState(50); // 0 ~ 100 左右滑动对比位置

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!outfitTitle) return;
    onSaveLookbook(outfitTitle);
    setOutfitTitle('');
  };

  // 按 Z-Index 升序排序
  const sortedItems = [...wornItems].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <aside className="w-80 md:w-96 border-l border-purple-900/30 bg-slate-950/80 backdrop-blur-xl flex flex-col h-full overflow-hidden text-left z-20">
      {/* 顶部标题 */}
      <div className="p-4 border-b border-purple-900/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-100">AI 试穿 & 图层透视</h3>
            <p className="text-[10px] text-slate-400">Diffusion VTON 高清成片引擎</p>
          </div>
        </div>
        <button
          onClick={() => setIsIsometricView(!isIsometricView)}
          title="切换 3D 立体图层透视 / 列表视图"
          className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
            isIsometricView
              ? 'bg-purple-600/20 text-purple-300 border-purple-500/40'
              : 'bg-slate-900 text-slate-400 border-slate-800'
          }`}
        >
          {isIsometricView ? '🧊 3D 透视' : '📋 平面列表'}
        </button>
      </div>

      {/* 核心内容区 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* 1. 3D Isometric 图层透视面板 (PRD 3.3.1 深度可视化) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-400" /> 实时 Z-Index 拓扑透视
            </span>
            <span className="text-[10px] text-purple-400 font-mono font-bold bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-800/40">
              {wornItems.length} 件穿戴中
            </span>
          </div>

          {wornItems.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs bg-slate-900/40 rounded-2xl border border-slate-800/80">
              试衣间暂无单品，请在左侧衣柜点击穿上
            </div>
          ) : isIsometricView ? (
            /* 3D 倾斜图层卡片堆叠 (Isometric Layer Stack) */
            <div className="relative py-4 px-6 bg-slate-900/60 rounded-2xl border border-purple-500/20 flex flex-col items-center justify-center min-h-[180px] overflow-hidden">
              <div className="text-[9px] text-slate-400 absolute top-2 left-3 font-mono">TOP (最外层)</div>
              <div className="text-[9px] text-slate-400 absolute bottom-2 left-3 font-mono">BOTTOM (L0 素体)</div>

              <div className="space-y-[-14px] w-full max-w-[220px] my-2">
                {[...sortedItems].reverse().map((item, idx) => {
                  const color = item.garment.colors[0] || '#7c3aed';
                  return (
                    <div
                      key={item.garment.id}
                      style={{
                        transform: `rotateX(45deg) rotateZ(-20deg) translateZ(${idx * 12}px)`,
                        backgroundColor: `${color}cc`,
                        boxShadow: `0 8px 20px -4px ${color}60`,
                      }}
                      className="p-2.5 rounded-xl border border-white/20 backdrop-blur-md flex items-center justify-between text-white transition-all hover:translate-x-2 cursor-pointer"
                    >
                      <div className="flex flex-col text-left truncate">
                        <span className="text-[11px] font-bold truncate drop-shadow-sm">{item.garment.title}</span>
                        <span className="text-[9px] text-white/80 uppercase font-mono">
                          {item.garment.primaryCategory} · {item.state}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-black/40 px-2 py-0.5 rounded-md">
                        Z:{item.zIndex}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* 平面列表视图 */
            <div className="space-y-1.5">
              {[...sortedItems].reverse().map((item) => (
                <div
                  key={item.garment.id}
                  className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between hover:border-purple-500/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full border border-slate-700"
                      style={{ backgroundColor: item.garment.colors[0] || '#7c3aed' }}
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-200">{item.garment.title}</span>
                      <span className="text-[10px] text-purple-400">
                        {item.garment.primaryCategory} · 形态: {item.state}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-yellow-400 bg-yellow-950/40 px-2 py-0.5 rounded-lg border border-yellow-800/30">
                    Z: {item.zIndex}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. AI VTON 高清试穿渲染与 Before/After 对比滑块 */}
        <div className="p-4 bg-gradient-to-b from-purple-950/40 to-slate-900/80 rounded-2xl border border-purple-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-yellow-400" /> Diffusion VTON 试穿成片
            </h4>
            <span className="text-[10px] text-yellow-300 font-bold bg-yellow-950/80 px-2 py-0.5 rounded-full border border-yellow-800/40">
              单次消耗 5 积分
            </span>
          </div>

          {/* 渲染进行中：激光扫描动效与进度环 */}
          {isRendering && (
            <div className="relative p-6 bg-slate-950 rounded-xl border border-purple-500/40 overflow-hidden space-y-3">
              {/* 激光扫描束 */}
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-laser-scan shadow-lg shadow-cyan-500/50" />

              <div className="flex items-center justify-between text-xs text-purple-300 font-semibold">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 animate-spin" /> {renderStage}
                </span>
                <span className="font-mono text-yellow-400">{renderProgress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-purple-600 via-indigo-500 to-pink-500 transition-all duration-300"
                  style={{ width: `${renderProgress}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 text-center">
                90s SLA 任务保障，异常将全额原路退还 5 积分
              </p>
            </div>
          )}

          {/* 试穿完成：交互式 Before/After 左右滑动对比器 */}
          {renderedImageUrl && !isRendering && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-300 font-semibold">
                <span className="text-purple-300">2D 拼装原型</span>
                <span className="text-pink-300 font-bold">✨ AI 高清成片</span>
              </div>

              {/* 交互滑块对比器 */}
              <div className="relative w-full h-48 bg-slate-950 rounded-2xl overflow-hidden border border-purple-500/40 select-none">
                {/* 底部：AI 高清成片图 */}
                <div
                  className="absolute inset-0 bg-cover bg-center flex items-center justify-center"
                  style={{
                    backgroundImage: `url(${renderedImageUrl})`,
                    backgroundColor: '#1e1b4b',
                  }}
                >
                  <div className="absolute top-2 right-2 text-[9px] font-bold bg-pink-600 text-white px-2 py-0.5 rounded-full shadow-md">
                    DIFFUSION VTON
                  </div>
                </div>

                {/* 顶部剪裁层：2D 拼装原型效果 */}
                <div
                  className="absolute inset-y-0 left-0 overflow-hidden bg-slate-900 border-r-2 border-white shadow-2xl"
                  style={{ width: `${sliderPosition}%` }}
                >
                  <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-[radial-gradient(#a855f7_1px,transparent_1px)] [background-size:12px_12px] opacity-90">
                    <span className="text-[10px] text-purple-300 font-bold bg-slate-950/80 px-2 py-0.5 rounded">
                      2D 原型画布
                    </span>
                  </div>
                </div>

                {/* 滑块拖拽手柄 */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sliderPosition}
                  onChange={(e) => setSliderPosition(Number(e.target.value))}
                  className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full z-30"
                />

                <div
                  className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-2xl pointer-events-none z-20"
                  style={{ left: `calc(${sliderPosition}% - 12px)` }}
                >
                  <SplitSquareVertical className="w-3.5 h-3.5" />
                </div>
              </div>

              <a
                href={renderedImageUrl}
                download="vton_outfit_hd.png"
                target="_blank"
                rel="noreferrer"
                className="w-full py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-md shadow-pink-600/30 flex items-center justify-center gap-1.5 transition-all"
              >
                <Eye className="w-3.5 h-3.5" /> 下载高清成片并分享
              </a>
            </div>
          )}

          {/* 触发试穿按钮 */}
          {!isRendering && (
            <button
              onClick={onRenderVton}
              disabled={wornItems.length === 0 || dailyCredits < 5}
              className="w-full py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
              一键生成 AI 高清试穿照 (-5 积分)
            </button>
          )}
        </div>

        {/* 3. 保存搭配与好友互动 */}
        <div className="space-y-3">
          <form onSubmit={handleSave} className="space-y-2">
            <input
              type="text"
              value={outfitTitle}
              onChange={(e) => setOutfitTitle(e.target.value)}
              placeholder="为这套搭配命名 (如: 早秋复古叠穿)"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
            />
            <button
              type="submit"
              disabled={wornItems.length === 0 || !outfitTitle}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
            >
              <Save className="w-3.5 h-3.5" /> 保存至 Lookbook 搭配库
            </button>
          </form>

          <button
            onClick={onSuggestToFriend}
            disabled={wornItems.length === 0}
            className="w-full py-2 bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 font-bold text-xs rounded-xl border border-indigo-800/40 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
          >
            <Send className="w-3.5 h-3.5" /> 帮TA搭配：推给好友小美
          </button>
        </div>
      </div>
    </aside>
  );
};
