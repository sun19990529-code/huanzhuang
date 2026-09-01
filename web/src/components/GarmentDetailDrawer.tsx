import React, { useState } from 'react';
import { GarmentItem, GarmentState } from '@smart-wardrobe/shared';
import {
  X,
  Shirt,
  Sparkles,
  Palette,
  Tag,
  Layers,
  Copy,
  Trash2,
  ExternalLink,
  Check,
  Eye,
  Sliders,
} from 'lucide-react';

interface GarmentDetailDrawerProps {
  garment: GarmentItem | null;
  isOpen: boolean;
  isWorn: boolean;
  onClose: () => void;
  onWearGarment: (garment: GarmentItem) => void;
  onCloneGarment?: (garmentId: string) => void;
  onDeleteGarment?: (garmentId: string) => void;
}

export const GarmentDetailDrawer: React.FC<GarmentDetailDrawerProps> = ({
  garment,
  isOpen,
  isWorn,
  onClose,
  onWearGarment,
  onCloneGarment,
  onDeleteGarment,
}) => {
  if (!isOpen || !garment) return null;

  const [activeState, setActiveState] = useState<GarmentState>('DEFAULT');

  // 获取当前状态对应的切片 PNG URL
  const currentAsset = garment.assets.find((a) => a.stateType === activeState) || garment.assets[0];
  const displayImageUrl = currentAsset?.pngUrl || garment.assets[0]?.pngUrl || '';

  const stateLabels: { key: GarmentState; label: string }[] = [
    { key: 'DEFAULT', label: '标准形态' },
    { key: 'TUCKED', label: '内搭塞入' },
    { key: 'OPEN', label: '外套敞开' },
    { key: 'CLOSED', label: '外套合拢' },
    { key: 'UNTUCKED', label: '下摆外放' },
  ];

  // 过滤出单品实际拥有的多态切片
  const availableStates = stateLabels.filter((s) =>
    garment.assets.some((a) => a.stateType === s.key)
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end transition-opacity duration-300 animate-in fade-in">
      <div
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between border-l border-[#EAE6DF] text-left p-6 overflow-y-auto scrollbar-thin animate-in slide-in-from-right duration-300"
      >
        {/* 顶部标题栏 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#D63031] to-[#E17055] flex items-center justify-center text-white shadow-2xs">
                <Shirt className="w-4 h-4 stroke-[1.75]" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-stone-900">单品 360° 档案详情</h3>
                <p className="text-[10px] text-stone-500 font-mono">ID: {garment.id.slice(0, 14)}...</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-500 hover:text-stone-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 高清多态切片大图预览与形态切换 */}
          <div className="bg-[#FAF8F5] rounded-3xl border border-[#EAE6DF] p-4 space-y-3">
            <div className="w-full h-64 flex items-center justify-center relative overflow-hidden rounded-2xl bg-white/70 shadow-inner">
              {displayImageUrl ? (
                <img
                  src={displayImageUrl}
                  alt={garment.title}
                  className="max-h-full max-w-full object-contain drop-shadow-md transition-all duration-300"
                />
              ) : (
                <div className="text-stone-300 text-center space-y-1">
                  <Shirt className="w-8 h-8 mx-auto stroke-[1.5]" />
                  <p className="text-xs">暂无切片</p>
                </div>
              )}

              {/* 状态徽章 */}
              <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-md px-2 py-0.5 rounded-lg border border-[#EAE6DF] text-[9px] font-bold text-stone-600 shadow-2xs">
                {stateLabels.find((s) => s.key === activeState)?.label || '标准'}
              </div>
            </div>

            {/* 多态切片切换胶囊 */}
            {availableStates.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {availableStates.map((st) => (
                  <button
                    key={st.key}
                    onClick={() => setActiveState(st.key)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      activeState === st.key
                        ? 'bg-[#2D3436] text-white shadow-2xs'
                        : 'bg-white border border-[#EAE6DF] text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 属性与多模态特征清单 */}
          <div className="space-y-3">
            <div>
              <h4 className="text-base font-extrabold text-stone-900">{garment.title}</h4>
              <p className="text-xs text-stone-500 font-serif italic mt-0.5">
                {(garment as any).brand || 'SmartWardrobe 精选定制'} · {(garment as any).material || '高品质织物'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-[#FAF8F5] border border-[#EAE6DF] p-2.5 rounded-2xl space-y-0.5">
                <span className="text-[10px] text-stone-500 font-bold block">主要品类</span>
                <span className="font-extrabold text-stone-800">{garment.primaryCategory}</span>
              </div>
              <div className="bg-[#FAF8F5] border border-[#EAE6DF] p-2.5 rounded-2xl space-y-0.5">
                <span className="text-[10px] text-stone-500 font-bold block">次级细分</span>
                <span className="font-extrabold text-stone-800">{garment.subCategory || 'Casual'}</span>
              </div>
            </div>

            {/* 色彩 Hex 调色盘 */}
            <div className="bg-[#FAF8F5] border border-[#EAE6DF] p-3 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-stone-500 flex items-center gap-1">
                  <Palette className="w-3 h-3 text-stone-500" />
                  <span>色彩指纹提取 (PANTONE)</span>
                </span>
                <span className="text-[10px] font-mono text-stone-500 font-bold">
                  {garment.colors.length} 色
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {garment.colors.map((hex, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 bg-white border border-[#EAE6DF] px-2 py-1 rounded-xl shadow-2xs"
                  >
                    <div
                      style={{ backgroundColor: hex }}
                      className="w-3.5 h-3.5 rounded-full border border-stone-300 shadow-2xs"
                    />
                    <span className="text-[10px] font-mono font-bold text-stone-700">{hex}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 权限属性 */}
            <div className="flex items-center justify-between text-xs px-1 text-stone-500">
              <span>衣橱类型: <strong className="text-stone-800">{garment.isPublic ? '公共官方衣橱' : '私人专属衣橱'}</strong></span>
              <span>切片版本: <strong className="font-mono text-stone-800">{garment.assets.length}态</strong></span>
            </div>
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="pt-4 border-t border-stone-100 space-y-2">
          {garment.isPublic ? (
            <button
              onClick={() => {
                if (onCloneGarment) onCloneGarment(garment.id);
                onClose();
              }}
              className="w-full py-2.5 bg-[#2D3436] hover:bg-black text-white rounded-2xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>克隆此单品至我的专属衣橱</span>
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  onWearGarment(garment);
                  onClose();
                }}
                className={`flex-1 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  isWorn
                    ? 'bg-rose-100 text-rose-600 hover:bg-rose-200'
                    : 'bg-[#D63031] hover:bg-[#c0392b] text-white shadow-xs'
                }`}
              >
                <Shirt className="w-3.5 h-3.5" />
                <span>{isWorn ? '已穿戴 (脱下单品)' : '穿戴到模特试衣'}</span>
              </button>

              {onDeleteGarment && (
                <button
                  onClick={() => {
                    if (confirm(`确定要彻底删除单品「${garment.title}」吗？\n此操作将同时从您的专属衣橱和当前试穿中彻底移除。`)) {
                      onDeleteGarment(garment.id);
                      onClose();
                    }
                  }}
                  title="从我的专属衣橱彻底删除"
                  className="px-3.5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border border-red-200/80 rounded-2xl text-xs font-bold transition-all flex items-center gap-1 shadow-2xs"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>删除</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
