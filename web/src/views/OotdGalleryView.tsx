import React, { useState, useEffect, useRef } from 'react';
import { OutfitData, OotdEntry } from '../api';
import { GarmentItem } from '@smart-wardrobe/shared';
import {
  getSmartWeather,
  POPULAR_CITIES,
  fetchWeatherByCity,
  resolveCityCoordinates,
  getSavedSelectedCity,
} from '../utils/weatherService';
import {
  extractOutfitColorPalette,
  OutfitColorAnalysis,
} from '../utils/fashionFilterMatcher';
import { generateOotdPosterCanvas, PosterLayoutMode } from '../utils/posterGenerator';
import { showToast, showConfirm } from '../components/Toast';
import {
  Calendar as CalendarIcon,
  Sparkles,
  CloudSun,
  Download,
  Share2,
  Heart,
  Shirt,
  CheckCircle2,
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Trash2,
  Layers,
  Palette,
  Check,
  X,
  Sliders,
  Maximize2,
  MapPin,
} from 'lucide-react';

interface OotdGalleryViewProps {
  outfits: OutfitData[];
  ootdLogs: OotdEntry[];
  allGarments: GarmentItem[];
  onApplyOutfit: (outfit: OutfitData) => void;
  onBindOotd: (outfitId: string, logDate: string, weatherTag: string, notes: string) => void;
  onNavigateToStudio: () => void;
  onDeleteOotd?: (ootdId: string) => void;
}

export const OotdGalleryView: React.FC<OotdGalleryViewProps> = ({
  outfits,
  ootdLogs,
  allGarments,
  onApplyOutfit,
  onBindOotd,
  onNavigateToStudio,
  onDeleteOotd,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [weatherTag, setWeatherTag] = useState<string>('晴朗 24°C');
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);
  const [isWeatherCached, setIsWeatherCached] = useState(false);
  const [isCityPickerOpen, setIsCityPickerOpen] = useState(false);
  const [selectedCityName, setSelectedCityName] = useState<string>(getSavedSelectedCity() || '本地');
  const [customCityInput, setCustomCityInput] = useState('');
  const [citySearchError, setCitySearchError] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>('极简通勤，色彩层次分明');
  const [isNotesEditing, setIsNotesEditing] = useState(false);
  const [posterLayout, setPosterLayout] = useState<PosterLayoutMode>('MIXED');

  // 年月状态（0-indexed month）
  const [currentYearMonth, setCurrentYearMonth] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
  });

  // 弹窗状态：为指定日期“排入/挑选穿搭”
  const [isSchedulePickerOpen, setIsSchedulePickerOpen] = useState(false);
  const [isPosterExporting, setIsPosterExporting] = useState(false);
  const [isPosterSharing, setIsPosterSharing] = useState(false);

  // 自动获取真实天气 (若离线无网自动回退至最后一次真实天气缓存)
  const loadWeather = async (targetCity?: string) => {
    setIsWeatherLoading(true);
    setCitySearchError(null);
    try {
      const cityToFetch = targetCity || selectedCityName;
      const w = cityToFetch && cityToFetch !== 'LOCAL' && cityToFetch !== '本地'
        ? await fetchWeatherByCity(cityToFetch)
        : await getSmartWeather();
      setWeatherTag(w.weatherTag);
      setIsWeatherCached(!!w.isCached);
      if (w.city) setSelectedCityName(w.city);
    } catch (e: any) {
      console.warn('天气获取异常:', e);
      setCitySearchError(e.message || '获取天气失败');
    } finally {
      setIsWeatherLoading(false);
    }
  };

  const handleSelectStandardCity = async (cityName: string) => {
    setIsCityPickerOpen(false);
    await loadWeather(cityName);
    showToast(`已成功切换至【${cityName}】实时气象！`, 'success');
  };

  const handleUseGpsLocation = async () => {
    setIsCityPickerOpen(false);
    setSelectedCityName('本地');
    try {
      localStorage.removeItem('sw_selected_city');
    } catch {}
    await loadWeather('本地');
    showToast('已定位至当地获取实时气象！', 'success');
  };

  const handleSearchCustomCity = async () => {
    if (!customCityInput.trim()) {
      setCitySearchError('请输入城市名称');
      return;
    }
    setIsWeatherLoading(true);
    setCitySearchError(null);
    try {
      const coord = await resolveCityCoordinates(customCityInput.trim());
      setCustomCityInput('');
      setIsCityPickerOpen(false);
      await loadWeather(coord.name);
      showToast(`已成功切换至【${coord.name}】实时气象！`, 'success');
    } catch (err: any) {
      setCitySearchError(err.message || '未找到该城市');
    } finally {
      setIsWeatherLoading(false);
    }
  };

  useEffect(() => {
    loadWeather();
  }, []);

  // 当前选中日期的打卡记录与绑定的套装
  const currentLog = ootdLogs.find((l) => l.logDate === selectedDate);
  const currentBoundOutfit = currentLog
    ? outfits.find((o) => o.id === currentLog.outfitId)
    : null;

  // 当切换日期时，同步 notes 和 weather
  useEffect(() => {
    if (currentLog) {
      if (currentLog.notes) setNotes(currentLog.notes);
      if (currentLog.weatherTag) setWeatherTag(currentLog.weatherTag);
    } else {
      setNotes('记录今日的穿搭心得与搭配灵感...');
    }
  }, [selectedDate, currentLog]);

  // 获取当前绑定的单品对象列表
  const currentGarments = (currentBoundOutfit?.items || [])
    .map((it) => allGarments.find((g) => g.id === it.garmentId))
    .filter(Boolean) as GarmentItem[];

  // 动态提取当前穿搭的【高定调色盘】
  const colorAnalysis: OutfitColorAnalysis = extractOutfitColorPalette(currentGarments);

  // -------------------------------------------------------------
  // 生成月历 7 列网格数据 (周一到周日)
  // -------------------------------------------------------------
  const getMonthDays = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();

    // 0 = Sunday -> 转为 0 = Monday, 6 = Sunday
    let startDayOfWeek = firstDay.getDay();
    const startCol = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    // 上个月补齐
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startCol - 1; i >= 0; i--) {
      const prevDay = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, prevDay);
      const y = prevDate.getFullYear();
      const m = String(prevDate.getMonth() + 1).padStart(2, '0');
      const d = String(prevDay).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      days.push({
        dateStr,
        dayNumber: prevDay,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }

    // 当月天数
    for (let d = 1; d <= totalDays; d++) {
      const y = year;
      const m = String(month + 1).padStart(2, '0');
      const day = String(d).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
      });
    }

    // 下个月补齐（保持 35 或 42 格整齐对齐）
    const remaining = (7 - (days.length % 7)) % 7;
    for (let j = 1; j <= remaining; j++) {
      const nextDate = new Date(year, month + 1, j);
      const y = nextDate.getFullYear();
      const m = String(nextDate.getMonth() + 1).padStart(2, '0');
      const day = String(j).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;
      days.push({
        dateStr,
        dayNumber: j,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }

    return days;
  };

  const monthGridDays = getMonthDays(currentYearMonth.year, currentYearMonth.month);

  // 月份切换控制
  const handlePrevMonth = () => {
    setCurrentYearMonth((prev) => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const handleNextMonth = () => {
    setCurrentYearMonth((prev) => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  const handleGoToday = () => {
    const now = new Date();
    setCurrentYearMonth({ year: now.getFullYear(), month: now.getMonth() });
    setSelectedDate(todayStr);
  };

  // 绑定保存穿搭至当前日期
  const handleSelectOutfitForDate = (outfit: OutfitData) => {
    onBindOotd(outfit.id, selectedDate, weatherTag, notes);
    setIsSchedulePickerOpen(false);
    showToast(`已成功将【${outfit.title}】排入 ${selectedDate} 穿搭日历！`, 'success');
  };

  // 更新心得随笔
  const handleSaveNotes = () => {
    if (!currentBoundOutfit) return;
    onBindOotd(currentBoundOutfit.id, selectedDate, weatherTag, notes);
    setIsNotesEditing(false);
    showToast('穿搭心得已更新保存', 'success');
  };

  // 删除当前日历排期
  const handleDeleteLog = async () => {
    if (!currentLog) return;
    const ok = await showConfirm(
      '移除穿搭排期',
      `确定要清除 ${selectedDate} 的穿搭打卡记录吗？`,
      '确定移除',
      '取消'
    );
    if (ok) {
      if (onDeleteOotd) {
        onDeleteOotd(currentLog.id);
      }
      showToast('该日穿搭打卡记录已移除', 'info');
    }
  };

  // -------------------------------------------------------------
  // 真实 Canvas 高清海报渲染引擎 (调用通用模块，支持 3 种版式)
  // -------------------------------------------------------------
  const generatePosterCanvas = async (): Promise<HTMLCanvasElement> => {
    return generateOotdPosterCanvas({
      layoutMode: posterLayout,
      dateStr: selectedDate,
      title: currentBoundOutfit?.title || '今日定制搭配',
      weatherTag,
      notes,
      previewImageUrl: currentBoundOutfit?.previewImageUrl,
      garments: currentGarments,
    });
  };

  // 导出海报
  const handleExportPoster = async () => {
    if (!currentBoundOutfit) {
      showToast('当前日期尚未排入穿搭，请先安排穿搭后再导出海报', 'info');
      return;
    }
    setIsPosterExporting(true);
    try {
      const canvas = await generatePosterCanvas();
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `OOTD_${selectedDate}_${currentBoundOutfit.title}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast('高清 OOTD 穿搭色卡海报已成功导出下载！', 'success');
    } catch (err: any) {
      showToast(`导出海报失败: ${err.message}`, 'error');
    } finally {
      setIsPosterExporting(false);
    }
  };

  // 分享海报
  const handleSharePoster = async () => {
    if (!currentBoundOutfit) return;
    setIsPosterSharing(true);
    try {
      const canvas = await generatePosterCanvas();
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          if (navigator.clipboard && navigator.clipboard.write) {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            showToast('OOTD 高清海报已复制至剪贴板，可直接在微信/社媒 Ctrl+V 发送！', 'success');
          } else {
            const colorsSummary = colorAnalysis.palette.map((p) => `${p.name}(${p.hex})`).join(' · ');
            const shareText = `今日 OOTD 穿搭：${currentBoundOutfit.title} | ${weatherTag} | 色彩方案：${colorsSummary} | 心得：${notes}`;
            await navigator.clipboard.writeText(shareText);
            showToast('穿搭文案已复制至剪贴板！', 'success');
          }
        } catch (_) {
          const shareText = `今日 OOTD 穿搭：${currentBoundOutfit.title} | ${weatherTag}`;
          await navigator.clipboard.writeText(shareText);
          showToast('穿搭文案已复制至剪贴板！', 'success');
        }
      }, 'image/png');
    } catch (err: any) {
      showToast(`分享失败: ${err.message}`, 'error');
    } finally {
      setIsPosterSharing(false);
    }
  };

  // 计算当月已打卡天数
  const loggedDaysThisMonth = ootdLogs.filter((l) => {
    const parts = l.logDate.split('-');
    return (
      parseInt(parts[0], 10) === currentYearMonth.year &&
      parseInt(parts[1], 10) === currentYearMonth.month + 1
    );
  }).length;

  return (
    <div className="h-full flex flex-col md:flex-row bg-[#FAF8F5] text-stone-800 select-none overflow-y-auto md:overflow-hidden font-sans scrollbar-thin">
      {/* ============================================================= */}
      {/* 左侧 65%：月度穿搭日程全景网格 (Month Grid) */}
      {/* ============================================================= */}
      <div className="w-full md:flex-1 h-auto md:h-full flex flex-col border-r border-[#EAE6DF] bg-white/80 backdrop-blur-xl md:overflow-y-auto p-3 sm:p-6 space-y-2.5 sm:space-y-4 shrink-0">
        {/* 月历顶部导航控制器 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 pb-2 sm:pb-3 border-b border-[#EAE6DF]">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-[#D63031] shadow-2xs shrink-0">
              <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-stone-900">
                  {currentYearMonth.year} 年 {currentYearMonth.month + 1} 月
                </h2>
                <span className="text-[11px] font-bold text-stone-500 bg-stone-100 px-2.5 py-0.5 rounded-full">
                  本月已打卡 {loggedDaysThisMonth} 天
                </span>
              </div>
              <p className="text-[11px] text-stone-400">
                每日试穿大片缩略图与气象归档 · 点击任意日期查看或排期
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={handlePrevMonth}
              title="上一月"
              className="p-1.5 rounded-xl border border-[#EAE6DF] bg-white hover:bg-stone-50 text-stone-600 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleGoToday}
              className="px-3 py-1.5 rounded-xl border border-[#EAE6DF] bg-white hover:bg-stone-50 text-xs font-bold text-stone-700 transition-colors shadow-2xs"
            >
              回到今日
            </button>
            <button
              onClick={handleNextMonth}
              title="下一月"
              className="p-1.5 rounded-xl border border-[#EAE6DF] bg-white hover:bg-stone-50 text-stone-600 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 7 列星期表头 (周一到周日) */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[10px] sm:text-[11px] font-extrabold text-stone-400 py-0.5 sm:py-1">
          {['周一', '周二', '周三', '周四', '周五', '周六', '周日'].map((w, idx) => (
            <div key={w} className={idx >= 5 ? 'text-[#D63031]/80' : ''}>
              {w}
            </div>
          ))}
        </div>

        {/* 月度网格主体 (Month Cells) */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 flex-1 auto-rows-fr">
          {monthGridDays.map((day) => {
            const log = ootdLogs.find((l) => l.logDate === day.dateStr);
            const boundOutfit = log ? outfits.find((o) => o.id === log.outfitId) : null;
            const isSelected = selectedDate === day.dateStr;

            // 提取该日穿搭色系
            const dayGarments = (boundOutfit?.items || [])
              .map((it) => allGarments.find((g) => g.id === it.garmentId))
              .filter(Boolean) as GarmentItem[];
            const dayPalette = extractOutfitColorPalette(dayGarments).palette.slice(0, 3);

            return (
              <div
                key={day.dateStr}
                onClick={() => setSelectedDate(day.dateStr)}
                className={`group relative min-h-[50px] sm:min-h-[118px] p-1 sm:p-2 rounded-xl sm:rounded-2xl border transition-all duration-200 flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-white border-[#D63031] ring-2 ring-[#D63031]/20 shadow-md z-10'
                    : day.isCurrentMonth
                    ? 'bg-[#FAF8F5]/80 hover:bg-white border-[#EAE6DF] hover:border-stone-400 hover:shadow-xs'
                    : 'bg-stone-100/40 border-stone-200/50 opacity-40 hover:opacity-80'
                }`}
              >
                {/* 顶部：日期数字与今日高亮环 */}
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-[10px] sm:text-xs font-mono font-bold flex items-center justify-center ${
                      day.isToday
                        ? 'w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#D63031] text-white shadow-xs'
                        : isSelected
                        ? 'text-[#D63031]'
                        : 'text-stone-700'
                    }`}
                  >
                    {day.dayNumber}
                  </span>

                  {log?.weatherTag && (
                    <span className="text-[9px] font-mono text-stone-400 hidden sm:inline-block truncate max-w-[50px]">
                      {log.weatherTag.split(' ')[0]}
                    </span>
                  )}
                </div>

                {/* 中间：穿搭成片缩略图或空引导 */}
                <div className="flex-1 my-0.5 sm:my-1 flex items-center justify-center overflow-hidden">
                  {boundOutfit ? (
                    <div className="w-full h-full max-h-[36px] sm:max-h-[72px] rounded-lg sm:rounded-xl bg-white border border-[#EAE6DF] p-0.5 flex items-center justify-center overflow-hidden shadow-2xs relative">
                      {boundOutfit.previewImageUrl ? (
                        <img
                          src={boundOutfit.previewImageUrl}
                          alt={boundOutfit.title}
                          className="w-full h-full object-cover rounded-md sm:rounded-lg"
                        />
                      ) : dayGarments[0]?.assets?.[0]?.pngUrl ? (
                        <img
                          src={dayGarments[0].assets[0].pngUrl}
                          alt={boundOutfit.title}
                          className="max-w-full max-h-full object-contain p-0.5 sm:p-1"
                        />
                      ) : (
                        <Shirt className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-stone-300 stroke-[1.5]" />
                      )}

                      {/* 单品数量角标 */}
                      <span className="absolute bottom-0.5 right-0.5 text-[7px] sm:text-[8px] font-bold text-stone-700 bg-white/90 px-0.5 sm:px-1 rounded-sm shadow-2xs">
                        {boundOutfit.items?.length || 0}件
                      </span>
                    </div>
                  ) : (
                    <div className="w-full h-full rounded-lg sm:rounded-xl border border-dashed border-stone-200/80 group-hover:border-stone-400 flex items-center justify-center transition-colors">
                      <span className="text-[9px] sm:text-[10px] text-stone-300 group-hover:text-stone-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline">
                        + 安排
                      </span>
                    </div>
                  )}
                </div>

                {/* 底部：色系微标圆点 */}
                <div className="h-1.5 sm:h-2 flex items-center justify-center gap-0.5 sm:gap-1">
                  {dayPalette.map((pal, pIdx) => (
                    <span
                      key={pIdx}
                      className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full border border-black/10 shrink-0"
                      style={{ background: pal.hex }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============================================================= */}
      {/* 右侧 35%：选中日穿搭手册与高定操作卡 (Day Dossier) */}
      {/* ============================================================= */}
      <div className="w-full md:w-[38%] lg:w-[35%] h-auto md:h-full flex flex-col bg-white border-t md:border-t-0 md:border-l border-[#EAE6DF] shadow-xs shrink-0 p-5 pb-24 md:pb-5 space-y-4 md:overflow-y-auto text-left">
        {/* 头部：日期大标题与实时天气 */}
        <div className="flex items-center justify-between pb-3 border-b border-[#EAE6DF]">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-stone-900">
                {selectedDate === todayStr ? '今日穿搭' : `${selectedDate} 穿搭手册`}
              </h3>
              {selectedDate === todayStr && (
                <span className="text-[10px] font-bold text-white bg-[#D63031] px-2 py-0.5 rounded-full shadow-2xs">
                  TODAY
                </span>
              )}
            </div>
            <span className="text-[11px] text-stone-400 font-mono">
              {new Date(selectedDate).toLocaleDateString('zh-CN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>

          {/* 真实气象状态栏与地区切换入口 */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              data-testid="weather-badge-btn"
              onClick={() => setIsCityPickerOpen(true)}
              title="点击切换真实天气地区 / 重新定位"
              className="flex items-center gap-1.5 bg-[#FAF8F5] hover:bg-stone-100 border border-[#EAE6DF] hover:border-stone-400 px-2.5 py-1 rounded-xl transition-all cursor-pointer shadow-2xs group"
            >
              <CloudSun className="w-3.5 h-3.5 text-amber-500 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-stone-800">{weatherTag}</span>
              {isWeatherCached && (
                <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-mono">
                  离线缓存
                </span>
              )}
              <span className="text-[10px] text-[#D63031] font-bold underline ml-1">切换地区</span>
            </button>
            <button
              onClick={() => loadWeather()}
              title="刷新当前实时天气"
              className="text-stone-400 hover:text-stone-700 p-1 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isWeatherLoading ? 'animate-spin text-[#D63031]' : ''}`} />
            </button>
          </div>
        </div>

        {/* 核心内容区 */}
        {currentBoundOutfit ? (
          <div className="space-y-4 flex-1">
            {/* 套装标题 */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wide">
                  绑定搭配方案
                </span>
                <h4 className="text-sm font-extrabold text-stone-800">
                  {currentBoundOutfit.title}
                </h4>
              </div>
              <span className="text-[11px] font-mono font-bold text-stone-600 bg-stone-100 px-2.5 py-1 rounded-xl">
                {currentBoundOutfit.items?.length || 0} 件单品
              </span>
            </div>

            {/* 试穿成片大图 (3:4 优雅展示) */}
            <div className="relative w-full aspect-[3/4] max-h-[320px] bg-[#FAF8F5] rounded-2xl border border-[#EAE6DF] overflow-hidden flex items-center justify-center p-2 shadow-2xs group">
              {currentBoundOutfit.previewImageUrl ? (
                <img
                  src={currentBoundOutfit.previewImageUrl}
                  alt={currentBoundOutfit.title}
                  className="w-full h-full object-contain rounded-xl"
                />
              ) : currentGarments[0]?.assets?.[0]?.pngUrl ? (
                <div className="grid grid-cols-2 gap-2 p-3 w-full h-full">
                  {currentGarments.slice(0, 4).map((g, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded-xl border border-[#EAE6DF] p-1 flex items-center justify-center"
                    >
                      <img
                        src={g.assets?.[0]?.pngUrl}
                        alt={g.title}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <Shirt className="w-12 h-12 text-stone-300 stroke-[1.25]" />
              )}
            </div>

            {/* [用户最核心诉求] 动态高定调色盘 (Look Palette) 展示 */}
            <div className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-[#EAE6DF] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-[#D63031]" />
                  <span className="text-xs font-bold text-stone-800">今日高定调色盘</span>
                </div>
                <span className="text-[10px] font-bold text-[#D63031] bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-lg">
                  {colorAnalysis.styleTone}
                </span>
              </div>

              {/* 真实细化色彩卡片栏 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                {colorAnalysis.palette.map((pal, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-white rounded-xl border border-[#EAE6DF] flex items-center gap-2 shadow-2xs"
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-black/10 shrink-0 shadow-xs"
                      style={{ background: pal.hex }}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] font-bold text-stone-800 block truncate">
                        {pal.name}
                      </span>
                      <span className="text-[9px] font-mono text-stone-400 block truncate">
                        {pal.hex}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 穿戴单品微缩列表 */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-stone-500">
                搭配单品清单 ({currentGarments.length} 件):
              </span>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {currentGarments.map((g) => (
                  <div
                    key={g.id}
                    title={g.title}
                    className="w-14 h-14 bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl p-1 shrink-0 flex items-center justify-center relative group"
                  >
                    <img
                      src={g.assets?.[0]?.pngUrl}
                      alt={g.title}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 心得随笔与打卡笔记 */}
            <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#EAE6DF] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-700">灵感与穿搭心得</span>
                {isNotesEditing ? (
                  <button
                    onClick={handleSaveNotes}
                    className="text-[10px] text-[#D63031] font-bold hover:underline"
                  >
                    保存更新
                  </button>
                ) : (
                  <button
                    onClick={() => setIsNotesEditing(true)}
                    className="text-[10px] text-stone-400 hover:text-stone-700"
                  >
                    编辑
                  </button>
                )}
              </div>
              {isNotesEditing ? (
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs bg-white border border-[#EAE6DF] rounded-xl p-2 text-stone-800 focus:outline-none focus:border-stone-600"
                  rows={2}
                />
              ) : (
                <p className="text-xs text-stone-600 italic">
                  "{notes || '暂无心得，随时记录今日的心情与搭配细节'}"
                </p>
              )}
            </div>

            {/* 核心操作按钮坞 */}
            <div className="space-y-2 pt-2 border-t border-[#EAE6DF]">
              <button
                onClick={() => {
                  onApplyOutfit(currentBoundOutfit);
                  onNavigateToStudio();
                  showToast(`已将【${currentBoundOutfit.title}】装载至试衣间！`, 'success');
                }}
                className="w-full py-2.5 bg-[#D63031] hover:bg-[#b82829] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <Shirt className="w-4 h-4" />
                <span>一键装载至试衣间</span>
              </button>

              {/* 海报版式选择器 */}
              <div className="flex items-center justify-between px-2 py-1.5 bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl text-[11px]">
                <span className="font-bold text-stone-600">海报版式:</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPosterLayout('MIXED')}
                    className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                      posterLayout === 'MIXED'
                        ? 'bg-white text-[#D63031] shadow-2xs'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    画册混合
                  </button>
                  <button
                    type="button"
                    onClick={() => setPosterLayout('PORTRAIT')}
                    className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                      posterLayout === 'PORTRAIT'
                        ? 'bg-white text-[#D63031] shadow-2xs'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    单人物大片
                  </button>
                  <button
                    type="button"
                    onClick={() => setPosterLayout('GARMENTS')}
                    className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                      posterLayout === 'GARMENTS'
                        ? 'bg-white text-[#D63031] shadow-2xs'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    单品画廊
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleExportPoster}
                  disabled={isPosterExporting}
                  className="py-2 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isPosterExporting ? '生成中...' : '导出色卡海报'}</span>
                </button>

                <button
                  onClick={handleSharePoster}
                  disabled={isPosterSharing}
                  className="py-2 bg-[#FAF8F5] hover:bg-stone-100 border border-[#EAE6DF] text-stone-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors shadow-2xs"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{isPosterSharing ? '生成中...' : '复制分享文案'}</span>
                </button>
              </div>

              <div className="flex items-center justify-between pt-1 text-[11px]">
                <button
                  onClick={() => setIsSchedulePickerOpen(true)}
                  className="text-stone-500 hover:text-stone-900 font-bold"
                >
                  更换其他搭配...
                </button>
                <button
                  onClick={handleDeleteLog}
                  className="text-stone-400 hover:text-rose-600 flex items-center gap-0.5"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>移除此日打卡</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* 空白日期引导 */
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-12">
            <div className="w-14 h-14 rounded-3xl bg-stone-100 text-stone-400 flex items-center justify-center">
              <CalendarIcon className="w-7 h-7 stroke-[1.5]" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-extrabold text-stone-800">
                {selectedDate} 暂未安排穿搭
              </h4>
              <p className="text-xs text-stone-400 max-w-xs">
                您可以从已保存的 Lookbook 搭配库挑选一套排期，或者前往试衣间现搭一套。
              </p>
            </div>

            <div className="w-full space-y-2 max-w-xs pt-2">
              <button
                onClick={() => setIsSchedulePickerOpen(true)}
                className="w-full py-2.5 bg-[#2D3436] hover:bg-black text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>从搭配库挑选一套排入</span>
              </button>

              <button
                onClick={onNavigateToStudio}
                className="w-full py-2 bg-white border border-[#EAE6DF] hover:bg-stone-50 text-stone-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Shirt className="w-3.5 h-3.5" />
                <span>前往试衣间现搭一套</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================= */}
      {/* 弹窗：从 Lookbook 搭配库中挑选一套排入指定日期 */}
      {/* ============================================================= */}
      {isSchedulePickerOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/40 backdrop-blur-xs flex items-center justify-center p-4 pb-8 md:pb-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#EAE6DF] shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col p-6 space-y-4 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE6DF]">
              <div>
                <h3 className="text-sm font-extrabold text-stone-900">
                  为 {selectedDate} 挑选搭配方案
                </h3>
                <p className="text-[10px] text-stone-400">
                  从已保存的 Lookbook 搭配库中直接点击绑定
                </p>
              </div>
              <button
                onClick={() => setIsSchedulePickerOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {outfits.length === 0 ? (
                <div className="text-center py-12 space-y-2 text-stone-400">
                  <Shirt className="w-8 h-8 mx-auto stroke-[1.25] text-stone-300" />
                  <p className="text-xs">暂无保存的搭配方案，请先在试衣间拼搭并点击【保存搭配】</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {outfits.map((outfit) => {
                    const outfitGarments = (outfit.items || [])
                      .map((it) => allGarments.find((g) => g.id === it.garmentId))
                      .filter(Boolean) as GarmentItem[];
                    const palAnalysis = extractOutfitColorPalette(outfitGarments);

                    return (
                      <div
                        key={outfit.id}
                        onClick={() => handleSelectOutfitForDate(outfit)}
                        className="p-3 bg-[#FAF8F5] hover:bg-white border border-[#EAE6DF] hover:border-[#D63031] rounded-2xl cursor-pointer transition-all duration-200 hover:shadow-md flex items-center gap-3 group"
                      >
                        <div className="w-16 h-20 bg-white rounded-xl border border-[#EAE6DF] shrink-0 p-1 flex items-center justify-center overflow-hidden">
                          {outfit.previewImageUrl ? (
                            <img
                              src={outfit.previewImageUrl}
                              alt={outfit.title}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : outfitGarments[0]?.assets?.[0]?.pngUrl ? (
                            <img
                              src={outfitGarments[0].assets[0].pngUrl}
                              alt={outfit.title}
                              className="max-w-full max-h-full object-contain"
                            />
                          ) : (
                            <Shirt className="w-6 h-6 text-stone-300" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          <h4 className="text-xs font-extrabold text-stone-800 truncate group-hover:text-[#D63031] transition-colors">
                            {outfit.title}
                          </h4>
                          <span className="text-[10px] text-stone-500 block">
                            {outfit.items?.length || 0} 件穿戴单品
                          </span>
                          <div className="flex items-center gap-1 pt-0.5">
                            {palAnalysis.palette.slice(0, 3).map((p, idx) => (
                              <span
                                key={idx}
                                className="w-2 h-2 rounded-full border border-black/10 shrink-0"
                                style={{ background: p.hex }}
                              />
                            ))}
                            <span className="text-[9px] text-stone-400 pl-1 font-mono truncate">
                              {palAnalysis.styleTone}
                            </span>
                          </div>
                        </div>

                        <button className="px-2.5 py-1 bg-white group-hover:bg-[#D63031] text-stone-600 group-hover:text-white border border-[#EAE6DF] group-hover:border-[#D63031] rounded-xl text-[11px] font-bold shrink-0 transition-colors shadow-2xs">
                          排入
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#EAE6DF] flex justify-end">
              <button
                onClick={() => setIsSchedulePickerOpen(false)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl text-xs font-bold transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 严格真实地区气象切换 Modal (杜绝乱填手写) */}
      {isCityPickerOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 pb-8 md:pb-4 z-[120] animate-in fade-in"
          onClick={() => setIsCityPickerOpen(false)}
        >
          <div
            className="bg-white rounded-3xl border border-[#EAE6DF] p-6 max-w-md w-full shadow-2xl space-y-4 text-left animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                  <CloudSun className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-stone-800">穿搭日历 · 真实地区天气</h3>
                  <p className="text-[10px] text-stone-400">对接国家气象站点，断网时自动保留最后一次缓存</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCityPickerOpen(false)}
                className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1. 自动 GPS 定位选项 */}
            <button
              type="button"
              data-testid="btn-gps-location"
              onClick={handleUseGpsLocation}
              className="w-full py-2.5 px-3 rounded-2xl bg-amber-50 hover:bg-amber-100/80 border border-amber-200/80 text-amber-900 text-xs font-bold flex items-center justify-between transition-all cursor-pointer shadow-2xs active:scale-98"
            >
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-600" />
                <span>使用当前设备 GPS 定位当地天气</span>
              </div>
              <span className="text-[10px] text-amber-700 bg-white/80 px-2 py-0.5 rounded-full font-semibold">自动匹配</span>
            </button>

            {/* 2. 常用城市快速选择 */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-stone-500">选择常用标准城市:</span>
              <div className="grid grid-cols-4 gap-1.5 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
                {POPULAR_CITIES.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    data-testid={`city-btn-${c.name}`}
                    onClick={() => handleSelectStandardCity(c.name)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                      selectedCityName === c.name
                        ? 'bg-[#D63031] border-[#D63031] text-white shadow-xs'
                        : 'bg-[#FAF8F5] border-[#EAE6DF] text-stone-700 hover:border-stone-400 hover:bg-white'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. 严格真实城市名称检索 (杜绝乱写文本) */}
            <div className="space-y-1.5 pt-1 border-t border-stone-100">
              <span className="text-[11px] font-bold text-stone-500">搜索其它国内/国际城市:</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="如：昆明、三亚、拉萨..."
                  value={customCityInput}
                  onChange={(e) => {
                    setCustomCityInput(e.target.value);
                    setCitySearchError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearchCustomCity();
                  }}
                  className="flex-1 bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl px-3 py-2 text-xs text-stone-800 focus:outline-none focus:border-stone-600"
                />
                <button
                  type="button"
                  data-testid="search-city-btn"
                  onClick={handleSearchCustomCity}
                  disabled={isWeatherLoading}
                  className="px-4 py-2 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isWeatherLoading ? '查询中...' : '确定'}
                </button>
              </div>
              {citySearchError && (
                <p className="text-[11px] text-rose-500 font-bold">{citySearchError}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
