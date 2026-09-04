import React, { useState, useEffect, useRef } from 'react';
import { GarmentItem } from '@smart-wardrobe/shared';
import {
  generateOotdPosterCanvas,
  PosterLayoutMode,
} from '../utils/posterGenerator';
import { extractOutfitColorPalette } from '../utils/fashionFilterMatcher';
import { generateSmartOutfitTitle } from '../utils/outfitAiNamer';
import { getSmartWeather } from '../utils/weatherService';
import { showToast } from './Toast';
import {
  X,
  Sparkles,
  Download,
  Calendar,
  Share2,
  Palette,
  Check,
  Layers,
  User,
  LayoutGrid,
} from 'lucide-react';

export interface InstantOotdPosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  wornGarments: GarmentItem[];
  renderedImageUrl?: string | null;
  canvasSnapshotBase64?: string | null;
  existingTitles?: string[];
  initialTitle?: string;
  initialScene?: string;
  onSaveToLookbookAndOotd?: (data: {
    title: string;
    sceneTag: string;
    syncToOotdToday: boolean;
  }) => Promise<void>;
}

export const InstantOotdPosterModal: React.FC<InstantOotdPosterModalProps> = ({
  isOpen,
  onClose,
  wornGarments,
  renderedImageUrl,
  canvasSnapshotBase64,
  existingTitles = [],
  initialTitle,
  initialScene,
  onSaveToLookbookAndOotd,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [layoutMode, setLayoutMode] = useState<PosterLayoutMode>('MIXED');
  const [title, setTitle] = useState<string>(initialTitle || '');
  const [weatherTag, setWeatherTag] = useState<string>('晴朗 24°C');
  const [notes, setNotes] = useState<string>('法式松弛，色系统一');
  const [sceneTag, setSceneTag] = useState<string>(initialScene || 'CASUAL');
  const [posterDataUrl, setPosterDataUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isAiNaming, setIsAiNaming] = useState<boolean>(false);

  // 综合模特图像源（首选 AI 试穿成片，其次为画布素体快照）
  const heroImageSrc = renderedImageUrl || canvasSnapshotBase64 || null;

  // 调色盘提取
  const paletteAnalysis = extractOutfitColorPalette(wornGarments);

  // 初始化天气与默认标题
  useEffect(() => {
    if (isOpen) {
      if (initialTitle) {
        setTitle(initialTitle);
      } else {
        const generated = generateSmartOutfitTitle(
          wornGarments,
          initialScene || sceneTag,
          existingTitles
        );
        setTitle(generated.title);
      }
      if (initialScene) {
        setSceneTag(initialScene);
      }

      // 2. 自动拉取定位天气
      getSmartWeather().then((w) => {
        setWeatherTag(w.weatherTag || `${w.city} ${w.tempC}°C`);
      });
    }
  }, [isOpen, initialTitle, initialScene]);

  // ESC 键退出监听
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 当版式、标题、天气、图片发生变化时，实时重新绘制海报 Canvas
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const updatePoster = async () => {
      setIsGenerating(true);
      try {
        const canvas = await generateOotdPosterCanvas({
          layoutMode,
          dateStr: todayStr,
          title: title || '今日试衣间穿搭',
          weatherTag,
          notes,
          previewImageUrl: heroImageSrc,
          garments: wornGarments,
        });
        if (isMounted) {
          setPosterDataUrl(canvas.toDataURL('image/png'));
        }
      } catch (err) {
        console.error('海报即时渲染失败:', err);
      } finally {
        if (isMounted) setIsGenerating(false);
      }
    };

    updatePoster();
    return () => {
      isMounted = false;
    };
  }, [isOpen, layoutMode, title, weatherTag, notes, heroImageSrc, wornGarments]);

  // AI 智能重命名（带严格排重）
  const handleAiRegenerateTitle = () => {
    setIsAiNaming(true);
    setTimeout(() => {
      const generated = generateSmartOutfitTitle(
        wornGarments,
        sceneTag,
        existingTitles,
        title
      );
      setTitle(generated.title);
      setIsAiNaming(false);
      showToast(`✨ AI 已生成专属搭配名称：【${generated.title}】（已核验排重）`, 'success');
    }, 200);
  };

  // 下载高清海报
  const handleDownloadPoster = () => {
    if (!posterDataUrl) return;
    const a = document.createElement('a');
    a.href = posterDataUrl;
    a.download = `OOTD_${todayStr}_${title || '时尚大片'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('高清 OOTD 穿搭色卡海报已成功保存至本地！', 'success');
  };

  // 复制分享文案与图片
  const handleCopyShare = async () => {
    const text = `【今日 OOTD · ${title}】\n🎨 色彩基调: ${paletteAnalysis.styleTone}\n🌤️ 天气: ${weatherTag}\n💭 搭配笔记: ${notes}\n—— 来自 智能衣橱高定工坊`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        showToast('已复制穿搭分享文案到剪贴板！', 'success');
      }
    } catch {
      showToast('文案复制失败，请手动复制', 'info');
    }
  };

  // 一键同步打卡至今日穿搭日历
  const handleSyncToCalendar = async () => {
    if (!onSaveToLookbookAndOotd) return;
    setIsSyncing(true);
    try {
      await onSaveToLookbookAndOotd({
        title: title || '今日试衣间穿搭',
        sceneTag,
        syncToOotdToday: true,
      });
      showToast('🎉 已成功保存至搭配库并打卡至今日穿搭日历！', 'success');
      onClose();
    } catch (err: any) {
      showToast(`同步打卡失败: ${err.message}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl max-h-[92vh] rounded-3xl bg-[#FAF8F5] border border-[#EAE6DF] shadow-2xl overflow-y-auto md:overflow-hidden flex flex-col md:flex-row items-stretch gap-4 sm:gap-6 p-4 sm:p-7 scrollbar-thin"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 左侧 (约 48%)：高清海报实时预览卡 */}
        <div className="w-full md:flex-1 flex flex-col items-center justify-center min-w-0 bg-stone-100/70 border border-[#EAE6DF] rounded-2xl p-2 sm:p-3 relative shrink-0">
          {isGenerating && (
            <div className="absolute inset-0 z-10 bg-white/70 backdrop-blur-xs flex items-center justify-center gap-2 text-xs font-bold text-stone-700">
              <Sparkles className="w-4 h-4 text-[#D63031] animate-spin" />
              <span>海报实时排版渲染中...</span>
            </div>
          )}

          {posterDataUrl ? (
            <img
              src={posterDataUrl}
              alt="OOTD 海报预览"
              className="max-h-[36vh] sm:max-h-[46vh] md:max-h-[70vh] w-auto max-w-full rounded-xl object-contain shadow-md"
            />
          ) : (
            <div className="h-48 sm:h-64 md:h-96 flex items-center justify-center text-stone-400 text-xs font-bold">
              加载海报中...
            </div>
          )}

          <span className="text-[10px] text-stone-600 font-mono mt-1.5">
            2160 × 2880 (2K 视网膜超清画幅)
          </span>
        </div>

        {/* 右侧 (约 52%)：海报版式控制台与快捷行动坞 */}
        <div className="w-full md:w-96 lg:w-[420px] shrink-0 flex flex-col justify-between space-y-4">
          <div>
            {/* 顶栏标题与关闭 */}
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE6DF]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-rose-50 border border-rose-200/80 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-[#D63031]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900 tracking-tight">
                    直出 OOTD 时尚海报
                  </h3>
                  <p className="text-[11px] text-stone-600 font-mono">
                    Instant Fashion Editorial Dossier
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                data-testid="close-instant-poster"
                title="关闭海报弹窗"
                className="p-1.5 rounded-full text-stone-400 hover:text-stone-800 hover:bg-stone-200/60 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 版式自选器 (画册混合 / 纯人物 / 纯单品) */}
            <div className="mt-4 space-y-1.5">
              <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                <LayoutGrid className="w-3.5 h-3.5 text-[#D63031]" />
                <span>选择海报版式</span>
              </label>

              <div className="grid grid-cols-3 gap-1.5 bg-stone-200/60 p-1 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setLayoutMode('MIXED')}
                  className={`py-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    layoutMode === 'MIXED'
                      ? 'bg-white text-[#D63031] shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>画册混合</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLayoutMode('PORTRAIT')}
                  className={`py-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    layoutMode === 'PORTRAIT'
                      ? 'bg-white text-[#D63031] shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>纯人物大片</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLayoutMode('GARMENTS')}
                  className={`py-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    layoutMode === 'GARMENTS'
                      ? 'bg-white text-[#D63031] shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>单品画廊</span>
                </button>
              </div>
            </div>

            {/* 搭配名称与 AI 智能起名按钮 */}
            <div className="mt-3.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-700">搭配标题</label>
                <button
                  type="button"
                  onClick={handleAiRegenerateTitle}
                  disabled={isAiNaming}
                  className="text-[11px] text-[#D63031] hover:text-[#b02526] font-bold flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200/60 hover:bg-rose-100 transition-all cursor-pointer"
                  title="结合单品与色系，由 AI 自动生成高级感标题并核验排重"
                >
                  <Sparkles className={`w-3 h-3 ${isAiNaming ? 'animate-spin' : ''}`} />
                  <span>{isAiNaming ? '核验起名中...' : 'AI 帮我取名'}</span>
                </button>
              </div>

              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：秋日漫游 · 米白亚麻度假风"
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#EAE6DF] text-xs font-bold text-stone-800 focus:outline-none focus:border-[#D63031] transition-colors"
              />
            </div>

            {/* 穿搭场景胶囊 */}
            <div className="mt-3 space-y-1">
              <label className="text-[11px] font-bold text-stone-500">搭配风格场景</label>
              <div className="flex flex-wrap gap-1">
                {[
                  { tag: 'CASUAL', label: '日常休闲' },
                  { tag: 'COMMUTE', label: '知性通勤' },
                  { tag: 'DATE', label: '浪漫约会' },
                  { tag: 'VACATION', label: '周末度假' },
                  { tag: 'PARTY', label: '晚宴派对' },
                ].map((s) => (
                  <button
                    key={s.tag}
                    type="button"
                    onClick={() => setSceneTag(s.tag)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      sceneTag === s.tag
                        ? 'bg-stone-900 text-white'
                        : 'bg-white border border-[#EAE6DF] text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 动态色卡提纯预览 */}
            <div className="mt-3 p-2.5 rounded-xl bg-white border border-[#EAE6DF] flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-[#D63031]" />
                <span className="text-[11px] font-bold text-stone-700">
                  {paletteAnalysis.styleTone}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {paletteAnalysis.palette.slice(0, 4).map((p, idx) => (
                  <div
                    key={idx}
                    className="w-4 h-4 rounded-full border border-white shadow-2xs"
                    style={{ backgroundColor: p.hex }}
                    title={`${p.name} (${p.hex})`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 底部核心操作区 */}
          <div className="space-y-2 pt-3 border-t border-[#EAE6DF]">
            <button
              type="button"
              onClick={handleDownloadPoster}
              disabled={isGenerating || !posterDataUrl}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#D63031] to-[#E17055] hover:opacity-95 text-white font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>下载高清海报</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleSyncToCalendar}
                disabled={isSyncing}
                className="py-2.5 rounded-xl bg-white hover:bg-stone-50 border border-[#EAE6DF] text-stone-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <Calendar className="w-3.5 h-3.5 text-[#D63031]" />
                <span>{isSyncing ? '同步中...' : '一键打卡至日历'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyShare}
                className="py-2.5 rounded-xl bg-white hover:bg-stone-50 border border-[#EAE6DF] text-stone-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-stone-600" />
                <span>复制分享文案</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
