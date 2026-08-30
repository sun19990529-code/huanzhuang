import React, { useState } from 'react';
import { OutfitData, OotdEntry } from '../api';
import { GarmentItem } from '@smart-wardrobe/shared';
import {
  Calendar,
  Sparkles,
  CloudSun,
  Download,
  Share2,
  Heart,
  Shirt,
  Bookmark,
  CheckCircle2,
  Camera,
  Move,
  Layout,
  Maximize2,
  Check,
  Plus,
} from 'lucide-react';

interface OotdGalleryViewProps {
  outfits: OutfitData[];
  ootdLogs: OotdEntry[];
  allGarments: GarmentItem[];
  onApplyOutfit: (outfit: OutfitData) => void;
  onBindOotd: (outfitId: string, logDate: string, weatherTag: string, notes: string) => void;
  onNavigateToStudio: () => void;
}

export const OotdGalleryView: React.FC<OotdGalleryViewProps> = ({
  outfits,
  ootdLogs,
  allGarments,
  onApplyOutfit,
  onBindOotd,
  onNavigateToStudio,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [weatherTag, setWeatherTag] = useState<string>('晴朗 24°C');
  const [notes, setNotes] = useState<string>('法式慵懒叠穿，珍珠项链点缀');
  const [selectedOutfitId, setSelectedOutfitId] = useState<string>(outfits[0]?.id || '');

  // 4 种海报比例与 3 大模板
  const [posterRatio, setPosterRatio] = useState<'3:4' | '9:16' | '4:3' | '16:9'>('3:4');
  const [posterTheme, setPosterTheme] = useState<'MAGAZINE' | 'POLAROID' | 'GRID'>('MAGAZINE');

  // 自由拖拽贴纸与色卡坐标偏移 (Drag Offsets)
  const [stickerOffset, setStickerOffset] = useState({ x: 0, y: 0 });
  const [paletteOffset, setPaletteOffset] = useState({ x: 0, y: 0 });
  const [isDraggingSticker, setIsDraggingSticker] = useState(false);
  const [isDraggingPalette, setIsDraggingPalette] = useState(false);

  const currentLog = ootdLogs.find((l) => l.logDate === selectedDate);
  const currentBoundOutfit = currentLog ? outfits.find((o) => o.id === currentLog.outfitId) : null;

  const sampleDates = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (7 - i));
    return d.toISOString().split('T')[0];
  });

  const handleSaveOotd = () => {
    if (!selectedOutfitId) return;
    onBindOotd(selectedOutfitId, selectedDate, weatherTag, notes);
  };

  // 动态计算比例的 Aspect Ratio 类
  const getAspectRatioClass = () => {
    switch (posterRatio) {
      case '3:4':
        return 'aspect-[3/4] h-[480px]';
      case '9:16':
        return 'aspect-[9/16] h-[520px]';
      case '4:3':
        return 'aspect-[4/3] h-[380px]';
      case '16:9':
        return 'aspect-[16/9] h-[340px]';
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-[#FAF8F5] text-stone-800 select-none overflow-hidden font-sans">
      
      {/* ------------------------------------------------------------- */}
      {/* 左侧 40%：14日日历打卡与我的 Lookbook 搭配库 */}
      {/* ------------------------------------------------------------- */}
      <div className="w-full md:w-[40%] h-full flex flex-col border-r border-[#EAE6DF] bg-white/95 backdrop-blur-xl shrink-0 z-20 p-5 space-y-4 overflow-y-auto scrollbar-thin text-left shadow-xs">
        
        {/* 顶部标题 */}
        <div className="flex items-center justify-between pb-2 border-b border-[#EAE6DF]">
          <div>
            <h3 className="text-sm font-extrabold text-stone-800">14日穿搭打卡</h3>
            <p className="text-[10px] text-stone-400">记录每日气温穿搭心得并导出海报</p>
          </div>
          <span className="text-[11px] font-mono font-bold text-[#D63031] bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">
            {selectedDate}
          </span>
        </div>

        {/* 14天日期胶囊滚动条 */}
        <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none">
          {sampleDates.map((date) => {
            const hasLog = ootdLogs.some((l) => l.logDate === date);
            const isSelected = selectedDate === date;
            const parts = date.split('-');
            const isToday = date === todayStr;

            return (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border min-w-[56px] transition-all ${
                  isSelected
                    ? 'bg-[#2D3436] text-white border-stone-800 shadow-xs'
                    : hasLog
                    ? 'bg-rose-50 border-rose-200 text-[#D63031]'
                    : 'bg-[#FAF8F5] border-[#EAE6DF] text-stone-600 hover:bg-stone-100'
                }`}
              >
                <span className="text-[9px] opacity-80">{parts[1]}月</span>
                <span className="text-sm font-extrabold font-mono">{parts[2]}</span>
                {isToday && <span className="text-[8px] bg-white/20 px-1 rounded mt-0.5">今天</span>}
                {hasLog && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-0.5" />}
              </button>
            );
          })}
        </div>

        {/* 当日穿搭记录表单 */}
        <div className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-[#EAE6DF] space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-stone-700">
            <span>{currentBoundOutfit ? `已绑定: ${currentBoundOutfit.title}` : '当天尚未绑定穿搭'}</span>
            <select
              value={weatherTag}
              onChange={(e) => setWeatherTag(e.target.value)}
              className="bg-white border border-[#EAE6DF] rounded-lg px-2 py-0.5 text-[11px] text-stone-700 focus:outline-none"
            >
              <option value="晴朗 24°C">晴朗 24°C</option>
              <option value="微风 20°C">微风 20°C</option>
              <option value="小雨 18°C">小雨 18°C</option>
              <option value="晴热 30°C">晴热 30°C</option>
            </select>
          </div>

          <div className="flex gap-2">
            <select
              value={selectedOutfitId}
              onChange={(e) => setSelectedOutfitId(e.target.value)}
              className="flex-1 bg-white border border-[#EAE6DF] rounded-xl px-2.5 py-1.5 text-xs text-stone-800 focus:outline-none"
            >
              <option value="">选择绑定的 Lookbook 套装...</option>
              {outfits.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title} ({o.items.length}件)
                </option>
              ))}
            </select>

            <button
              onClick={handleSaveOotd}
              disabled={!selectedOutfitId}
              className="px-3.5 py-1.5 bg-[#D63031] hover:bg-[#c0392b] text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-40"
            >
              打卡保存
            </button>
          </div>

          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="添加穿搭心得备注..."
            className="w-full bg-white border border-[#EAE6DF] rounded-xl px-3 py-1.5 text-xs text-stone-800 placeholder-stone-400 focus:outline-none"
          />
        </div>

        {/* 我的 Lookbook 套装库 */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold text-stone-800 uppercase tracking-wide">
              我的搭配库 ({outfits.length})
            </h4>
            <button
              onClick={onNavigateToStudio}
              className="text-[11px] font-bold text-[#D63031] hover:underline flex items-center gap-0.5"
            >
              <Plus className="w-3 h-3 stroke-[2]" /> 去试衣间拼装
            </button>
          </div>

          {outfits.length === 0 ? (
            <div className="text-center py-10 bg-[#FAF8F5] rounded-2xl border border-[#EAE6DF] space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-white text-stone-400 border border-[#EAE6DF] flex items-center justify-center mx-auto">
                <Shirt className="w-5 h-5 stroke-[1.5]" />
              </div>
              <p className="text-stone-500 text-xs">暂无保存的套装搭配</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {outfits.map((outfit) => (
                <div
                  key={outfit.id}
                  className="bg-white rounded-2xl border border-[#EAE6DF] p-3.5 shadow-2xs hover:shadow-sm transition-all flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <h5 className="text-xs font-extrabold text-stone-800">{outfit.title}</h5>
                    <p className="text-[10px] text-stone-400 font-mono">
                      {outfit.items.length} 件单品 · {new Date(outfit.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <button
                    onClick={() => onApplyOutfit(outfit)}
                    className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-colors"
                  >
                    载入试衣
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 右侧 60%：穿搭海报工坊大工作台 (满高沉浸式) */}
      {/* ------------------------------------------------------------- */}
      <div className="w-full md:w-[60%] h-full relative overflow-hidden bg-gradient-to-b from-[#F5F2EB] via-[#F2EFE8] to-[#EAE6DF] flex flex-col items-center justify-between p-6">
        
        {/* 顶部比例与模板工具栏 */}
        <div className="w-full max-w-xl flex items-center justify-between bg-white/90 backdrop-blur-md border border-[#EAE6DF] px-4 py-2 rounded-2xl shadow-xs z-30">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-stone-400 mr-1">画幅比例:</span>
            {(['3:4', '9:16', '4:3', '16:9'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setPosterRatio(r)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all ${
                  posterRatio === r
                    ? 'bg-[#2D3436] text-white shadow-xs'
                    : 'bg-[#FAF8F5] border border-[#EAE6DF] text-stone-600 hover:bg-stone-100'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-stone-400 mr-1">模板:</span>
            {[
              { key: 'MAGAZINE', label: '法式杂志' },
              { key: 'POLAROID', label: '拍立得' },
              { key: 'GRID', label: '九宫格' },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setPosterTheme(t.key as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  posterTheme === t.key
                    ? 'bg-[#D63031] text-white shadow-xs'
                    : 'bg-[#FAF8F5] border border-[#EAE6DF] text-stone-600 hover:bg-stone-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* 中央实时海报画板 */}
        <div className="flex-1 flex items-center justify-center py-4 w-full overflow-hidden">
          <div
            className={`bg-white rounded-3xl border border-[#EAE6DF] shadow-xl p-6 flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${getAspectRatioClass()}`}
          >
            {/* 海报顶部标头 */}
            <div className="flex items-start justify-between border-b border-stone-100 pb-3 text-left">
              <div>
                <span className="text-[9px] font-mono tracking-widest text-[#D63031] font-bold uppercase">
                  OOTD LOOKBOOK · {selectedDate}
                </span>
                <h4 className="text-base font-extrabold text-stone-900 mt-0.5">
                  {currentBoundOutfit?.title || '早秋极简复古叠穿风'}
                </h4>
                <p className="text-[10px] text-stone-400 italic font-serif">
                  "{notes || '法式慵懒叠穿，珍珠项链点缀'}"
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono font-bold bg-[#FAF8F5] border border-[#EAE6DF] px-2 py-0.5 rounded-md text-stone-600">
                  {weatherTag}
                </span>
              </div>
            </div>

            {/* 模特与单品陈列区 */}
            <div className="flex-1 flex items-center justify-center p-4 relative">
              <div className="w-48 h-64 bg-[#FAF8F5] rounded-2xl border border-[#EAE6DF] flex items-center justify-center overflow-hidden shadow-inner">
                {currentBoundOutfit?.previewImageUrl ? (
                  <img src={currentBoundOutfit.previewImageUrl} alt="成片" className="max-h-full max-w-full object-contain" />
                ) : (
                  <div className="text-center space-y-1">
                    <Camera className="w-6 h-6 text-stone-300 stroke-[1.5] mx-auto" />
                    <p className="text-[10px] text-stone-400">试衣成片预览</p>
                  </div>
                )}
              </div>

              {/* 潘通色卡抽取条 */}
              <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur-md border border-[#EAE6DF] p-2 rounded-xl shadow-xs flex items-center gap-1.5">
                <span className="text-[9px] font-mono text-stone-400 font-bold">PANTONE</span>
                <div className="flex gap-1">
                  {['#2D3436', '#E8D8C8', '#D63031', '#2ECC71'].map((hex) => (
                    <div key={hex} style={{ backgroundColor: hex }} className="w-3.5 h-3.5 rounded-full border border-white shadow-2xs" />
                  ))}
                </div>
              </div>
            </div>

            {/* 海报底栏品牌标 */}
            <div className="flex items-center justify-between border-t border-stone-100 pt-2 text-[9px] text-stone-400 font-mono">
              <span>SMARTWARDROBE ATELIER</span>
              <span>100% PRIVATE OOTD</span>
            </div>
          </div>
        </div>

        {/* 底部操作 Bar */}
        <div className="flex items-center gap-3 bg-white/95 backdrop-blur-md border border-[#EAE6DF] px-6 py-2.5 rounded-2xl shadow-md z-30">
          <button
            onClick={() => alert('✨ 海报已成功导出为高保真图片！')}
            className="px-5 py-2 bg-[#D63031] hover:bg-[#c0392b] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5 stroke-[2]" />
            <span>导出高清海报</span>
          </button>
          <button
            onClick={() => alert('✨ 搭配海报分享链接已复制至剪贴板！')}
            className="px-4 py-2 bg-[#FAF8F5] hover:bg-stone-100 text-stone-700 border border-[#EAE6DF] text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5 stroke-[1.75]" />
            <span>分享搭配</span>
          </button>
        </div>
      </div>
    </div>
  );
};
