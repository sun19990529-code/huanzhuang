import React, { useState } from 'react';
import { GarmentItem, GarmentState, generateWeatherOutfitSuggestion } from '@smart-wardrobe/shared';
import {
  Sparkles,
  Dices,
  Lock,
  Unlock,
  CloudSun,
  Shirt,
  Calendar,
  Wand2,
  RefreshCw,
  Heart,
  Check,
} from 'lucide-react';

interface CapsuleSlotMachineProps {
  garments: GarmentItem[];
  onApplyOutfitToStudio: (garments: GarmentItem[], states: Record<string, GarmentState>) => void;
  onBindToOotd: (garments: GarmentItem[], notes: string) => void;
}

export const CapsuleSlotMachine: React.FC<CapsuleSlotMachineProps> = ({
  garments,
  onApplyOutfitToStudio,
  onBindToOotd,
}) => {
  const [temperatureC, setTemperatureC] = useState(22);
  const [weatherText, setWeatherText] = useState('晴朗 22°C');
  const [isSpinning, setIsSpinning] = useState(false);
  const [lockedIds, setLockedIds] = useState<string[]>([]);
  const [suggestedGarments, setSuggestedGarments] = useState<GarmentItem[]>([]);
  const [appliedStates, setAppliedStates] = useState<Record<string, GarmentState>>({});
  const [description, setDescription] = useState('根据气温智能推荐搭配');

  const handleSpin = () => {
    if (garments.length === 0) return;
    setIsSpinning(true);

    setTimeout(() => {
      const res = generateWeatherOutfitSuggestion(garments, temperatureC, lockedIds);
      setSuggestedGarments(res.selectedGarments);
      setAppliedStates(res.appliedStates);
      setDescription(res.description);
      setIsSpinning(false);
    }, 400);
  };

  const toggleLock = (garmentId: string) => {
    setLockedIds((prev) =>
      prev.includes(garmentId) ? prev.filter((id) => id !== garmentId) : [...prev, garmentId]
    );
  };

  return (
    <div className="bg-white rounded-[24px] border border-[#EAE6DF] p-6 shadow-xs space-y-4 text-left">
      {/* 顶部标题与气温选择 */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-[#EAE6DF] pb-3">
        <div className="space-y-0.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FAF8F5] text-stone-700 text-xs font-bold border border-[#EAE6DF]">
            <Dices className="w-3.5 h-3.5 text-[#D63031] stroke-[1.75]" />
            <span>搭配推荐</span>
          </div>
          <h3 className="text-sm font-extrabold text-stone-800">
            按气温生成整套搭配
          </h3>
        </div>

        {/* 气温选择器 */}
        <div className="flex items-center gap-2 bg-[#FAF8F5] px-3 py-1.5 rounded-2xl border border-[#EAE6DF] shadow-2xs">
          <CloudSun className="w-4 h-4 text-amber-600 stroke-[1.75]" />
          <span className="text-xs font-bold text-stone-700">气温:</span>
          <select
            value={temperatureC}
            onChange={(e) => {
              const temp = Number(e.target.value);
              setTemperatureC(temp);
              setWeatherText(temp < 20 ? `微凉 ${temp}°C` : `舒适 ${temp}°C`);
            }}
            className="bg-white text-xs font-bold text-stone-800 rounded-lg px-2 py-0.5 border border-[#EAE6DF] focus:outline-none cursor-pointer"
          >
            <option value={16}>16°C 微凉 (夹克/西装)</option>
            <option value={20}>20°C 舒适 (轻薄叠穿)</option>
            <option value={25}>25°C 晴暖 (短袖/衬衫)</option>
            <option value={30}>30°C 炎热 (清凉透气)</option>
          </select>
        </div>
      </div>

      {/* 推荐槽位 */}
      <div className="space-y-3">
        <div className="text-xs font-bold text-stone-600 flex items-center justify-between">
          <span>{description}</span>
          <span className="text-[11px] text-stone-400 font-mono">已锁定 {lockedIds.length} 件</span>
        </div>

        {suggestedGarments.length === 0 ? (
          <div className="text-center py-10 bg-[#FAF8F5] rounded-2xl border border-[#EAE6DF] space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-white text-stone-400 border border-[#EAE6DF] flex items-center justify-center mx-auto">
              <Dices className="w-5 h-5 stroke-[1.5]" />
            </div>
            <p className="text-xs text-stone-500">点击下方按钮开始随机生成搭配</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {suggestedGarments.map((g) => {
              const isLocked = lockedIds.includes(g.id);
              return (
                <div
                  key={g.id}
                  className={`relative p-3 rounded-2xl border transition-all flex flex-col justify-between ${
                    isLocked
                      ? 'bg-amber-50/40 border-amber-300 shadow-xs'
                      : 'bg-[#FAF8F5] border-[#EAE6DF]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] font-bold text-stone-500 bg-white px-1.5 py-0.5 rounded border border-[#EAE6DF]">
                      {g.primaryCategory}
                    </span>
                    <button
                      onClick={() => toggleLock(g.id)}
                      className={`p-1 rounded-lg text-xs transition-colors ${
                        isLocked
                          ? 'bg-amber-500 text-white'
                          : 'bg-white text-stone-400 hover:text-stone-700 border border-[#EAE6DF]'
                      }`}
                    >
                      {isLocked ? <Lock className="w-3 h-3 stroke-[2]" /> : <Unlock className="w-3 h-3 stroke-[2]" />}
                    </button>
                  </div>

                  <div className="w-full aspect-square bg-white rounded-xl flex items-center justify-center p-2 mb-2 overflow-hidden border border-[#EAE6DF]/60">
                    <img
                      src={g.assets?.[0]?.pngUrl}
                      alt={g.title}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>

                  <p className="text-xs font-bold text-stone-800 truncate text-left">{g.title}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 底部操作按钮 */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2 border-t border-[#EAE6DF]">
        <button
          onClick={handleSpin}
          disabled={isSpinning || garments.length === 0}
          className="w-full sm:flex-1 py-2.5 bg-[#2D3436] hover:bg-black text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50 active:scale-95"
        >
          <RefreshCw className={`w-3.5 h-3.5 stroke-[2] ${isSpinning ? 'animate-spin' : ''}`} />
          <span>{isSpinning ? '推荐计算中...' : '随机生成整套'}</span>
        </button>

        {suggestedGarments.length > 0 && (
          <>
            <button
              onClick={() => onApplyOutfitToStudio(suggestedGarments, appliedStates)}
              className="w-full sm:w-auto px-4 py-2.5 bg-[#D63031] hover:bg-[#c0392b] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95"
            >
              <Shirt className="w-3.5 h-3.5 stroke-[2]" />
              <span>应用到试衣间</span>
            </button>
            <button
              onClick={() => onBindToOotd(suggestedGarments, `${weatherText} 推荐穿搭`)}
              className="w-full sm:w-auto px-4 py-2.5 bg-[#FAF8F5] hover:bg-stone-100 text-stone-700 border border-[#EAE6DF] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Calendar className="w-3.5 h-3.5 stroke-[1.75]" />
              <span>记录到日历</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
