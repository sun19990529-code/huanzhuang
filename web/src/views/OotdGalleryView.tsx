import React, { useState, useEffect, useRef } from 'react';
import { OutfitData, OotdEntry } from '../api';
import { GarmentItem } from '@smart-wardrobe/shared';
import { getSmartWeather } from '../utils/weatherService';
import { showToast } from '../components/Toast';
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
 Copy,
 RefreshCw,
 ChevronLeft,
 ChevronRight,
 Grid,
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
 const [isWeatherLoading, setIsWeatherLoading] = useState(false);
 const [notes, setNotes] = useState<string>('法式慵懒叠穿，珍珠项链点缀');
 const [selectedOutfitId, setSelectedOutfitId] = useState<string>(outfits[0]?.id || '');
 const [selectedSceneFilter, setSelectedSceneFilter] = useState<string>('ALL');
 const [calendarMode, setCalendarMode] = useState<'14DAY' | 'MONTH'>('14DAY');
 const [viewYearMonth, setViewYearMonth] = useState({
 year: new Date().getFullYear(),
 month: new Date().getMonth(), // 0-indexed
 });

 // 4 种海报比例与 3 大模板
 const [posterRatio, setPosterRatio] = useState<'3:4' | '9:16' | '4:3' | '16:9'>('3:4');
 const [posterTheme, setPosterTheme] = useState<'MAGAZINE' | 'POLAROID' | 'GRID'>('MAGAZINE');

 // 自由拖拽色卡坐标偏移 (Drag Offsets)
 const [paletteOffset, setPaletteOffset] = useState({ x: 0, y: 0 });
 const [isDraggingPalette, setIsDraggingPalette] = useState(false);
 const dragStartRef = useRef({ mouseX: 0, mouseY: 0, startX: 0, startY: 0 });

 const [isExporting, setIsExporting] = useState(false);
 const [isSharing, setIsSharing] = useState(false);

 // 自动获取天气 (支持定位、无锡默认兜底与离线缓存)
 const loadWeather = async () => {
 setIsWeatherLoading(true);
 try {
 const w = await getSmartWeather();
 setWeatherTag(w.weatherTag);
 } catch (e) {
 console.warn('天气获取异常:', e);
 } finally {
 setIsWeatherLoading(false);
 }
 };

 useEffect(() => {
 loadWeather();
 }, []);

 const currentLog = ootdLogs.find((l) => l.logDate === selectedDate);
 const currentBoundOutfit = currentLog ? outfits.find((o) => o.id === currentLog.outfitId) : (outfits.find(o => o.id === selectedOutfitId) || outfits[0] || null);

 const sampleDates = Array.from({ length: 14 }).map((_, i) => {
 const d = new Date();
 d.setDate(d.getDate() - (7 - i));
 return d.toISOString().split('T')[0];
 });

 const handleSaveOotd = () => {
 if (!selectedOutfitId) return;
 onBindOotd(selectedOutfitId, selectedDate, weatherTag, notes);
 showToast('今日 OOTD 穿搭记录与海报已成功绑定保存！', "success");
 };

 // 拖拽色卡
 const handlePaletteMouseDown = (e: React.MouseEvent) => {
 e.preventDefault();
 setIsDraggingPalette(true);
 dragStartRef.current = {
 mouseX: e.clientX,
 mouseY: e.clientY,
 startX: paletteOffset.x,
 startY: paletteOffset.y,
 };
 };

 useEffect(() => {
 const handleMouseMove = (e: MouseEvent) => {
 if (!isDraggingPalette) return;
 const dx = e.clientX - dragStartRef.current.mouseX;
 const dy = e.clientY - dragStartRef.current.mouseY;
 setPaletteOffset({
 x: dragStartRef.current.startX + dx,
 y: dragStartRef.current.startY + dy,
 });
 };

 const handleMouseUp = () => {
 if (isDraggingPalette) {
 setIsDraggingPalette(false);
 }
 };

 if (isDraggingPalette) {
 window.addEventListener('mousemove', handleMouseMove);
 window.addEventListener('mouseup', handleMouseUp);
 }
 return () => {
 window.removeEventListener('mousemove', handleMouseMove);
 window.removeEventListener('mouseup', handleMouseUp);
 };
 }, [isDraggingPalette]);

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

 // 真实 Canvas 高清海报渲染与合成引擎
 const generatePosterCanvas = async (): Promise<HTMLCanvasElement> => {
 let width = 900;
 let height = 1200;
 if (posterRatio === '9:16') {
 width = 720;
 height = 1280;
 } else if (posterRatio === '4:3') {
 width = 1200;
 height = 900;
 } else if (posterRatio === '16:9') {
 width = 1280;
 height = 720;
 }

 const canvas = document.createElement('canvas');
 canvas.width = width;
 canvas.height = height;
 const ctx = canvas.getContext('2d');
 if (!ctx) throw new Error('Canvas 2D 初始化失败');

 // 1. 绘制背景与外边框
 ctx.fillStyle = '#FAF8F5';
 ctx.fillRect(0, 0, width, height);

 ctx.fillStyle = '#FFFFFF';
 ctx.roundRect(30, 30, width - 60, height - 60, 24);
 ctx.fill();
 ctx.lineWidth = 2;
 ctx.strokeStyle = '#EAE6DF';
 ctx.stroke();

 // 2. 标头
 ctx.fillStyle = '#D63031';
 ctx.font = 'bold 16px monospace';
 ctx.fillText(`OOTD LOOKBOOK · ${selectedDate}`, 60, 80);

 ctx.fillStyle = '#2D3436';
 ctx.font = 'bold 28px sans-serif';
 ctx.fillText(currentBoundOutfit?.title || '早秋极简复古搭配', 60, 120);

 ctx.fillStyle = '#888888';
 ctx.font = 'italic 16px serif';
 ctx.fillText(`"${notes || '法式慵懒叠穿，珍珠项链点缀'}"`, 60, 150);

 // 右上角天气标签
 ctx.fillStyle = '#FAF8F5';
 ctx.roundRect(width - 240, 60, 180, 40, 12);
 ctx.fill();
 ctx.strokeStyle = '#EAE6DF';
 ctx.stroke();
 ctx.fillStyle = '#2D3436';
 ctx.font = 'bold 14px sans-serif';
 ctx.fillText(weatherTag, width - 220, 85);

 // 3. 模特成片图片绘制
 const imgX = 60;
 const imgY = 180;
 const imgW = width - 120;
 const imgH = height - 280;

 ctx.fillStyle = '#F5F2EB';
 ctx.roundRect(imgX, imgY, imgW, imgH, 20);
 ctx.fill();

 if (currentBoundOutfit?.previewImageUrl) {
 try {
 const img = new Image();
 img.crossOrigin = 'anonymous';
 await new Promise((res, rej) => {
 img.onload = res;
 img.onerror = rej;
 img.src = currentBoundOutfit.previewImageUrl!;
 });
 const aspect = img.width / img.height;
 let drawW = imgW;
 let drawH = drawW / aspect;
 if (drawH > imgH) {
 drawH = imgH;
 drawW = drawH * aspect;
 }
 const posX = imgX + (imgW - drawW) / 2;
 const posY = imgY + (imgH - drawH) / 2;
 ctx.drawImage(img, posX, posY, drawW, drawH);
 } catch (err) {
 console.warn('成片图片跨域加载失败，使用占位符:', err);
 }
 } else if (currentBoundOutfit?.items && currentBoundOutfit.items.length > 0) {
 // Defect 10 修复: 无 AI 试穿成片时，智能拼贴 2D 单品切片画报
 const itemsToDraw = currentBoundOutfit.items.slice(0, 4);
 const cols = itemsToDraw.length > 1 ? 2 : 1;
 const rows = Math.ceil(itemsToDraw.length / cols);
 const cellW = (imgW - 40) / cols;
 const cellH = (imgH - 40) / rows;

 for (let i = 0; i < itemsToDraw.length; i++) {
 const it = itemsToDraw[i];
 const g = allGarments.find((garment) => garment.id === it.garmentId);
 const assetUrl = g?.assets?.[0]?.pngUrl;
 const colIdx = i % cols;
 const rowIdx = Math.floor(i / cols);
 const cellX = imgX + 20 + colIdx * cellW;
 const cellY = imgY + 20 + rowIdx * cellH;

 ctx.fillStyle = '#FFFFFF';
 ctx.roundRect(cellX + 5, cellY + 5, cellW - 10, cellH - 10, 16);
 ctx.fill();
 ctx.strokeStyle = '#EAE6DF';
 ctx.stroke();

 if (assetUrl) {
 try {
 const gImg = new Image();
 gImg.crossOrigin = 'anonymous';
 await new Promise((res, rej) => {
 gImg.onload = res;
 gImg.onerror = rej;
 gImg.src = assetUrl;
 });
 const gAspect = gImg.width / gImg.height;
 let gDrawW = cellW - 30;
 let gDrawH = gDrawW / gAspect;
 if (gDrawH > cellH - 40) {
 gDrawH = cellH - 40;
 gDrawW = gDrawH * gAspect;
 }
 const gPosX = cellX + (cellW - gDrawW) / 2;
 const gPosY = cellY + (cellH - gDrawH) / 2 - 10;
 ctx.drawImage(gImg, gPosX, gPosY, gDrawW, gDrawH);
 } catch (e) {
 // ignore
 }
 }

 if (g?.title) {
 ctx.fillStyle = '#2D3436';
 ctx.font = 'bold 12px sans-serif';
 ctx.textAlign = 'center';
 ctx.fillText(g.title.slice(0, 10), cellX + cellW / 2, cellY + cellH - 14);
 ctx.textAlign = 'left';
 }
 }
 }

 // 4. 潘通色卡条
 const paletteBaseX = 80 + paletteOffset.x;
 const paletteBaseY = height - 180 + paletteOffset.y;
 ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
 ctx.roundRect(paletteBaseX, paletteBaseY, 260, 50, 14);
 ctx.fill();
 ctx.strokeStyle = '#EAE6DF';
 ctx.stroke();

 ctx.fillStyle = '#777777';
 ctx.font = 'bold 12px monospace';
 ctx.fillText('PANTONE', paletteBaseX + 15, paletteBaseY + 30);

 const colors = ['#2D3436', '#E8D8C8', '#D63031', '#2ECC71'];
 colors.forEach((hex, idx) => {
 ctx.fillStyle = hex;
 ctx.beginPath();
 ctx.arc(paletteBaseX + 110 + idx * 32, paletteBaseY + 25, 12, 0, Math.PI * 2);
 ctx.fill();
 ctx.lineWidth = 2;
 ctx.strokeStyle = '#FFFFFF';
 ctx.stroke();
 });

 // 5. 底部品牌印章
 ctx.fillStyle = '#AAAAAA';
 ctx.font = 'bold 13px monospace';
 ctx.fillText('SMARTWARDROBE ATELIER', 60, height - 50);
 ctx.fillText('100% PRIVATE OOTD', width - 220, height - 50);

 return canvas;
 };

 // 真实导出海报下载
 const handleExportPoster = async () => {
 setIsExporting(true);
 try {
 const canvas = await generatePosterCanvas();
 const dataUrl = canvas.toDataURL('image/png');
 const a = document.createElement('a');
 a.href = dataUrl;
 a.download = `SmartWardrobe_OOTD_${selectedDate}.png`;
 document.body.appendChild(a);
 a.click();
 document.body.removeChild(a);
 showToast(' 高清 OOTD 穿搭海报已成功导出并下载！', "success");
 } catch (err: any) {
 showToast(`导出海报失败: ${err.message}`, "success");
 } finally {
 setIsExporting(false);
 }
 };

 // 真实一键复制图片至剪贴板
 const handleSharePoster = async () => {
 setIsSharing(true);
 try {
 const canvas = await generatePosterCanvas();
 canvas.toBlob(async (blob) => {
 if (!blob) {
 showToast('生成海报 Blob 失败', "success");
 return;
 }
 try {
 if (navigator.clipboard && navigator.clipboard.write) {
 await navigator.clipboard.write([
 new ClipboardItem({ 'image/png': blob }),
 ]);
 showToast(' 穿搭高清海报已成功复制到系统剪贴板！可直接在微信/社媒 Ctrl+V 粘贴发送！', "success");
 } else {
 // 复制文案兜底
 const shareText = ` 今日 OOTD 穿搭：${currentBoundOutfit?.title || '我的专属搭配'} | ${weatherTag} | 灵感心得：${notes}`;
 await navigator.clipboard.writeText(shareText);
 showToast('搭配文案已复制至剪贴板！', "success");
 }
 } catch (copyErr) {
 const shareText = ` 今日 OOTD 穿搭：${currentBoundOutfit?.title || '我的专属搭配'} | ${weatherTag}`;
 await navigator.clipboard.writeText(shareText);
 showToast(' 搭配文案已复制至剪贴板！', "success");
 }
 }, 'image/png');
 } catch (err: any) {
 showToast(`分享海报失败: ${err.message}`, "success");
 } finally {
 setIsSharing(false);
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
 <div className="flex items-center gap-1.5">
 <span className="text-[11px] font-mono font-bold text-[#D63031] bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">
 {selectedDate}
 </span>
 <button
 onClick={loadWeather}
 title="刷新实时天气"
 className="p-1 rounded-lg hover:bg-stone-100 text-stone-500 transition-colors"
 >
 <RefreshCw className={`w-3.5 h-3.5 ${isWeatherLoading ? 'animate-spin' : ''}`} />
 </button>
 </div>
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
 <span className="text-[9px] font-mono opacity-80">{parts[1]}/{parts[2]}</span>
 <span className="text-xs font-extrabold">{isToday ? '今日' : '周' + ['日','一','二','三','四','五','六'][new Date(date).getDay()]}</span>
 {hasLog && <span className="w-1 h-1 rounded-full bg-[#D63031] mt-1" />}
 </button>
 );
 })}
 </div>

 {/* 今日打卡录入表单 */}
 <div className="bg-[#FAF8F5] rounded-2xl border border-[#EAE6DF] p-3.5 space-y-3 shadow-2xs">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
 <CloudSun className="w-3.5 h-3.5 text-amber-500" />
 <span>当日气象标签</span>
 </span>
 <input
 type="text"
 value={weatherTag}
 onChange={(e) => setWeatherTag(e.target.value)}
 className="bg-white border border-[#EAE6DF] rounded-lg px-2 py-0.5 text-xs text-stone-800 font-mono w-36 text-right focus:outline-none"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] font-bold text-stone-500 block">穿搭心得与灵感标签</label>
 <input
 type="text"
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 placeholder="如: 法式慵懒叠穿，珍珠项链点缀"
 className="w-full bg-white border border-[#EAE6DF] rounded-xl px-3 py-1.5 text-xs text-stone-800 focus:outline-none focus:border-[#D63031]"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] font-bold text-stone-500 block">关联我的 Lookbook 搭配</label>
 <select
 value={selectedOutfitId}
 onChange={(e) => setSelectedOutfitId(e.target.value)}
 className="w-full bg-white border border-[#EAE6DF] rounded-xl px-3 py-1.5 text-xs text-stone-800 focus:outline-none focus:border-[#D63031] cursor-pointer"
 >
 {outfits.map((o) => (
 <option key={o.id} value={o.id}>
 {o.title} ({o.items.length}件单品)
 </option>
 ))}
 </select>
 </div>

 <button
 onClick={handleSaveOotd}
 className="w-full py-2 bg-[#D63031] hover:bg-[#c0392b] text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5"
 >
 <CheckCircle2 className="w-3.5 h-3.5" />
 <span>保存并排入今日穿搭日历</span>
 </button>
 </div>

 {/* 搭配库清单 (支持按场景标签分类检索，Defect 6 修复) */}
 <div className="space-y-2.5 flex-1">
 <div className="flex items-center justify-between">
 <h4 className="text-xs font-bold text-stone-700 flex items-center gap-1">
 <Bookmark className="w-3.5 h-3.5 text-stone-400" />
 <span>我的 Lookbook 灵感库 ({outfits.length})</span>
 </h4>
 <button
 onClick={onNavigateToStudio}
 className="text-[10px] font-bold text-[#D63031] hover:underline flex items-center gap-0.5"
 >
 <Plus className="w-3 h-3" />
 <span>去试衣间搭配</span>
 </button>
 </div>

 {/* 场景分类胶囊栏 */}
 <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
 {[
 { key: 'ALL', label: '全部' },
 { key: 'CASUAL', label: '日常' },
 { key: 'COMMUTE', label: '通勤' },
 { key: 'DATE', label: '约会' },
 { key: 'VACATION', label: '️度假' },
 { key: 'PARTY', label: '宴会' },
 ].map((sc) => (
 <button
 key={sc.key}
 onClick={() => setSelectedSceneFilter(sc.key)}
 className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all shrink-0 ${
 selectedSceneFilter === sc.key
 ? 'bg-[#2D3436] text-white shadow-2xs'
 : 'bg-white border border-[#EAE6DF] text-stone-600 hover:bg-stone-50'
 }`}
 >
 {sc.label}
 </button>
 ))}
 </div>

 {outfits.length === 0 ? (
 <div className="text-center py-10 bg-[#FAF8F5] rounded-2xl border border-[#EAE6DF] space-y-2">
 <Shirt className="w-6 h-6 text-stone-300 mx-auto" />
 <p className="text-xs text-stone-400">暂无 Lookbook 套装</p>
 <button
 onClick={onNavigateToStudio}
 className="text-xs font-bold text-[#D63031] hover:underline"
 >
 立即去试衣间创建搭配 →
 </button>
 </div>
 ) : (
 <div className="space-y-2.5">
 {outfits
 .filter((o) => selectedSceneFilter === 'ALL' || (o.sceneTag || 'CASUAL') === selectedSceneFilter)
 .map((outfit) => (
 <div
 key={outfit.id}
 className="bg-white rounded-2xl border border-[#EAE6DF] p-3.5 shadow-2xs hover:shadow-sm transition-all flex items-center justify-between"
 >
 <div className="space-y-0.5">
 <div className="flex items-center gap-1.5">
 <h5 className="text-xs font-extrabold text-stone-800">{outfit.title}</h5>
 {outfit.sceneTag && (
 <span className="text-[9px] font-bold text-stone-500 bg-stone-100 px-1.5 py-0.2 rounded border border-stone-200/60">
 {{
 CASUAL: '日常',
 COMMUTE: '通勤',
 DATE: '约会',
 VACATION: '️度假',
 PARTY: '宴会',
 }[outfit.sceneTag] || '日常'}
 </span>
 )}
 </div>
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

 {/* 潘通色卡抽取条 (可自由鼠标拖拽，Defect 2 修复) */}
 <div
 onMouseDown={handlePaletteMouseDown}
 style={{
 transform: `translate(${paletteOffset.x}px, ${paletteOffset.y}px)`,
 }}
 className="absolute bottom-2 left-2 bg-white/95 backdrop-blur-md border border-[#EAE6DF] p-2 rounded-xl shadow-md flex items-center gap-1.5 cursor-grab active:cursor-grabbing hover:border-stone-400 transition-shadow select-none z-10"
 title="按住鼠标左键可自由拖拽色卡位置"
 >
 <Move className="w-3 h-3 text-stone-400 stroke-[1.5]" />
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

 {/* 底部操作 Bar (真实下载与剪贴板复制，Defect 1 修复) */}
 <div className="flex items-center gap-3 bg-white/95 backdrop-blur-md border border-[#EAE6DF] px-6 py-2.5 rounded-2xl shadow-md z-30">
 <button
 onClick={handleExportPoster}
 disabled={isExporting}
 className="px-5 py-2 bg-[#D63031] hover:bg-[#c0392b] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
 >
 <Download className="w-3.5 h-3.5 stroke-[2]" />
 <span>{isExporting ? '正在生成海报...' : '导出高清海报'}</span>
 </button>
 <button
 onClick={handleSharePoster}
 disabled={isSharing}
 className="px-4 py-2 bg-[#FAF8F5] hover:bg-stone-100 text-stone-700 border border-[#EAE6DF] text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors active:scale-95 disabled:opacity-50"
 >
 <Copy className="w-3.5 h-3.5 stroke-[1.75]" />
 <span>{isSharing ? '正在复制...' : '复制海报至剪贴板'}</span>
 </button>
 </div>
 </div>
 </div>
 );
};
