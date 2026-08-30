import React, { useState } from 'react';
import { GarmentItem, GarmentCategory } from '@smart-wardrobe/shared';
import {
  Folder,
  Plus,
  Shirt,
  Sparkles,
  Layers,
  Copy,
  Check,
  Tag,
  Palette,
  Search,
  Filter,
} from 'lucide-react';

interface WardrobeDrawerProps {
  garments: GarmentItem[];
  publicGarments: GarmentItem[];
  wornGarmentIds: string[];
  onWearGarment: (garment: GarmentItem) => void;
  onClonePublicGarment: (publicGarmentId: string) => void;
  onUploadGarment: () => void;
}

export const WardrobeDrawer: React.FC<WardrobeDrawerProps> = ({
  garments,
  publicGarments,
  wornGarmentIds,
  onWearGarment,
  onClonePublicGarment,
  onUploadGarment,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [tabType, setTabType] = useState<'PRIVATE' | 'PUBLIC'>('PRIVATE');
  const [searchQuery, setSearchQuery] = useState('');

  const categories: { key: string; label: string; icon: string }[] = [
    { key: 'ALL', label: '全部', icon: '✨' },
    { key: 'TOPS', label: '上装', icon: '👕' },
    { key: 'BOTTOMS', label: '下装', icon: '👖' },
    { key: 'OUTERWEAR', label: '外套', icon: '🧥' },
    { key: 'FOOTWEAR', label: '鞋履', icon: '👟' },
    { key: 'ACCESSORIES', label: '配饰', icon: '👒' },
  ];

  const currentList = tabType === 'PRIVATE' ? garments : publicGarments;

  const filteredGarments = currentList.filter((g) => {
    const matchCategory = activeCategory === 'ALL' || g.primaryCategory === activeCategory;
    const matchSearch = !searchQuery || g.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <aside className="w-80 md:w-96 border-r border-purple-900/30 bg-slate-950/80 backdrop-blur-xl flex flex-col h-full overflow-hidden text-left z-20">
      {/* 顶部 Tab 切换与 AI 上传按钮 */}
      <div className="p-4 border-b border-purple-900/20 space-y-3">
        <div className="flex items-center justify-between">
          {/* 私有 / 公共衣柜切换 */}
          <div className="flex bg-slate-900/90 p-1 rounded-2xl border border-slate-800">
            <button
              onClick={() => setTabType('PRIVATE')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                tabType === 'PRIVATE'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              专属衣橱 ({garments.length})
            </button>
            <button
              onClick={() => setTabType('PUBLIC')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                tabType === 'PUBLIC'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              公共衣柜 ({publicGarments.length})
            </button>
          </div>

          {/* AI 拍照上传入口 */}
          <button
            onClick={onUploadGarment}
            title="拍照上传衣服 (Vision LLM 自动多态切片)"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-600/30 transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            AI 录入
          </button>
        </div>

        {/* 快速搜索框 */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索服装单品、品牌或颜色..."
            className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 placeholder:text-slate-400"
          />
        </div>

        {/* 分类快捷滚动栏 */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((c) => (
            <button
              key={c.key}
              onClick={() => setActiveCategory(c.key)}
              className={`flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === c.key
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/50 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <span>{c.icon}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 单品网格列表 */}
      <div className="flex-1 overflow-y-auto p-3.5">
        {filteredGarments.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs bg-slate-900/30 rounded-3xl border border-slate-800/80">
            暂无符合条件的服装单品
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredGarments.map((garment) => {
              const isWorn = wornGarmentIds.includes(garment.id);
              const primaryColor = garment.colors[0] || '#7c3aed';

              return (
                <div
                  key={garment.id}
                  style={{
                    boxShadow: isWorn ? `0 10px 25px -5px ${primaryColor}40` : undefined,
                  }}
                  className={`group relative rounded-2xl border p-3 flex flex-col justify-between transition-all select-none ${
                    isWorn
                      ? 'bg-purple-950/40 border-purple-500/80 shadow-lg'
                      : 'bg-slate-900/60 border-slate-800/80 hover:border-purple-500/40 hover:bg-slate-900'
                  }`}
                >
                  {/* 单品主色背光环境光 */}
                  <div
                    className="absolute -top-6 -right-6 w-16 h-16 rounded-full opacity-20 filter blur-xl pointer-events-none transition-all group-hover:opacity-40"
                    style={{ backgroundColor: primaryColor }}
                  />

                  {/* 顶部标签 */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-mono text-purple-300 bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-800/30">
                      {garment.primaryCategory}
                    </span>
                    {isWorn && (
                      <span className="flex items-center gap-0.5 text-[9px] text-emerald-300 bg-emerald-950 px-1.5 py-0.5 rounded-full border border-emerald-800/40 font-bold">
                        <Check className="w-2.5 h-2.5" /> 穿戴中
                      </span>
                    )}
                  </div>

                  {/* 切片形态徽章 (Open/Closed/Tucked) */}
                  <div className="mb-2">
                    <div className="text-xs font-bold text-slate-100 line-clamp-1 group-hover:text-purple-300 transition-colors">
                      {garment.title}
                    </div>
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      {garment.assets.map((a) => (
                        <span
                          key={a.stateType}
                          className="text-[8px] font-mono text-yellow-300/80 bg-yellow-950/40 px-1 py-0.5 rounded border border-yellow-800/20"
                        >
                          {a.stateType}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 底部操作组 */}
                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-1.5 mt-auto">
                    {tabType === 'PUBLIC' ? (
                      <button
                        onClick={() => onClonePublicGarment(garment.id)}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-[10px] font-bold transition-all active:scale-95"
                      >
                        <Copy className="w-3 h-3" /> 一键克隆入库
                      </button>
                    ) : (
                      <button
                        onClick={() => onWearGarment(garment)}
                        className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl text-[10px] font-bold transition-all active:scale-95 ${
                          isWorn
                            ? 'bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40'
                            : 'bg-purple-600 hover:bg-purple-500 text-white shadow-xs'
                        }`}
                      >
                        <Shirt className="w-3 h-3" />
                        {isWorn ? '脱下' : '穿上试衣'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};
