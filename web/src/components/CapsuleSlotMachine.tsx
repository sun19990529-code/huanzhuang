import React, { useState, useEffect } from 'react';
import { GarmentItem, GarmentState, generateWeatherOutfitSuggestion } from '@smart-wardrobe/shared';
import { getSmartWeather } from '../utils/weatherService';
import { showToast } from './Toast';
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
  Compass,
  Layers,
} from 'lucide-react';

interface CapsuleSlotMachineProps {
  garments: GarmentItem[];
  onApplyOutfitToStudio: (garments: GarmentItem[], states: Record<string, GarmentState>) => void;
  onBindToOotd: (garments: GarmentItem[], notes: string) => void;
}

// 风格流派定义 (Defect 17)
const FASHION_STYLES = [
  { key: 'ALL', label: '全部风格' },
  { key: 'FRENCH_RETRO', label: '法式复古' },
  { key: 'QUIET_LUXURY', label: '静奢老钱' },
  { key: 'Y2K_COOL', label: '甜酷辣妹' },
  { key: 'OUTDOOR_GORP', label: '户外山系' },
];

export const CapsuleSlotMachine: React.FC<CapsuleSlotMachineProps> = ({
  garments,
  onApplyOutfitToStudio,
  onBindToOotd,
}) => {
  const [temperatureC, setTemperatureC] = useState(24);
  const [weatherText, setWeatherText] = useState('晴朗 24°C');
  const [cityName, setCityName] = useState('无锡');
  const [selectedStyle, setSelectedStyle] = useState('ALL');
  const [isSpinning, setIsSpinning] = useState(false);
  const [lockedIds, setLockedIds] = useState<string[]>([]);
  const [suggestedGarments, setSuggestedGarments] = useState<GarmentItem[]>([]);
  const [appliedStates, setAppliedStates] = useState<Record<string, GarmentState>>({});
  const [description, setDescription] = useState('根据实时气温与风格智能推荐搭配');

  // 自动获取定位或无锡实时天气并初始化转盘推荐
  useEffect(() => {
    getSmartWeather().then((w) => {
      setTemperatureC(w.tempC);
      setWeatherText(w.weatherTag);
      setCityName(w.city);
    });
  }, []);

  const handleSpin = () => {
    if (garments.length === 0) {
      showToast('衣橱暂无可搭配单品，请先上传或添加衣物！', 'error');
      return;
    }
    setIsSpinning(true);

    setTimeout(() => {
      // 风格过滤
      let pool = [...garments];
      if (selectedStyle === 'FRENCH_RETRO') {
        pool = garments.filter((g) =>
          g.title.includes('法式') || g.title.includes('复古') || g.title.includes('蕾丝') || g.title.includes('裙')
        );
      } else if (selectedStyle === 'QUIET_LUXURY') {
        pool = garments.filter((g) =>
          g.title.includes('西装') || g.title.includes('真丝') || g.title.includes('羊绒') || g.title.includes('衬衫')
        );
      } else if (selectedStyle === 'Y2K_COOL') {
        pool = garments.filter((g) =>
          g.title.includes('短') || g.title.includes('牛仔') || g.title.includes('皮') || g.title.includes('酷')
        );
      } else if (selectedStyle === 'OUTDOOR_GORP') {
        pool = garments.filter((g) =>
          g.title.includes('夹克') || g.title.includes('户外') || g.title.includes('工装') || g.title.includes('山')
        );
      }
      if (pool.length === 0) pool = garments;

      const res = generateWeatherOutfitSuggestion(pool, temperatureC, lockedIds);
      setSuggestedGarments(res.selectedGarments);
      setAppliedStates(res.appliedStates);
      const styleName = FASHION_STYLES.find((s) => s.key === selectedStyle)?.label || '';
      setDescription(`${cityName} ${weatherText} · ${styleName !== '全部风格' ? styleName + ' · ' : ''}${res.description}`);
      setIsSpinning(false);
      showToast('智能搭配已生成！可点击单品进行锁定或一键带入试衣间', 'success');
    }, 650);
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
            按气温与风格生成整套搭配
          </h3>
        </div>

        {/* 气温选择器 (优雅胶囊，Defect 8) */}
        <div className="flex items-center gap-2 bg-[#FAF8F5] px-3 py-1.5 rounded-2xl border border-[#EAE6DF] shadow-2xs">
          <CloudSun className="w-4 h-4 text-amber-600 stroke-[1.75]" />
          <span className="text-xs font-bold text-stone-700">{cityName}:</span>
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

      {/* 风格倾向胶囊栏 (Defect 17) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[11px] font-bold text-stone-500 shrink-0 flex items-center gap-1">
          <Compass className="w-3 h-3 text-[#D63031]" />
          <span>风格:</span>
        </span>
        {FASHION_STYLES.map((st) => (
          <button
            key={st.key}
            type="button"
            onClick={() => setSelectedStyle(st.key)}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedStyle === st.key
                ? 'bg-[#D63031] text-white shadow-2xs'
                : 'bg-stone-100 hover:bg-stone-200/70 text-stone-700'
            }`}
          >
            {st.label}
          </button>
        ))}
      </div>

      {/* 推荐槽位 */}
      <div className="space-y-3">
        <div className="text-xs font-bold text-stone-600 flex items-center justify-between">
          <span className="truncate max-w-[80%]">{description}</span>
          <span className="text-[11px] text-stone-500 font-mono shrink-0">已锁定 {lockedIds.length} 件</span>
        </div>

        {isSpinning ? (
          /* 项 13: 3 轴滚轮滚动出装动效 */
          <div className="grid grid-cols-3 gap-3 py-6 bg-gradient-to-b from-stone-900 to-stone-950 rounded-2xl border border-stone-800 p-4 text-center">
            {['上装 Reel', '下装 Reel', '外套与鞋配 Reel'].map((reelTitle, idx) => (
              <div key={reelTitle} className="bg-stone-900/90 rounded-xl p-3 border border-stone-700/80 overflow-hidden relative shadow-inner">
                <span className="text-[10px] font-mono text-amber-400 font-bold block mb-2">{reelTitle}</span>
                <div className="h-20 flex flex-col items-center justify-center space-y-2 animate-bounce">
                  <div className="w-10 h-10 rounded-xl bg-stone-800 flex items-center justify-center text-amber-300">
                    {idx === 0 ? <Shirt className="w-5 h-5 animate-spin" /> : idx === 1 ? <Layers className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5 animate-spin" />}
                  </div>
                  <span className="text-[9px] text-stone-400 font-mono">Curating...</span>
                </div>
              </div>
            ))}
          </div>
        ) : suggestedGarments.length === 0 ? (
          <div className="text-center py-8 bg-[#FAF8F5] rounded-2xl border border-[#EAE6DF] space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-white text-stone-400 border border-[#EAE6DF] flex items-center justify-center mx-auto shadow-2xs">
              <Dices className="w-5 h-5 stroke-[1.5]" />
            </div>
            <p className="text-xs text-stone-500">点击下方按钮开始智能生成整套搭配</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {suggestedGarments.map((g) => {
              const isLocked = lockedIds.includes(g.id);
              return (
                <div
                  key={g.id}
                  className={`relative bg-[#FAF8F5] rounded-2xl border p-3 flex flex-col items-center justify-between text-center transition-all group ${
                    isLocked ? 'border-[#D63031] bg-rose-50/20' : 'border-[#EAE6DF] hover:border-stone-400'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleLock(g.id)}
                    className={`absolute top-2 right-2 p-1.5 rounded-xl transition-all ${
                      isLocked
                        ? 'bg-[#D63031] text-white shadow-xs'
                        : 'bg-white text-stone-400 border border-[#EAE6DF] hover:text-stone-700'
                    }`}
                    title={isLocked ? '已锁定此单品' : '锁定此单品'}
                  >
                    {isLocked ? <Lock className="w-3.5 h-3.5 stroke-[2]" /> : <Unlock className="w-3.5 h-3.5" />}
                  </button>

                  <div className="w-20 h-20 my-2 flex items-center justify-center">
                    <img
                      src={g.assets?.[0]?.pngUrl}
                      alt={g.title}
                      className="max-h-full max-w-full object-contain filter drop-shadow-xs"
                    />
                  </div>

                  <div className="w-full space-y-0.5">
                    <div className="text-xs font-bold text-stone-800 truncate" title={g.title}>
                      {g.title}
                    </div>
                    <div className="text-[10px] text-stone-500 font-medium">
                      {g.subCategory || g.primaryCategory}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 底部操作条 */}
      <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-[#EAE6DF]">
        <button
          type="button"
          onClick={handleSpin}
          disabled={isSpinning || garments.length === 0}
          className="w-full sm:w-auto flex-1 py-2.5 bg-[#2D3436] hover:bg-black text-white rounded-2xl text-xs font-extrabold shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
          <span>{isSpinning ? '搭配计算中...' : '智能生成整套搭配'}</span>
        </button>

        {suggestedGarments.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => {
                onApplyOutfitToStudio(suggestedGarments, appliedStates);
                showToast('搭配已成功穿戴至试衣间模特！', 'success');
              }}
              className="w-full sm:w-auto py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-extrabold shadow-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Check className="w-4 h-4 stroke-[2]" />
              <span>带入试衣间</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onBindToOotd(suggestedGarments, description);
                showToast('已保存并打卡至今日 OOTD！', 'success');
              }}
              className="w-full sm:w-auto py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Heart className="w-4 h-4 text-[#D63031] stroke-[2]" />
              <span>存入 OOTD</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
