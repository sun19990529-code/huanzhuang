import React, { useState, useEffect } from 'react';
import { OutfitData, OotdEntry } from '../api';
import { GarmentItem } from '@smart-wardrobe/shared';
import { extractOutfitColorPalette } from '../utils/fashionFilterMatcher';
import { getSmartWeather } from '../utils/weatherService';
import { showToast } from './Toast';
import {
  Calendar as CalendarIcon,
  X,
  Sparkles,
  Shirt,
  CheckCircle2,
  CloudSun,
  Palette,
  Check,
  Plus,
  ArrowRight,
} from 'lucide-react';

interface LookbookModalProps {
  isOpen: boolean;
  onClose: () => void;
  outfits: OutfitData[];
  ootdLogs: OotdEntry[];
  allGarments: GarmentItem[];
  onApplyOutfit: (outfit: OutfitData) => void;
  onBindOotd: (outfitId: string, date: string, weather: string, notes: string) => void;
}

export const LookbookModal: React.FC<LookbookModalProps> = ({
  isOpen,
  onClose,
  outfits,
  ootdLogs,
  allGarments,
  onApplyOutfit,
  onBindOotd,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [activeTab, setActiveTab] = useState<'CHECKIN' | 'LOOKBOOK'>('CHECKIN');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [weatherTag, setWeatherTag] = useState<string>('晴朗 24°C');
  const [notes, setNotes] = useState<string>('早秋经典叠穿，色调和谐');
  const [selectedOutfitId, setSelectedOutfitId] = useState<string>(outfits[0]?.id || '');

  useEffect(() => {
    getSmartWeather().then((w) => {
      if (w?.weatherTag) setWeatherTag(w.weatherTag);
    });
  }, []);

  if (!isOpen) return null;

  const currentLog = ootdLogs.find((l) => l.logDate === selectedDate);
  const selectedOutfit = outfits.find((o) => o.id === selectedOutfitId) || outfits[0] || null;

  // 提取选中的套装单品与调色盘
  const selectedGarments = (selectedOutfit?.items || [])
    .map((it) => allGarments.find((g) => g.id === it.garmentId))
    .filter(Boolean) as GarmentItem[];
  const colorAnalysis = extractOutfitColorPalette(selectedGarments);

  const handleSaveOotd = () => {
    if (!selectedOutfit) {
      showToast('请先选择要排入的搭配方案', 'info');
      return;
    }
    onBindOotd(selectedOutfit.id, selectedDate, weatherTag, notes);
    showToast(`已成功将【${selectedOutfit.title}】打卡保存至 ${selectedDate} 穿搭日历！`, 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-stone-950/40 backdrop-blur-xs flex items-center justify-center p-4 pb-8 md:pb-4 z-[100] animate-in fade-in">
      <div className="bg-[#FAF8F5] border border-[#EAE6DF] w-full max-w-4xl max-h-[88vh] rounded-3xl p-6 shadow-2xl flex flex-col space-y-4 text-left">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#EAE6DF]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-[#D63031] flex items-center justify-center border border-rose-100 shadow-2xs">
              <CalendarIcon className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-stone-900">
                OOTD 穿搭日历打卡 & Lookbook 搭配库
              </h2>
              <p className="text-[10px] text-stone-400">
                记录每日出街成片、天气气温与真实提取高定色卡
              </p>
            </div>
          </div>

          {/* 切换 Tab */}
          <div className="flex items-center gap-1 bg-[#EFECE6] p-1 rounded-2xl">
            <button
              onClick={() => setActiveTab('CHECKIN')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'CHECKIN'
                  ? 'bg-white text-[#D63031] shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              日历快速打卡
            </button>
            <button
              onClick={() => setActiveTab('LOOKBOOK')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'LOOKBOOK'
                  ? 'bg-white text-[#D63031] shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              搭配方案库 ({outfits.length})
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {activeTab === 'CHECKIN' ? (
            /* Tab 1: 日历打卡排期 */
            <div className="space-y-4">
              {/* 日期选择条 */}
              <div className="p-4 bg-white rounded-2xl border border-[#EAE6DF] space-y-2.5 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <CalendarIcon className="w-4 h-4 text-[#D63031]" />
                    <span>选择打卡/排期日期:</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="px-2.5 py-1 bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl text-xs font-mono font-bold text-stone-800 focus:outline-none focus:border-stone-600"
                    />
                    <button
                      onClick={() => setSelectedDate(todayStr)}
                      className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold"
                    >
                      今日
                    </button>
                  </div>
                </div>

                {/* 真实气象同源展示 */}
                <div className="flex items-center justify-between pt-1 border-t border-stone-100">
                  <div className="flex items-center gap-1.5">
                    <CloudSun className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-[11px] font-bold text-stone-500">实时气象:</span>
                    <span className="text-xs font-bold text-stone-800 bg-[#FAF8F5] border border-[#EAE6DF] px-2 py-0.5 rounded-lg">
                      {weatherTag}
                    </span>
                  </div>
                  <span className="text-[10px] text-stone-400">已同源连通真实气象站</span>
                </div>
              </div>

              {/* 挑选要绑定的搭配套装 */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-stone-700">选择要排入的 Lookbook 搭配方案:</span>
                {outfits.length === 0 ? (
                  <div className="p-8 bg-white rounded-2xl border border-[#EAE6DF] text-center text-xs text-stone-400">
                    暂无保存的搭配方案，可在试衣间搭配好后点击右侧【保存搭配】
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {outfits.map((outfit) => {
                      const isSelected = (selectedOutfit?.id || '') === outfit.id;
                      const gList = (outfit.items || [])
                        .map((it) => allGarments.find((g) => g.id === it.garmentId))
                        .filter(Boolean) as GarmentItem[];
                      const pal = extractOutfitColorPalette(gList);

                      return (
                        <div
                          key={outfit.id}
                          onClick={() => setSelectedOutfitId(outfit.id)}
                          className={`p-3 rounded-2xl border cursor-pointer transition-all duration-200 flex items-center gap-3 relative ${
                            isSelected
                              ? 'bg-white border-[#D63031] ring-2 ring-[#D63031]/20 shadow-md'
                              : 'bg-white/80 border-[#EAE6DF] hover:border-stone-400 hover:bg-white'
                          }`}
                        >
                          <div className="w-14 h-16 bg-[#FAF8F5] rounded-xl border border-[#EAE6DF] shrink-0 p-0.5 flex items-center justify-center overflow-hidden">
                            {outfit.previewImageUrl ? (
                              <img
                                src={outfit.previewImageUrl}
                                alt={outfit.title}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : gList[0]?.assets?.[0]?.pngUrl ? (
                              <img
                                src={gList[0].assets[0].pngUrl}
                                alt={outfit.title}
                                className="max-w-full max-h-full object-contain"
                              />
                            ) : (
                              <Shirt className="w-5 h-5 text-stone-300" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0 space-y-0.5">
                            <h4 className="text-xs font-extrabold text-stone-800 truncate">
                              {outfit.title}
                            </h4>
                            <span className="text-[10px] text-stone-400 block">
                              {outfit.items?.length || 0} 件单品
                            </span>
                            <div className="flex items-center gap-1 pt-0.5">
                              {pal.palette.slice(0, 3).map((p, idx) => (
                                <span
                                  key={idx}
                                  className="w-2 h-2 rounded-full border border-black/10 shrink-0"
                                  style={{ background: p.hex }}
                                />
                              ))}
                              <span className="text-[9px] text-stone-400 pl-0.5 font-mono truncate">
                                {pal.styleTone}
                              </span>
                            </div>
                          </div>

                          {isSelected && (
                            <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#D63031] text-white flex items-center justify-center shadow-xs">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 调色盘与心得填写 */}
              {selectedOutfit && (
                <div className="p-4 bg-white rounded-2xl border border-[#EAE6DF] space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Palette className="w-4 h-4 text-[#D63031]" />
                      <span className="text-xs font-bold text-stone-800">
                        当前搭配动态提取色盘 ({colorAnalysis.styleTone}):
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {colorAnalysis.palette.map((p, idx) => (
                        <span
                          key={idx}
                          title={`${p.name} (${p.hex})`}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-[#EAE6DF] text-[10px] font-bold text-stone-700"
                        >
                          <span className="w-2 h-2 rounded-full" style={{ background: p.hex }} />
                          <span>{p.name}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-stone-500 block mb-1">
                      今日穿搭心得与搭配灵感:
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="记录今日的心情、穿搭场合或配饰细节..."
                      className="w-full px-3 py-1.5 bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl text-xs text-stone-800 focus:outline-none focus:border-stone-600"
                    />
                  </div>
                </div>
              )}

              {/* 提交打卡按钮 */}
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-colors"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSaveOotd}
                  disabled={!selectedOutfit}
                  className="px-6 py-2 bg-[#D63031] hover:bg-[#b82829] text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>完成打卡并排入日历</span>
                </button>
              </div>
            </div>
          ) : (
            /* Tab 2: Lookbook 搭配方案库全景浏览 */
            <div className="space-y-3">
              {outfits.length === 0 ? (
                <div className="text-center py-16 space-y-2 text-stone-400 bg-white rounded-2xl border border-[#EAE6DF]">
                  <Shirt className="w-10 h-10 mx-auto stroke-[1.25] text-stone-300" />
                  <p className="text-xs font-bold">暂无保存的搭配方案</p>
                  <p className="text-[11px]">快去试衣间挑选服装进行 2D/3D 搭配并保存吧！</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {outfits.map((outfit) => {
                    const gList = (outfit.items || [])
                      .map((it) => allGarments.find((g) => g.id === it.garmentId))
                      .filter(Boolean) as GarmentItem[];
                    const pal = extractOutfitColorPalette(gList);

                    return (
                      <div
                        key={outfit.id}
                        className="bg-white rounded-2xl border border-[#EAE6DF] p-3.5 space-y-3 flex flex-col justify-between hover:shadow-md hover:border-stone-400 transition-all duration-200 shadow-2xs"
                      >
                        <div className="space-y-2">
                          <div className="w-full aspect-[3/4] max-h-[180px] bg-[#FAF8F5] rounded-xl border border-[#EAE6DF] p-1 flex items-center justify-center overflow-hidden relative">
                            {outfit.previewImageUrl ? (
                              <img
                                src={outfit.previewImageUrl}
                                alt={outfit.title}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : gList[0]?.assets?.[0]?.pngUrl ? (
                              <img
                                src={gList[0].assets[0].pngUrl}
                                alt={outfit.title}
                                className="max-w-full max-h-full object-contain"
                              />
                            ) : (
                              <Shirt className="w-8 h-8 text-stone-300 stroke-[1.25]" />
                            )}
                            <span className="absolute bottom-1.5 right-1.5 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-xs">
                              {outfit.items?.length || 0} 件单品
                            </span>
                          </div>

                          <div>
                            <h4 className="font-extrabold text-xs text-stone-900 truncate">
                              {outfit.title}
                            </h4>
                            <span className="text-[10px] text-stone-400 font-mono">
                              创建于 {new Date(outfit.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          {/* 调色盘色点 */}
                          <div className="flex items-center gap-1.5 pt-1">
                            {pal.palette.slice(0, 4).map((p, idx) => (
                              <span
                                key={idx}
                                title={`${p.name} ${p.hex}`}
                                className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0"
                                style={{ background: p.hex }}
                              />
                            ))}
                            <span className="text-[10px] font-bold text-stone-500 pl-1">
                              {pal.styleTone}
                            </span>
                          </div>
                        </div>

                        {/* 操作按钮 */}
                        <div className="pt-2 border-t border-stone-100 flex items-center gap-2">
                          <button
                            onClick={() => {
                              onApplyOutfit(outfit);
                              onClose();
                            }}
                            className="flex-1 py-1.5 bg-[#2D3436] hover:bg-black text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
                          >
                            一键上身换装
                          </button>
                          <button
                            onClick={() => {
                              setSelectedOutfitId(outfit.id);
                              setActiveTab('CHECKIN');
                            }}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-[#D63031] rounded-xl text-xs font-bold transition-colors"
                          >
                            排入日历
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
