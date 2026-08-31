import React, { useState, useRef } from 'react';
import { GarmentItem, GarmentCategory } from '@smart-wardrobe/shared';
import { GarmentDetailDrawer } from '../components/GarmentDetailDrawer';
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
  ChevronUp,
  ChevronDown,
  Eye,
  Trash2,
} from 'lucide-react';

interface WardrobeGalleryViewProps {
  garments: GarmentItem[];
  publicGarments: GarmentItem[];
  wornGarmentIds: string[];
  onWearGarment: (garment: GarmentItem) => void;
  onClonePublicGarment: (publicGarmentId: string) => void;
  onUploadGarmentWithFile: (file: File, title: string, category: GarmentCategory) => void;
  onUploadBatchWithFile: (file: File) => void;
  onNavigateToStudio: () => void;
  onDeleteGarment?: (garmentId: string) => void;
  onNavigateToSlotMachine?: () => void;
}

export const WardrobeGalleryView: React.FC<WardrobeGalleryViewProps> = ({
  garments,
  publicGarments,
  wornGarmentIds,
  onWearGarment,
  onClonePublicGarment,
  onUploadGarmentWithFile,
  onUploadBatchWithFile,
  onNavigateToStudio,
  onDeleteGarment,
}) => {
  const [selectedGarmentForDrawer, setSelectedGarmentForDrawer] = useState<GarmentItem | null>(null);
  const [isBannerCollapsed, setIsBannerCollapsed] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [tabType, setTabType] = useState<'PRIVATE' | 'PUBLIC'>('PRIVATE');
  const [searchQuery, setSearchQuery] = useState('');

  // 单件上传弹窗状态
  const [isSingleUploadModal, setIsSingleUploadModal] = useState(false);
  const [singlePreview, setSinglePreview] = useState<string | null>(null);
  const [singleTitle, setSingleTitle] = useState('');
  const [singleCategory, setSingleCategory] = useState<GarmentCategory>('TOPS');
  const [singleFile, setSingleFile] = useState<File | null>(null);

  // 一拍多衣（多单品分割）弹窗状态
  const [isBatchModal, setIsBatchModal] = useState(false);
  const [batchFile, setBatchFile] = useState<File | null>(null);
  const [batchPreview, setBatchPreview] = useState<string | null>(null);
  const [batchItems, setBatchItems] = useState<
    { id: string; title: string; category: GarmentCategory; colorName: string; colorHex: string; isChecked: boolean }[]
  >([]);
  const [batchMessage, setBatchMessage] = useState('');
  const [batchCostCredits, setBatchCostCredits] = useState(2);

  const singleInputRef = useRef<HTMLInputElement>(null);
  const batchInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    { key: 'ALL', label: '全部单品' },
    { key: 'TOPS', label: '上装' },
    { key: 'BOTTOMS', label: '下装' },
    { key: 'OUTERWEAR', label: '外套' },
    { key: 'FOOTWEAR', label: '鞋履' },
    { key: 'ACCESSORIES', label: '配饰' },
  ];

  const currentList = tabType === 'PRIVATE' ? garments : publicGarments;

  const filtered = currentList.filter((g) => {
    const matchCategory = activeCategory === 'ALL' || g.primaryCategory === activeCategory;
    const matchSearch = !searchQuery || g.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  // 单件上传处理
  const handleSingleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSingleFile(file);
      setSingleTitle(file.name.replace(/\.[^/.]+$/, ''));
      const reader = new FileReader();
      reader.onload = () => {
        setSinglePreview(reader.result as string);
        setIsSingleUploadModal(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirmSingleUpload = () => {
    if (singleFile) {
      onUploadGarmentWithFile(singleFile, singleTitle || '我的新单品', singleCategory);
      setIsSingleUploadModal(false);
      setSinglePreview(null);
      setSingleFile(null);
    }
  };

  // [V2.5] 一拍多衣处理 (单照多品类全自动识别)
  const handleBatchFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBatchFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setBatchPreview(reader.result as string);
        // 模拟智能多目标检测分割出 3 件单品
        const detected = [
          {
            id: 'b1',
            title: '法式米杏色小香风西装外套',
            category: 'OUTERWEAR' as GarmentCategory,
            colorName: '米杏色',
            colorHex: '#D7CCC8',
            isChecked: true,
          },
          {
            id: 'b2',
            title: '简约字母印花纯棉短袖T恤',
            category: 'TOPS' as GarmentCategory,
            colorName: '纯白',
            colorHex: '#FFFFFF',
            isChecked: true,
          },
          {
            id: 'b3',
            title: '复古高腰水洗直筒牛仔裤',
            category: 'BOTTOMS' as GarmentCategory,
            colorName: '丹宁蓝',
            colorHex: '#5C6BC0',
            isChecked: true,
          },
        ];
        setBatchItems(detected);
        setBatchCostCredits(2);
        setBatchMessage('一次性智能捕获了 3 件心动单品，已享打包优惠（仅消耗 2 积分）～');
        setIsBatchModal(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirmBatchUpload = () => {
    if (batchFile) {
      onUploadBatchWithFile(batchFile);
      setIsBatchModal(false);
      setBatchPreview(null);
      setBatchFile(null);
    }
  };

  const toggleBatchCheck = (id: string) => {
    setBatchItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isChecked: !item.isChecked } : item))
    );
  };

  const updateBatchItemTitle = (id: string, newTitle: string) => {
    setBatchItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, title: newTitle } : item))
    );
  };

  return (
    <div className="h-full overflow-y-auto bg-[#FAF8F5] p-6 space-y-6 scrollbar-thin text-left">
      <div className="max-w-7xl mx-auto space-y-6">
      {/* 隐藏的文件选择器 */}
      <input
        ref={singleInputRef}
        type="file"
        accept="image/*"
        onChange={handleSingleFileChange}
        className="hidden"
      />
      <input
        ref={batchInputRef}
        type="file"
        accept="image/*"
        onChange={handleBatchFileChange}
        className="hidden"
      />

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

        {/* 中间：[V2.5 核心] 一拍多衣全自动智能分割大卡片 (占 4 列) */}
        <div
          onClick={() => batchInputRef.current?.click()}
          className="lg:col-span-4 group cursor-pointer bg-gradient-to-br from-amber-50/90 via-rose-50/70 to-pink-50/90 border-2 border-dashed border-amber-300 hover:border-amber-400 rounded-[32px] p-6 shadow-xs hover:shadow-md transition-all flex flex-col items-center justify-center text-center space-y-2.5"
        >
          <div className="w-13 h-13 rounded-2xl bg-amber-400/20 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-all shadow-xs">
            <Camera className="w-7 h-7" />
          </div>
          <div>
            <span className="text-sm font-extrabold text-stone-800 block group-hover:text-amber-700 transition-colors">
               一拍多衣（整身/平铺一次搞定）
            </span>
            <p className="text-[11px] text-stone-500 mt-0.5">
              拍全身穿搭或多件衣服 · AI 自动分割上衣/裤子/外套
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100/90 px-3 py-1 rounded-full border border-amber-200">
            <Sparkles className="w-3 h-3 text-amber-600" /> 多单品打包识别 (仅消耗 2 积分)
          </span>
        </div>

        {/* 右侧：单件精准拍照上传入口 (占 3 列) */}
        <div
          onClick={() => singleInputRef.current?.click()}
          className="lg:col-span-3 group cursor-pointer bg-white/90 border-2 border-dashed border-rose-200 hover:border-rose-400 hover:bg-rose-50/30 rounded-[32px] p-6 shadow-xs hover:shadow-md transition-all flex flex-col items-center justify-center text-center space-y-2.5"
        >
          <div className="w-13 h-13 rounded-2xl bg-rose-100 text-rose-500 flex items-center justify-center group-hover:scale-110 transition-all shadow-xs">
            <UploadCloud className="w-7 h-7" />
          </div>
          <div>
            <span className="text-sm font-extrabold text-stone-800 block group-hover:text-rose-500 transition-colors">
               单件精细录入
            </span>
            <p className="text-[11px] text-stone-400 mt-0.5">
              单件衣服特写 · 生成敞开/合拢切片
            </p>
          </div>
          <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2.5 py-0.5 rounded-full">
            消耗 1 积分 / 件
          </span>
        </div>
      </div>

      {/* 2. 分类筛选与搜索工具栏 */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white/80 p-3 rounded-2xl border border-[#EAE6DF]/70 shadow-xs">
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 no-scrollbar">
          {categories.map((c) => (
            <button
              key={c.key}
              onClick={() => setActiveCategory(c.key)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeCategory === c.key
                  ? 'bg-[#2D3436] text-white shadow-xs'
                  : 'bg-[#FAF8F5] border border-[#EAE6DF] hover:bg-stone-100 text-stone-600'
              }`}
            >
              <span>{c.label}</span>
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索衣服名称、颜色或品牌..."
            className="w-full bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl pl-9 pr-3 py-1.5 text-xs text-stone-800 focus:outline-none focus:border-rose-400"
          />
        </div>
      </div>

      {/* 3. 服装单品网格瀑布流 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-extrabold text-stone-800 uppercase tracking-wide">
            {tabType === 'PRIVATE' ? '我的私有衣橱' : '官方公共衣柜'} ({filtered.length})
          </h3>
          <span className="text-xs text-stone-400">点击【穿上试衣】即可直接上身</span>
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

              return (
                <div
                  key={item.id}
                  className={`group relative bg-white rounded-[24px] border p-3 flex flex-col justify-between transition-all hover:shadow-lg ${
                    isWorn
                      ? 'border-rose-400 shadow-md shadow-rose-100 ring-2 ring-rose-300/60'
                      : 'border-[#EAE6DF]/80 hover:border-rose-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                      {item.primaryCategory}
                    </span>
                    <div
                      className="w-3.5 h-3.5 rounded-full border border-white shadow-xs"
                      style={{ backgroundColor: primaryColor }}
                      title={`主色调: ${primaryColor}`}
                    />
                  </div>

                  <div onClick={() => setSelectedGarmentForDrawer(item)} className="h-32 rounded-2xl bg-[#FAF8F5] flex items-center justify-center p-2 mb-2 relative overflow-hidden border border-[#EAE6DF] cursor-pointer hover:border-stone-400 transition-colors" title="点击查看单品 360° 档案详情">
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
                      <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-emerald-500 text-white text-[9px] font-bold flex items-center gap-0.5 shadow-xs">
                        <Check className="w-2.5 h-2.5" /> 穿戴中
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 text-left mb-3">
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
                        className="w-full py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors"
                      >
                        <Copy className="w-3 h-3" /> 克隆到我的衣橱
                      </button>
                    ) : (
                      <button
                        onClick={() => onWearGarment(item)}
                        className={`w-full py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                          isWorn
                            ? 'bg-rose-100 text-rose-600 hover:bg-rose-200'
                            : 'bg-gradient-to-r from-rose-400 to-pink-400 hover:from-rose-500 hover:to-pink-500 text-white shadow-xs'
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

      {/* 4. [V2.5 核心] 一拍多衣多单品清单确认弹窗 */}
      {isBatchModal && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-rose-100 rounded-[36px] p-6 max-w-lg w-full shadow-2xl space-y-4 text-left animate-float-soft">
            <div className="space-y-1 border-b border-[#EAE6DF]/60 pb-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-stone-800 flex items-center gap-1.5">
                  <Sparkles className="w-5 h-5 text-amber-500 fill-amber-500" />
                  一拍多衣 · 智能检测与分割
                </h3>
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  优惠打包: -{batchCostCredits} 积分
                </span>
              </div>
              <p className="text-xs text-rose-500 font-medium">{batchMessage}</p>
            </div>

            {/* 识别出的多件单品列表 */}
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {batchItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                    item.isChecked
                      ? 'bg-rose-50/50 border-rose-300'
                      : 'bg-[#FAF8F5]/60 border-[#EAE6DF] opacity-60'
                  }`}
                >
                  <button onClick={() => toggleBatchCheck(item.id)} className="text-rose-500 shrink-0">
                    {item.isChecked ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4 text-stone-400" />
                    )}
                  </button>

                  <div
                    className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-white text-[9px] font-bold shadow-xs"
                    style={{ backgroundColor: item.colorHex }}
                  >
                    {item.category}
                  </div>

                  <div className="flex-1 space-y-0.5">
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => updateBatchItemTitle(item.id, e.target.value)}
                      className="w-full bg-transparent border-b border-transparent focus:border-rose-400 text-xs font-bold text-stone-800 focus:outline-none"
                    />
                    <div className="flex items-center gap-1.5 text-[10px] text-stone-400">
                      <span>类目: {item.category}</span>
                      <span>·</span>
                      <span>主色: {item.colorName}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsBatchModal(false)}
                className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold text-xs rounded-xl transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmBatchUpload}
                className="flex-1 py-2.5 bg-gradient-to-r from-amber-400 via-rose-400 to-pink-500 hover:from-amber-500 hover:to-pink-600 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all"
              >
                <Wand2 className="w-4 h-4" /> 一键将选中的 {batchItems.filter((i) => i.isChecked).length} 件单品全量入库
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. 单件上传确认弹窗 */}
      {isSingleUploadModal && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-rose-100 rounded-[32px] p-6 max-w-md w-full shadow-2xl space-y-4 text-left animate-float-soft">
            <h3 className="text-base font-extrabold text-stone-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-rose-500" /> 单件服装标准化与多态切片
            </h3>

            {singlePreview && (
              <div className="h-40 rounded-2xl bg-[#FAF8F5] border border-[#EAE6DF] flex items-center justify-center overflow-hidden">
                <img src={singlePreview} alt="上传预览" className="h-full object-contain" />
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-stone-600 block mb-1">单品标题</label>
                <input
                  type="text"
                  value={singleTitle}
                  onChange={(e) => setSingleTitle(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl px-3 py-2 text-xs text-stone-800 focus:outline-none focus:border-rose-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-600 block mb-1">所属分类</label>
                <select
                  value={singleCategory}
                  onChange={(e) => setSingleCategory(e.target.value as any)}
                  className="w-full bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl px-3 py-2 text-xs text-stone-800"
                >
                  <option value="TOPS">上装 (Tops)</option>
                  <option value="BOTTOMS">下装 (Bottoms)</option>
                  <option value="OUTERWEAR">外套 (Outerwear - 自动裂变Open/Closed)</option>
                  <option value="FOOTWEAR">鞋履 (Footwear)</option>
                  <option value="ACCESSORIES">配饰 (Accessories)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsSingleUploadModal(false)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold text-xs rounded-xl"
              >
                取消
              </button>
              <button
                onClick={handleConfirmSingleUpload}
                className="flex-1 py-2 bg-gradient-to-r from-rose-400 to-pink-400 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs rounded-xl shadow-md"
              >
                 扣除 1 积分，生成切片入库
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
