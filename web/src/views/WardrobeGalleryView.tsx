import React, { useState, useRef } from 'react';
import { GarmentItem, GarmentCategory } from '@smart-wardrobe/shared';
import { OutfitData } from '../api';
import { InstantOotdPosterModal } from '../components/InstantOotdPosterModal';
import { GarmentDetailDrawer } from '../components/GarmentDetailDrawer';
import { GarmentFilterBar, GarmentFilterState } from '../components/GarmentFilterBar';
import { isGarmentMatchingColor, isGarmentMatchingSubCategory } from '../utils/fashionFilterMatcher';
import { showToast, showConfirm } from '../components/Toast';
import {
  UploadCloud,
  Plus,
  Shirt,
  Sparkles,
  Search,
  Filter,
  Copy,
  Check,
  Tag,
  Scissors,
  Layers,
  Heart,
  Camera,
  CheckSquare,
  Square,
  Edit2,
  Wand2,
  Loader2,
  ChevronUp,
  ChevronDown,
  Eye,
  Trash2,
  BookmarkCheck,
} from 'lucide-react';

interface WardrobeGalleryViewProps {
  garments: GarmentItem[];
  publicGarments: GarmentItem[];
  outfits?: OutfitData[];
  wornGarmentIds: string[];
  onWearGarment: (garment: GarmentItem) => void;
  onClonePublicGarment: (publicGarmentId: string) => void;
  onUploadGarmentWithFile: (file: File, title: string, category: GarmentCategory) => void;
  onUploadBatchWithFile: (file: File) => void;
  onNavigateToStudio: () => void;
  onDeleteGarment?: (garmentId: string) => void;
  onBatchDeleteGarments?: (garmentIds: string[]) => void;
  onNavigateToSlotMachine?: () => void;
  onApplyOutfitToStudio?: (outfit: OutfitData) => void;
  onDeleteOutfit?: (outfitId: string) => void;
}

export const WardrobeGalleryView: React.FC<WardrobeGalleryViewProps> = ({
  garments,
  publicGarments,
  outfits = [],
  wornGarmentIds,
  onWearGarment,
  onClonePublicGarment,
  onUploadGarmentWithFile,
  onUploadBatchWithFile,
  onNavigateToStudio,
  onDeleteGarment,
  onBatchDeleteGarments,
  onApplyOutfitToStudio,
  onDeleteOutfit,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [selectedGarmentForDrawer, setSelectedGarmentForDrawer] = useState<GarmentItem | null>(null);
  const [isBannerCollapsed, setIsBannerCollapsed] = useState(false);
  const [mainTab, setMainTab] = useState<'GARMENTS' | 'LOOKBOOK'>('GARMENTS');
  const [posterOutfit, setPosterOutfit] = useState<OutfitData | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [tabType, setTabType] = useState<'PRIVATE' | 'PUBLIC'>('PRIVATE');

  // 批量管理多选状态
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedGarmentIds, setSelectedGarmentIds] = useState<string[]>([]);

  const [filterState, setFilterState] = useState<GarmentFilterState>({
    category: 'ALL',
    colors: [],
    subCategories: [],
    patterns: [],
    seasons: [],
    occasions: [],
    searchQuery: '',
  });

  // 真实 AI 智能多目标视觉识别与切片解析状态
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectingStageText, setDetectingStageText] = useState('');
  const [detectingPreview, setDetectingPreview] = useState<string | null>(null);

  const unifiedInputRef = useRef<HTMLInputElement>(null);

  const currentList = tabType === 'PRIVATE' ? garments : publicGarments;

  const filtered = currentList.filter((g) => {
    // 1. 一级大类
    if (filterState.category !== 'ALL' && g.primaryCategory !== filterState.category) return false;

    // 2. 颜色筛选 (13 基础色 + 彩色)
    if (filterState.colors.length > 0) {
      const matchColor = filterState.colors.some((cKey) => isGarmentMatchingColor(g, cKey));
      if (!matchColor) return false;
    }

    // 3. 细分款式
    if (filterState.subCategories.length > 0) {
      const matchSub = filterState.subCategories.some((sub) => isGarmentMatchingSubCategory(g, sub));
      if (!matchSub) return false;
    }

    // 4. 花纹图案
    if (filterState.patterns.length > 0) {
      const matchPat = filterState.patterns.some((pat) =>
        g.patterns?.some((p) => p.toUpperCase() === pat || p === pat)
      );
      if (!matchPat) return false;
    }

    // 5. 搜索词综合匹配
    if (filterState.searchQuery.trim()) {
      const q = filterState.searchQuery.trim().toLowerCase();
      const colorNamesText = ((g as any).colorNames || []).join(' ').toLowerCase();
      const matchSearch =
        g.title.toLowerCase().includes(q) ||
        (g.subCategory && g.subCategory.toLowerCase().includes(q)) ||
        (g.material && g.material.toLowerCase().includes(q)) ||
        colorNamesText.includes(q);
      if (!matchSearch) return false;
    }

    return true;
  });

  // 批量模式单品勾选切换
  const toggleSelectItem = (id: string) => {
    setSelectedGarmentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // 全选 / 取消全选 (仅限私有单品)
  const handleToggleSelectAll = () => {
    const selectableIds = filtered.filter((g) => !g.isPublic).map((g) => g.id);
    if (selectedGarmentIds.length === selectableIds.length && selectableIds.length > 0) {
      setSelectedGarmentIds([]);
    } else {
      setSelectedGarmentIds(selectableIds);
    }
  };

  // 执行批量删除确认 (带防误触二次确认)
  const handleConfirmBatchDelete = () => {
    if (selectedGarmentIds.length === 0) return;
    if (
      window.confirm(
        `确定要从您的专属衣橱中批量彻底删除已选中的 ${selectedGarmentIds.length} 件单品吗？\n此操作不可逆。`
      )
    ) {
      if (onBatchDeleteGarments) {
        onBatchDeleteGarments(selectedGarmentIds);
      } else if (onDeleteGarment) {
        selectedGarmentIds.forEach((id) => onDeleteGarment(id));
      }
      setSelectedGarmentIds([]);
      setIsBatchMode(false);
    }
  };

  // [全新统合] 拍照 / 上传衣物（全自动真实 AI 视觉识别与入库）
  const handleUnifiedFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = async () => {
      const result = reader.result as string;
      setDetectingPreview(result);
      setIsDetecting(true);
      setDetectingStageText('正在上传并启动 Gemini 3.8 多模态视觉解析...');

      const timer = setTimeout(() => {
        setDetectingStageText('正在执行服装属性结构化打标与透明平铺素图生成...');
      }, 1200);

      try {
        await onUploadBatchWithFile(file);
      } catch (err: any) {
        console.error('衣橱智能识别入库异常:', err);
      } finally {
        clearTimeout(timer);
        setTimeout(() => {
          setIsDetecting(false);
          setDetectingPreview(null);
        }, 800);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="h-full flex flex-col bg-[#FAF8F5] text-left select-none">
      {/* 隐藏的文件选择器 (单一智能录入入口) */}
      <input
        ref={unifiedInputRef}
        type="file"
        accept="image/*"
        onChange={handleUnifiedFileChange}
        className="hidden"
      />

      {/* 顶栏大视域切换器：作为 Header 下方的独立固定顶栏，实底无缝连接，绝对不会被任何滚动卡片穿透分割 */}
      <div className="shrink-0 z-30 bg-[#FAF8F5] border-b border-[#EAE6DF] px-3.5 sm:px-6 py-2.5 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 bg-[#EFECE6] p-1.5 rounded-2xl border border-[#EAE6DF]">
            <button
              type="button"
              data-testid="tab-garments"
              onClick={() => {
                setMainTab('GARMENTS');
                scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'instant' });
              }}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all ${
                mainTab === 'GARMENTS'
                  ? 'bg-white text-[#D63031] shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Shirt className="w-4 h-4 stroke-[1.75]" />
              <span>衣物单品库 ({garments.length})</span>
            </button>
            <button
              type="button"
              data-testid="tab-lookbook"
              onClick={() => {
                setMainTab('LOOKBOOK');
                scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'instant' });
              }}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all ${
                mainTab === 'LOOKBOOK'
                  ? 'bg-white text-[#D63031] shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <BookmarkCheck className="w-4 h-4 stroke-[1.75]" />
              <span>我的搭配方案 ({outfits.length} 套)</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-stone-500 font-medium">
              {mainTab === 'GARMENTS'
                ? '管理并录入衣橱单件服装与配饰'
                : '已保存的所有整套搭配灵感 · 支持一键回穿与直出海报'}
            </span>
            {mainTab === 'LOOKBOOK' && (
              <button
                onClick={onNavigateToStudio}
                className="px-3.5 py-1.5 bg-[#D63031] hover:bg-[#b02223] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> 去试衣间做新搭配
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 独立的内容滚动区：移动端底部预留 pb-32 (128px)，滚动到最底部时卡片与单品图 100% 完整露出一览无余 */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-3.5 sm:p-6 pb-32 sm:pb-12 space-y-4 sm:space-y-6 scrollbar-thin"
      >
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
          {mainTab === 'GARMENTS' ? (
            <>
              {/* 1. 顶部大横幅：衣橱概览 + [一拍多衣] 与 [单件上传] 双核心入口 */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 左侧：衣橱统计与快速试衣间入口 (占 5 列) */}
        <div className="lg:col-span-5 bg-white/95 p-6 md:p-8 rounded-[28px] border border-[#EAE6DF] shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-[#D63031] text-xs font-bold shadow-xs border border-rose-100">
              <Sparkles className="w-3.5 h-3.5 text-[#D63031]" />
              数字化胶囊衣橱
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-stone-800">
              已有 <span className="text-[#D63031] font-mono">{garments.length}</span> 件心选单品 
            </h2>
            <p className="text-stone-500 text-xs">
              已穿戴 {wornGarmentIds.length} 件单品 · 包含上装、下装、外套多态切片
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <button
              onClick={onNavigateToStudio}
              className="px-5 py-2.5 bg-[#D63031] hover:bg-[#c0392b] text-white text-xs font-bold rounded-2xl shadow-xs flex items-center gap-2 transition-all active:scale-95"
            >
              <Shirt className="w-4 h-4" /> 进入试衣间
            </button>
            <button
              onClick={() => setTabType(tabType === 'PRIVATE' ? 'PUBLIC' : 'PRIVATE')}
              className="px-4 py-2.5 bg-white hover:bg-[#FAF8F5] text-stone-700 text-xs font-bold rounded-2xl border border-[#EAE6DF] shadow-xs transition-colors"
            >
              {tabType === 'PRIVATE' ? '公共单品库' : '我的专属衣橱'}
            </button>
          </div>
        </div>

        {/* 右侧：[全新统合] 拍照 / 上传衣物（AI 智能识别单件或多件） (占 7 列) */}
        <div
          data-testid="unified-upload-btn"
          onClick={() => unifiedInputRef.current?.click()}
          className="lg:col-span-7 group cursor-pointer bg-gradient-to-br from-amber-50/90 via-rose-50/70 to-pink-50/80 border-2 border-dashed border-amber-300 hover:border-[#D63031] rounded-[28px] p-6 md:p-8 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left"
        >
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#D63031] to-amber-500 text-white flex items-center justify-center group-hover:scale-105 transition-all shadow-md shrink-0">
              <Camera className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <h3 className="text-base md:text-lg font-extrabold text-stone-800 group-hover:text-[#D63031] transition-colors">
                  拍照 / 上传衣物
                </h3>
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-200">
                  AI 智能识别件数
                </span>
              </div>
              <p className="text-xs text-stone-500 max-w-md">
                拍单件特写或多件平铺/整身穿搭 · 系统自动识别是一件还是多件，智能扣图提纯切片入库
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center md:items-end gap-1.5 shrink-0">
            <span className="px-4 py-2 bg-[#D63031] hover:bg-[#b02223] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all">
              <UploadCloud className="w-4 h-4" /> 选择图片
            </span>
            <span className="text-[10px] text-stone-400 font-medium">
              单件 1 积分 · 多件打包享 2 积分
            </span>
          </div>
        </div>
      </div>

      {/* 2. 全新多维服装分类与复合筛选工具栏 */}
      <div className="bg-white/90 p-4 rounded-3xl border border-[#EAE6DF] shadow-xs">
        <GarmentFilterBar
          filters={filterState}
          onUpdateFilters={(patch) => setFilterState((prev) => ({ ...prev, ...patch }))}
          onResetFilters={() =>
            setFilterState({
              category: 'ALL',
              colors: [],
              subCategories: [],
              patterns: [],
              seasons: [],
              occasions: [],
              searchQuery: '',
            })
          }
          totalMatches={filtered.length}
          showWearStateFilter={false}
          compactMode={false}
        />
      </div>

      {/* 3. 服装单品网格瀑布流 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-extrabold text-stone-800 uppercase tracking-wide">
              {tabType === 'PRIVATE' ? '我的私有衣橱' : '官方公共衣柜'} ({filtered.length})
            </h3>
            <span className="text-xs text-stone-400 hidden sm:inline">点击卡片可查看 360° 档案详情</span>
          </div>

          {/* 右侧：私有单品批量管理模式切换 */}
          {tabType === 'PRIVATE' && filtered.length > 0 && (
            <div className="flex items-center gap-2">
              {isBatchMode ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsBatchMode(false);
                    setSelectedGarmentIds([]);
                  }}
                  className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
                >
                  退出管理
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsBatchMode(true)}
                  className="px-3 py-1 bg-white hover:bg-stone-50 text-stone-700 rounded-xl text-xs font-bold border border-[#EAE6DF] shadow-2xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-stone-500" />
                  <span>批量管理</span>
                </button>
              )}
            </div>
          )}
        </div>

                {isUploading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={'sk-' + i} className="bg-white rounded-[24px] border border-[#EAE6DF] p-3 space-y-3 animate-pulse">
                <div className="h-4 bg-stone-200 rounded-full w-1/3" />
                <div className="h-32 bg-stone-200/70 rounded-2xl" />
                <div className="h-4 bg-stone-200 rounded-full w-2/3" />
                <div className="h-7 bg-stone-200 rounded-xl w-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white/60 rounded-[32px] border border-[#EAE6DF] space-y-3">
            <span className="text-4xl"></span>
            <p className="text-stone-500 text-xs">暂无此分类单品，快去点击上方上传你的衣服吧！</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filtered.map((item) => {
              const isWorn = wornGarmentIds.includes(item.id);
              const primaryColor = item.colors[0] || '#f43f5e';
              const isSelected = selectedGarmentIds.includes(item.id);
              const isPrivate = tabType === 'PRIVATE' && !item.isPublic;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (isBatchMode && isPrivate) {
                      toggleSelectItem(item.id);
                    }
                  }}
                  className={`group relative bg-white rounded-[24px] border p-3 flex flex-col justify-between transition-all hover:shadow-lg ${
                    isBatchMode && isPrivate ? 'cursor-pointer select-none' : ''
                  } ${
                    isBatchMode && isSelected
                      ? 'border-[#D63031] ring-2 ring-[#D63031]/30 bg-rose-50/20'
                      : isWorn
                      ? 'border-rose-400 shadow-md shadow-rose-100 ring-2 ring-rose-300/60'
                      : 'border-[#EAE6DF]/80 hover:border-rose-300'
                  }`}
                >
                  {/* 批量多选复选框 */}
                  {isBatchMode && isPrivate && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectItem(item.id);
                      }}
                      className="absolute top-3 left-3 z-10 w-6 h-6 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-xs"
                    >
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-lg bg-[#D63031] text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-lg border-2 border-stone-300 bg-white/90" />
                      )}
                    </div>
                  )}

                  <div className={`flex items-center justify-between mb-2 ${isBatchMode && isPrivate ? 'pl-7' : ''}`}>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                      {item.primaryCategory}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {/* 私有单品快捷删除图标 (仅非批量模式下展示) */}
                      {!isBatchMode && isPrivate && onDeleteGarment && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`确定要彻底删除私有单品「${item.title}」吗？\n删除后将无法恢复。`)) {
                              onDeleteGarment(item.id);
                            }
                          }}
                          className="p-1 rounded-lg text-stone-300 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="删除此私有单品"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <div
                        className="w-3.5 h-3.5 rounded-full border border-white shadow-xs"
                        style={{ backgroundColor: primaryColor }}
                        title={`主色调: ${primaryColor}`}
                      />
                    </div>
                  </div>

                  {/* 图片展示区域：点击唤出 360° 档案抽屉 */}
                  <div
                    onClick={(e) => {
                      if (isBatchMode && isPrivate) {
                        return;
                      }
                      e.stopPropagation();
                      setSelectedGarmentForDrawer(item);
                    }}
                    className="h-32 rounded-2xl bg-[#FAF8F5] flex items-center justify-center p-2 mb-2 relative overflow-hidden border border-[#EAE6DF] cursor-pointer hover:border-stone-400 transition-colors group/img"
                    title="点击查看单品 360° 档案详情"
                  >
                    {/* 左上角档案详情微标 [ ⓘ ] */}
                    <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-white/90 backdrop-blur-xs border border-[#EAE6DF] flex items-center justify-center text-stone-400 group-hover/img:text-blue-600 shadow-2xs z-10 transition-colors">
                      <span className="text-[10px] font-serif font-bold">i</span>
                    </div>

                    {item.assets?.[0]?.pngUrl ? (
                      <img
                        src={item.assets[0].pngUrl}
                        alt={item.title}
                        className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
                        onError={(e) => {
                          const color = item.colors?.[0] || '#D63031';
                          const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="${encodeURIComponent(color)}"><rect width="100" height="100" fill="#FAF8F5" rx="16"/><path d="M30 20 L70 20 L85 40 L70 45 L70 85 L30 85 L30 45 L15 40 Z" opacity="0.85"/></svg>`;
                          (e.target as HTMLImageElement).src = `data:image/svg+xml;utf8,${svg}`;
                        }}
                      />
                    ) : (
                      <div
                        className="w-16 h-20 rounded-xl flex items-center justify-center text-white text-xs font-extrabold shadow-md transition-transform group-hover:scale-105"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {item.subCategory || '单品'}
                      </div>
                    )}

                    {isWorn && (
                      <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-emerald-500 text-white text-[9px] font-bold flex items-center gap-0.5 shadow-xs z-10">
                        <Check className="w-2.5 h-2.5" /> 穿戴中
                      </div>
                    )}
                  </div>

                  {/* 标题：点击也支持查看档案 */}
                  <div
                    onClick={(e) => {
                      if (!isBatchMode) {
                        e.stopPropagation();
                        setSelectedGarmentForDrawer(item);
                      }
                    }}
                    className={`space-y-1 text-left mb-3 ${!isBatchMode ? 'cursor-pointer' : ''}`}
                  >
                    <h4 className="text-xs font-bold text-stone-800 line-clamp-1 group-hover:text-rose-500 transition-colors">
                      {item.title}
                    </h4>
                    <div className="flex items-center gap-1 flex-wrap">
                      {item.assets.map((a) => (
                        <span
                          key={a.stateType}
                          className="text-[8px] font-mono font-bold text-amber-700 bg-amber-50 px-1 py-0.5 rounded border border-amber-200/60"
                        >
                          {a.stateType}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    {tabType === 'PUBLIC' ? (
                      <button
                        onClick={() => onClonePublicGarment(item.id)}
                        className="w-full py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <Copy className="w-3 h-3" /> 克隆到我的衣橱
                      </button>
                    ) : (
                      <button
                        disabled={isBatchMode}
                        onClick={(e) => {
                          e.stopPropagation();
                          onWearGarment(item);
                        }}
                        className={`w-full py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                          isBatchMode
                            ? 'bg-stone-100 text-stone-400 opacity-60 cursor-not-allowed'
                            : isWorn
                            ? 'bg-rose-100 text-rose-600 hover:bg-rose-200 cursor-pointer'
                            : 'bg-gradient-to-r from-rose-400 to-pink-400 hover:from-rose-500 hover:to-pink-500 text-white shadow-xs cursor-pointer'
                        }`}
                      >
                        <Shirt className="w-3 h-3" />
                        {isWorn ? '已穿上 (点击脱下)' : '穿上试衣'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 批量管理模式底部吸底悬浮操作栏 */}
      {isBatchMode && tabType === 'PRIVATE' && (
        <div className="fixed bottom-20 md:bottom-6 inset-x-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:min-w-[460px] z-50 bg-stone-900/95 backdrop-blur-xl border border-stone-700/80 rounded-2xl shadow-2xl p-3 flex items-center justify-between gap-4 text-white animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold font-mono">
              已选 <span className="text-[#E17055] font-extrabold text-sm">{selectedGarmentIds.length}</span> / {filtered.filter((g) => !g.isPublic).length} 件
            </span>
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              {selectedGarmentIds.length === filtered.filter((g) => !g.isPublic).length && filtered.length > 0
                ? '取消全选'
                : '全选'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={selectedGarmentIds.length === 0}
              onClick={handleConfirmBatchDelete}
              className="px-3.5 py-1.5 bg-[#D63031] hover:bg-[#b02223] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>批量删除 ({selectedGarmentIds.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsBatchMode(false);
                setSelectedGarmentIds([]);
              }}
              className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              完成
            </button>
          </div>
        </div>
      )}
        </>
      ) : (
        /* 我的搭配方案 (Lookbook) 网格视图 */
        <div className="space-y-6">
          {outfits.length === 0 ? (
            <div className="text-center py-20 bg-white/70 rounded-[32px] border border-[#EAE6DF] space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
                <BookmarkCheck className="w-8 h-8 stroke-[1.5]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-stone-800">暂无保存的搭配方案</h3>
                <p className="text-xs text-stone-500 max-w-md mx-auto">
                  在试衣间自由穿搭服装后，点击右侧悬浮坞的【保存搭配】，即可永久珍藏至此，随时一键穿戴与直出 2K 高清海报！
                </p>
              </div>
              <button
                onClick={onNavigateToStudio}
                className="px-5 py-2.5 bg-[#D63031] hover:bg-[#b02223] text-white text-xs font-bold rounded-2xl shadow-xs inline-flex items-center gap-2 transition-all"
              >
                <Shirt className="w-4 h-4" /> 前往试衣间搭配
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {outfits.map((outfit) => {
                const allList = [...garments, ...publicGarments];
                const outfitGarments = (outfit.items || [])
                  .map((it) => allList.find((g) => g.id === it.garmentId))
                  .filter(Boolean) as GarmentItem[];

                return (
                  <div
                    key={outfit.id}
                    data-testid="lookbook-card"
                    className="bg-white rounded-3xl border border-[#EAE6DF] shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group p-3.5"
                  >
                    {/* 搭配封面写真/单品拼图 */}
                    <div className="relative aspect-3/4 rounded-2xl bg-[#FAF8F5] overflow-hidden mb-3 border border-[#EAE6DF]/80 flex items-center justify-center">
                      {outfit.previewImageUrl ? (
                        <img
                          src={outfit.previewImageUrl}
                          alt={outfit.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="grid grid-cols-2 gap-1.5 w-full h-full p-2 bg-[#FAF8F5]">
                          {outfitGarments.slice(0, 4).map((g, gIdx) => (
                            <div
                              key={g.id || gIdx}
                              className="bg-white rounded-xl p-1.5 flex items-center justify-center border border-stone-200/60"
                            >
                              <img
                                src={g.assets?.[0]?.pngUrl}
                                alt={g.title}
                                className="max-h-full max-w-full object-contain"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 场景标签徽章 */}
                      <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-[10px] font-bold">
                        {outfit.sceneTag || '日常休闲'}
                      </div>

                      {/* 单品数徽章 */}
                      <div className="absolute top-2.5 right-2.5 bg-white/95 backdrop-blur-md text-stone-800 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-xs">
                        {outfit.items?.length || 0} 件单品
                      </div>
                    </div>

                    {/* 标题与日期 */}
                    <div className="space-y-1.5 mb-3 px-1">
                      <h4
                        className="text-sm font-black text-stone-900 line-clamp-1 group-hover:text-[#D63031] transition-colors"
                        title={outfit.title}
                      >
                        {outfit.title}
                      </h4>
                      <div className="flex items-center justify-between text-[11px] text-stone-400 font-mono">
                        <span>{outfit.createdAt?.split('T')[0] || '今日创建'}</span>
                        {outfit.isVtonRendered && (
                          <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                            <Sparkles className="w-3 h-3" /> 已成片
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 包含的单品缩略图走马灯 */}
                    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 mb-3 px-1 border-t border-b border-stone-100">
                      {outfitGarments.map((g, idx) => (
                        <div
                          key={g.id || idx}
                          className="w-8 h-8 rounded-lg bg-stone-50 border border-stone-200 p-0.5 shrink-0"
                          title={g.title}
                        >
                          <img
                            src={g.assets?.[0]?.pngUrl}
                            alt={g.title}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ))}
                    </div>

                    {/* 核心操作按钮 */}
                    <div className="flex items-center gap-2 pt-1 border-t border-stone-100">
                      <button
                        type="button"
                        onClick={() => onApplyOutfitToStudio && onApplyOutfitToStudio(outfit)}
                        className="flex-1 py-2 bg-[#D63031] hover:bg-[#b02223] text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                      >
                        <Shirt className="w-3.5 h-3.5" />
                        <span>装载至试衣间</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPosterOutfit(outfit)}
                        title="直出 2K 高清海报"
                        className="p-2 bg-stone-100 hover:bg-stone-200 text-amber-700 rounded-xl transition-colors shrink-0 cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4" />
                      </button>

                      {onDeleteOutfit && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`确定要删除搭配方案【${outfit.title}】吗？`)) {
                              onDeleteOutfit(outfit.id);
                            }
                          }}
                          title="删除该搭配方案"
                          className="p-2 hover:bg-rose-50 text-stone-400 hover:text-rose-600 rounded-xl transition-colors shrink-0 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. 真实 AI 智能识别与切片解析中反馈弹窗 */}
      {isDetecting && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-in fade-in select-none">
          <div className="bg-white border border-[#EAE6DF] rounded-[32px] p-6 max-w-sm w-full shadow-2xl space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-[#D63031] shadow-xs">
              <Sparkles className="w-7 h-7 animate-spin text-[#D63031]" />
            </div>

            {detectingPreview && (
              <div className="h-44 rounded-2xl bg-[#FAF8F5] border border-[#EAE6DF] flex items-center justify-center overflow-hidden p-2 relative shadow-inner">
                <img src={detectingPreview} alt="解析预览" className="h-full w-full object-contain rounded-xl" />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-900/40 via-transparent to-transparent flex items-end justify-center pb-2">
                  <span className="text-[10px] text-white font-bold bg-stone-900/70 backdrop-blur-xs px-2.5 py-0.5 rounded-full">
                    Gemini 3.8 Flash High 识别中
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-stone-900">
                AI 视觉解构与服装切片生成
              </h3>
              <p className="text-xs text-[#D63031] font-medium animate-pulse">
                {detectingStageText || '正在进行多目标检测与透明底高定资产提纯...'}
              </p>
            </div>

            <div className="pt-2 text-[11px] text-stone-400 font-mono">
              任务已自动接入智能管线 · 任务中心可实时追溯
            </div>
          </div>
        </div>
      )}
 
        </div>
      </div>

      {/* 搭配直出海报弹窗 */}
      {posterOutfit && (
        <InstantOotdPosterModal
          isOpen={true}
          onClose={() => setPosterOutfit(null)}
          renderedImageUrl={posterOutfit.previewImageUrl}
          wornGarments={(posterOutfit.items || [])
            .map((it) => [...garments, ...publicGarments].find((g) => g.id === it.garmentId))
            .filter(Boolean) as GarmentItem[]}
          initialTitle={posterOutfit.title}
          initialScene={posterOutfit.sceneTag}
          existingTitles={(outfits || []).map((o) => o.title)}
        />
      )}

      {/* 5. 单品 360° 档案详情抽屉 (顶级全屏抽屉，无任何父级遮挡) */}
      <GarmentDetailDrawer
        garment={selectedGarmentForDrawer}
        isOpen={Boolean(selectedGarmentForDrawer)}
        isWorn={wornGarmentIds.includes(selectedGarmentForDrawer?.id || '')}
        onClose={() => setSelectedGarmentForDrawer(null)}
        onWearGarment={onWearGarment}
        onCloneGarment={onClonePublicGarment}
        onDeleteGarment={onDeleteGarment}
        onUpdateGarment={(updated) => {
          setSelectedGarmentForDrawer(updated);
        }}
      />
    </div>
  );
};
