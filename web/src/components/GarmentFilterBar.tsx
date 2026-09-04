import React, { useState } from 'react';
import {
  COLOR_PALETTE,
  SUB_CATEGORIES,
  PATTERN_OPTIONS,
  SEASON_OPTIONS,
  OCCASION_OPTIONS,
} from '../utils/fashionFilterMatcher';
import {
  Search,
  Filter,
  X,
  RotateCcw,
  Check,
  ChevronDown,
  Sparkles,
  SlidersHorizontal,
  Shirt,
  Calendar,
} from 'lucide-react';

export interface GarmentFilterState {
  category: string;
  colors: string[];
  subCategories: string[];
  patterns: string[];
  seasons: string[];
  occasions: string[];
  searchQuery: string;
  wearState?: 'ALL' | 'WORN' | 'UNWORN';
}

interface GarmentFilterBarProps {
  filters: GarmentFilterState;
  onUpdateFilters: (newFilters: Partial<GarmentFilterState>) => void;
  onResetFilters: () => void;
  totalMatches?: number;
  showWearStateFilter?: boolean;
  compactMode?: boolean; // 试衣间侧边栏紧凑模式 vs 衣橱全幅模式
  isAdvancedOpen?: boolean; // 外部受控展开高级筛选抽屉
  onToggleAdvanced?: (open: boolean) => void;
}

export const GarmentFilterBar: React.FC<GarmentFilterBarProps> = ({
  filters,
  onUpdateFilters,
  onResetFilters,
  totalMatches,
  showWearStateFilter = false,
  compactMode = false,
  isAdvancedOpen,
  onToggleAdvanced,
}) => {
  const [internalDrawerOpen, setInternalDrawerOpen] = useState(false);
  const isDrawerOpen = isAdvancedOpen !== undefined ? (isAdvancedOpen || internalDrawerOpen) : internalDrawerOpen;

  const handleCloseDrawer = () => {
    setInternalDrawerOpen(false);
    onToggleAdvanced?.(false);
  };

  const handleOpenDrawer = () => {
    setInternalDrawerOpen(true);
    onToggleAdvanced?.(true);
  };

  // 计算激活的高级筛选条件数量（用于角标徽章）
  const activeAdvancedCount =
    filters.colors.length +
    filters.subCategories.length +
    filters.patterns.length +
    filters.seasons.length +
    filters.occasions.length +
    (filters.wearState && filters.wearState !== 'ALL' ? 1 : 0);

  // 类别大标签
  const categories = [
    { key: 'ALL', label: '全部' },
    { key: 'TOPS', label: '上装' },
    { key: 'BOTTOMS', label: '下装' },
    { key: 'OUTERWEAR', label: '外套' },
    { key: 'FOOTWEAR', label: '鞋履' },
    { key: 'ACCESSORIES', label: '配饰' },
  ];

  const handleToggleColor = (key: string) => {
    const next = filters.colors.includes(key)
      ? filters.colors.filter((c) => c !== key)
      : [...filters.colors, key];
    onUpdateFilters({ colors: next });
  };

  const handleToggleSubCategory = (sub: string) => {
    const next = filters.subCategories.includes(sub)
      ? filters.subCategories.filter((s) => s !== sub)
      : [...filters.subCategories, sub];
    onUpdateFilters({ subCategories: next });
  };

  const handleTogglePattern = (pat: string) => {
    const next = filters.patterns.includes(pat)
      ? filters.patterns.filter((p) => p !== pat)
      : [...filters.patterns, pat];
    onUpdateFilters({ patterns: next });
  };

  const handleToggleSeason = (season: string) => {
    const next = filters.seasons.includes(season)
      ? filters.seasons.filter((s) => s !== season)
      : [...filters.seasons, season];
    onUpdateFilters({ seasons: next });
  };

  const handleToggleOccasion = (occ: string) => {
    const next = filters.occasions.includes(occ)
      ? filters.occasions.filter((o) => o !== occ)
      : [...filters.occasions, occ];
    onUpdateFilters({ occasions: next });
  };

  return (
    <div className="w-full space-y-2 select-none">
      {/* ---------------- 第一行：一级大类滑动胶囊 ---------------- */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center gap-1.5 shrink-0">
          {categories.map((cat) => {
            const isSelected = filters.category === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => onUpdateFilters({ category: cat.key })}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isSelected
                    ? 'bg-[#2D3436] text-white shadow-xs'
                    : 'bg-white border border-[#EAE6DF] text-stone-600 hover:border-stone-400 hover:bg-stone-50'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {totalMatches !== undefined && (
          <span className="text-[11px] font-mono text-stone-400 whitespace-nowrap pl-2">
            共 <strong className="text-stone-700 font-bold">{totalMatches}</strong> 件
          </span>
        )}
      </div>

      {/* ---------------- 第二行：搜索 + 常用基础色盘圆点 + 高级筛选呼出按钮 ---------------- */}
      <div className="flex items-center gap-2">
        {/* 快速搜索框 */}
        <div className="relative flex-1 min-w-[120px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
          <input
            type="text"
            placeholder="搜索单品、颜色、面料..."
            value={filters.searchQuery}
            onChange={(e) => onUpdateFilters({ searchQuery: e.target.value })}
            className="w-full pl-8 pr-7 py-1.5 bg-white border border-[#EAE6DF] rounded-xl text-xs text-stone-700 placeholder-stone-400 focus:outline-hidden focus:border-stone-700 transition-colors shadow-2xs"
          />
          {filters.searchQuery && (
            <button
              onClick={() => onUpdateFilters({ searchQuery: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* 基础色盘圆点快速多选条 (13 色 + 彩色) */}
        <div className="hidden sm:flex items-center gap-1 overflow-x-auto py-1 px-1.5 bg-white/80 border border-[#EAE6DF] rounded-xl max-w-[260px] scrollbar-none">
          {COLOR_PALETTE.slice(0, 8).map((pal) => {
            const isSelected = filters.colors.includes(pal.key);
            return (
              <button
                key={pal.key}
                type="button"
                title={`${pal.label}系`}
                onClick={() => handleToggleColor(pal.key)}
                className={`w-4 h-4 rounded-full border transition-all flex items-center justify-center shrink-0 relative ${
                  isSelected
                    ? 'ring-2 ring-[#D63031] ring-offset-1 scale-110 border-stone-800'
                    : 'border-stone-300 hover:scale-105'
                }`}
                style={{
                  background: pal.isGradient ? pal.hex : pal.hex,
                }}
              >
                {isSelected && (
                  <Check
                    className={`w-2.5 h-2.5 stroke-[3] ${
                      pal.key === 'white' || pal.key === 'beige' || pal.key === 'yellow' || pal.key === 'silver'
                        ? 'text-stone-900'
                        : 'text-white'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* 弹出式高级筛选抽屉按钮 */}
        <button
          type="button"
          onClick={handleOpenDrawer}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shrink-0 relative shadow-2xs ${
            activeAdvancedCount > 0
              ? 'bg-rose-50 border-[#D63031] text-[#D63031]'
              : 'bg-white border-[#EAE6DF] text-stone-700 hover:bg-stone-50'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>筛选</span>
          {activeAdvancedCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-[#D63031] text-white text-[10px] flex items-center justify-center font-bold">
              {activeAdvancedCount}
            </span>
          )}
        </button>
      </div>

      {/* ---------------- 激活筛选规则 Chips 气泡栏 ---------------- */}
      {activeAdvancedCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-left">
          {filters.colors.map((cKey) => {
            const pal = COLOR_PALETTE.find((p) => p.key === cKey);
            return (
              <span
                key={cKey}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-stone-300 rounded-lg text-[10px] font-bold text-stone-700 shadow-2xs"
              >
                <span
                  className="w-2 h-2 rounded-full border border-stone-300 shrink-0"
                  style={{ background: pal?.hex }}
                />
                <span>{pal?.label || cKey}</span>
                <button onClick={() => handleToggleColor(cKey)} className="text-stone-400 hover:text-stone-700">
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            );
          })}

          {filters.subCategories.map((sub) => (
            <span
              key={sub}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-stone-100 border border-stone-300 rounded-lg text-[10px] font-bold text-stone-700 shadow-2xs"
            >
              <span>{sub}</span>
              <button onClick={() => handleToggleSubCategory(sub)} className="text-stone-400 hover:text-stone-700">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}

          {filters.seasons.map((season) => {
            const opt = SEASON_OPTIONS.find((s) => s.key === season);
            return (
              <span
                key={season}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-lg text-[10px] font-bold text-amber-800 shadow-2xs"
              >
                <span>{opt?.label || season}</span>
                <button onClick={() => handleToggleSeason(season)} className="text-amber-500 hover:text-amber-800">
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            );
          })}

          {filters.occasions.map((occ) => {
            const opt = OCCASION_OPTIONS.find((o) => o.key === occ);
            return (
              <span
                key={occ}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 border border-indigo-200 rounded-lg text-[10px] font-bold text-indigo-800 shadow-2xs"
              >
                <span>{opt?.label || occ}</span>
                <button onClick={() => handleToggleOccasion(occ)} className="text-indigo-500 hover:text-indigo-800">
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            );
          })}

          {filters.patterns.map((pat) => {
            const opt = PATTERN_OPTIONS.find((p) => p.key === pat);
            return (
              <span
                key={pat}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[10px] font-bold text-emerald-800 shadow-2xs"
              >
                <span>{opt?.label || pat}</span>
                <button onClick={() => handleTogglePattern(pat)} className="text-emerald-500 hover:text-emerald-800">
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            );
          })}

          {filters.wearState && filters.wearState !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 border border-rose-200 rounded-lg text-[10px] font-bold text-[#D63031] shadow-2xs">
              <span>{filters.wearState === 'WORN' ? '仅看已穿' : '仅看未穿'}</span>
              <button
                onClick={() => onUpdateFilters({ wearState: 'ALL' })}
                className="text-rose-400 hover:text-rose-700"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={onResetFilters}
            className="text-[10px] text-stone-400 hover:text-[#D63031] font-bold flex items-center gap-0.5 pl-1"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span>清空全部</span>
          </button>
        </div>
      )}

      {/* ---------------- 弹出式多维复合筛选抽屉 (Filter Drawer) ---------------- */}
      {isDrawerOpen && (
        <div
          onClick={handleCloseDrawer}
          className="fixed inset-0 z-50 bg-stone-950/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm h-full bg-[#FAF8F5] border-l border-[#EAE6DF] shadow-2xl flex flex-col justify-between text-left p-5 space-y-4 overflow-y-auto"
          >
            {/* 抽屉头部 */}
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE6DF]">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-stone-700" />
                <h3 className="font-extrabold text-sm text-stone-800">高级服装多维筛选</h3>
              </div>
              <button
                onClick={handleCloseDrawer}
                className="p-1 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 抽屉内容：多维度组合 */}
            <div className="flex-1 space-y-5 overflow-y-auto pr-1">
              {/* 维度 1: 13 基础色系 + 彩色 */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-stone-700">色彩色系 (多选):</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {COLOR_PALETTE.map((pal) => {
                    const isSelected = filters.colors.includes(pal.key);
                    return (
                      <button
                        key={pal.key}
                        type="button"
                        onClick={() => handleToggleColor(pal.key)}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                            : 'bg-white border-[#EAE6DF] text-stone-700 hover:border-stone-400'
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                          style={{ background: pal.hex }}
                        />
                        <span>{pal.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 维度 2: 细分款式 */}
              <div className="space-y-2 pt-3 border-t border-[#EAE6DF]">
                <span className="text-xs font-bold text-stone-700">细分款式 (多选):</span>
                <div className="flex flex-wrap gap-1.5">
                  {SUB_CATEGORIES.map((sub) => {
                    const isSelected = filters.subCategories.includes(sub);
                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => handleToggleSubCategory(sub)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
                          isSelected
                            ? 'bg-stone-900 text-white border-stone-900 shadow-2xs'
                            : 'bg-white border-[#EAE6DF] text-stone-600 hover:border-stone-400'
                        }`}
                      >
                        {sub}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 维度 3: 穿着季节 */}
              <div className="space-y-2 pt-3 border-t border-[#EAE6DF]">
                <span className="text-xs font-bold text-stone-700">适用季节:</span>
                <div className="flex flex-wrap gap-1.5">
                  {SEASON_OPTIONS.map((season) => {
                    const isSelected = filters.seasons.includes(season.key);
                    return (
                      <button
                        key={season.key}
                        type="button"
                        onClick={() => handleToggleSeason(season.key)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
                          isSelected
                            ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                            : 'bg-white border-[#EAE6DF] text-stone-600 hover:border-stone-400'
                        }`}
                      >
                        {season.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 维度 4: 穿着场合 */}
              <div className="space-y-2 pt-3 border-t border-[#EAE6DF]">
                <span className="text-xs font-bold text-stone-700">穿着场合:</span>
                <div className="flex flex-wrap gap-1.5">
                  {OCCASION_OPTIONS.map((occ) => {
                    const isSelected = filters.occasions.includes(occ.key);
                    return (
                      <button
                        key={occ.key}
                        type="button"
                        onClick={() => handleToggleOccasion(occ.key)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                            : 'bg-white border-[#EAE6DF] text-stone-600 hover:border-stone-400'
                        }`}
                      >
                        {occ.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 维度 5: 面料花纹 */}
              <div className="space-y-2 pt-3 border-t border-[#EAE6DF]">
                <span className="text-xs font-bold text-stone-700">面料图案:</span>
                <div className="flex flex-wrap gap-1.5">
                  {PATTERN_OPTIONS.map((pat) => {
                    const isSelected = filters.patterns.includes(pat.key);
                    return (
                      <button
                        key={pat.key}
                        type="button"
                        onClick={() => handleTogglePattern(pat.key)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
                          isSelected
                            ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                            : 'bg-white border-[#EAE6DF] text-stone-600 hover:border-stone-400'
                        }`}
                      >
                        {pat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 维度 6: 试衣间专属穿戴状态 */}
              {showWearStateFilter && (
                <div className="space-y-2 pt-3 border-t border-[#EAE6DF]">
                  <span className="text-xs font-bold text-stone-700">穿戴状态 (模特舞台):</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { key: 'ALL', label: '全部状态' },
                      { key: 'WORN', label: '已在身上' },
                      { key: 'UNWORN', label: '闲置未穿' },
                    ].map((st) => (
                      <button
                        key={st.key}
                        type="button"
                        onClick={() => onUpdateFilters({ wearState: st.key as any })}
                        className={`py-1.5 rounded-xl text-xs font-bold border transition-all text-center ${
                          (filters.wearState || 'ALL') === st.key
                            ? 'bg-[#2D3436] text-white border-stone-800'
                            : 'bg-white border-[#EAE6DF] text-stone-600 hover:border-stone-400'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 抽屉底部操作条 */}
            <div className="pt-3 border-t border-[#EAE6DF] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onResetFilters}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl text-xs font-bold transition-colors"
              >
                重置筛选
              </button>
              <button
                type="button"
                onClick={handleCloseDrawer}
                className="flex-1 py-2 bg-[#D63031] hover:bg-[#b82829] text-white rounded-xl text-xs font-bold shadow-xs transition-colors text-center"
              >
                确认筛选 {totalMatches !== undefined && `(${totalMatches} 件)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
