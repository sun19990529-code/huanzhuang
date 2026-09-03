import React, { useState } from 'react';
import { OutfitData, OotdEntry } from '../api';
import { GarmentItem } from '@smart-wardrobe/shared';
import { Calendar, X, Sparkles, Shirt, Trash2, CheckCircle2, CloudSun, Plus, Bookmark } from 'lucide-react';

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
 const [selectedDate, setSelectedDate] = useState<string>(todayStr);
 const [weatherTag, setWeatherTag] = useState<string>('晴朗 24°C');
 const [notes, setNotes] = useState<string>('早秋叠穿，层次感极佳');
 const [selectedOutfitIdForLog, setSelectedOutfitIdForLog] = useState<string>(outfits[0]?.id || '');

 if (!isOpen) return null;

 const currentLog = ootdLogs.find((l) => l.logDate === selectedDate);
 const currentBoundOutfit = currentLog ? outfits.find((o) => o.id === currentLog.outfitId) : null;

 // 生成当前月份的 14 天网格模拟交互
 const sampleDates = Array.from({ length: 14 }).map((_, i) => {
 const d = new Date();
 d.setDate(d.getDate() - (7 - i));
 return d.toISOString().split('T')[0];
 });

 const handleSaveOotd = () => {
 if (!selectedOutfitIdForLog) return;
 onBindOotd(selectedOutfitIdForLog, selectedDate, weatherTag, notes);
 };

 return (
 <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 pb-8 md:pb-4 z-[100]">
 <div className="bg-slate-900 border border-purple-500/30 w-full max-w-5xl max-h-[88vh] rounded-3xl p-6 shadow-2xl flex flex-col space-y-4">
 {/* Header */}
 <div className="flex items-center justify-between pb-3 border-b border-slate-800">
 <div className="flex items-center gap-2">
 <Calendar className="w-5 h-5 text-purple-400" />
 <h2 className="font-bold text-base text-slate-100">Lookbook 搭配库 & OOTD 穿搭日历</h2>
 <span className="text-[10px] text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-800/40">
 PRD 3.6 搭配库与穿搭日历
 </span>
 </div>
 <button
 onClick={onClose}
 className="p-1 text-slate-400 hover:text-slate-100 rounded-xl hover:bg-slate-800 transition-colors"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 {/* Content */}
 <div className="flex-1 overflow-y-auto space-y-6 pr-2">
 {/* Section 1: OOTD 交互式月度穿搭日历 */}
 <div className="p-4 bg-slate-950/80 rounded-2xl border border-purple-500/20 space-y-3 text-left">
 <div className="flex items-center justify-between">
 <h3 className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
 <CloudSun className="w-4 h-4 text-yellow-400" /> OOTD 日历穿搭打卡记录
 </h3>
 <span className="text-[11px] text-slate-400">当前选择日期: <span className="text-yellow-400 font-mono font-bold">{selectedDate}</span></span>
 </div>

 {/* 日期横向滚动网格 */}
 <div className="flex gap-2 overflow-x-auto pb-2">
 {sampleDates.map((date) => {
 const hasLog = ootdLogs.some((l) => l.logDate === date);
 const isSelected = selectedDate === date;
 const dayNum = date.split('-')[2];
 return (
 <button
 key={date}
 onClick={() => setSelectedDate(date)}
 className={`flex flex-col items-center justify-center p-2 rounded-xl border min-w-[58px] transition-all ${
 isSelected
 ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/30'
 : hasLog
 ? 'bg-purple-950/40 border-purple-500/40 text-purple-300'
 : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
 }`}
 >
 <span className="text-[10px]">{date.split('-')[1]}月</span>
 <span className="text-sm font-bold font-mono">{dayNum}日</span>
 {hasLog && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-1" />}
 </button>
 );
 })}
 </div>

 {/* 当日穿搭打卡面板 */}
 <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
 <div className="flex-1 space-y-1">
 <div className="flex items-center gap-2">
 <span className="text-xs font-bold text-slate-200">
 {currentBoundOutfit ? `已排入套装: ${currentBoundOutfit.title}` : '当日未绑定穿搭'}
 </span>
 {currentLog?.weatherTag && (
 <span className="text-[10px] bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800/40">
 ️ {currentLog.weatherTag}
 </span>
 )}
 </div>
 <p className="text-[11px] text-slate-400">{currentLog?.notes || '随时记录今日的穿搭心情与天气标签'}</p>
 </div>

 {/* 绑定打卡表单 */}
 <div className="flex items-center gap-2 w-full md:w-auto">
 <select
 value={selectedOutfitIdForLog}
 onChange={(e) => setSelectedOutfitIdForLog(e.target.value)}
 className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
 >
 <option value="">选择要绑定的套装...</option>
 {outfits.map((o) => (
 <option key={o.id} value={o.id}>
 {o.title}
 </option>
 ))}
 </select>

 <select
 value={weatherTag}
 onChange={(e) => setWeatherTag(e.target.value)}
 className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
 >
 <option value="晴朗 24°C">晴朗 24°C</option>
 <option value="多云 20°C">多云 20°C</option>
 <option value="小雨 16°C">小雨 16°C</option>
 <option value="降温大风 10°C">降温大风 10°C</option>
 </select>

 <button
 onClick={handleSaveOotd}
 className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-xs transition-colors shrink-0"
 >
 打卡保存
 </button>
 </div>
 </div>
 </div>

 {/* Section 2: Lookbook 套装库 */}
 <div className="text-left">
 <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">我的 Lookbook 搭配库 ({outfits.length})</h3>
 {outfits.length === 0 ? (
 <div className="text-center py-8 text-slate-400 text-xs bg-slate-950/40 rounded-2xl border border-slate-800">
 暂无保存的套装搭配，快去画布拼装并保存吧！
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
 {outfits.map((outfit) => (
 <div
 key={outfit.id}
 className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl hover:border-purple-500/40 transition-all space-y-2.5 flex flex-col justify-between"
 >
 <div>
 <div className="flex items-center justify-between">
 <h4 className="font-bold text-xs text-slate-200">{outfit.title}</h4>
 <span className="text-[10px] text-purple-400 bg-purple-950 px-1.5 py-0.5 rounded border border-purple-800/40">
 {outfit.items.length} 件单品
 </span>
 </div>
 <p className="text-[10px] text-slate-400 mt-1">
 创建时间: {new Date(outfit.createdAt).toLocaleDateString()}
 </p>
 </div>

 <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
 <button
 onClick={() => {
 onApplyOutfit(outfit);
 onClose();
 }}
 className="flex-1 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
 >
 一键上身换装
 </button>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 );
};
