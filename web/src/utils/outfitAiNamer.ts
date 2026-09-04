import { GarmentItem } from '@smart-wardrobe/shared';
import { extractOutfitColorPalette } from './fashionFilterMatcher';

// 场景与意境词典
const SCENE_VIBES: Record<string, string[]> = {
  CASUAL: ['松弛日常', '周末漫步', '随性随心', '咖啡日和', '城市漫游', '舒适自在'],
  COMMUTE: ['职场通勤', '精炼通勤', '都市极简', '冷淡公式', '知性干练', '高阶通勤'],
  DATE: ['浪漫约会', '微醺黄昏', '温柔映画', '心动法式', '轻盈午后', '优雅约会'],
  VACATION: ['海滨漫步', '假日出逃', '旷野微风', '南法漫游', '慵懒度假', '向野而生'],
  PARTY: ['璀璨夜宴', '摩登出街', '名利场焦点', '先锋聚会', '高光时刻', '派对私享'],
};

// 时尚派系前缀
const FASHION_PREFIXES = [
  '静奢老钱',
  '法式松弛',
  '极简冷淡',
  '都市质感',
  '低饱和美学',
  '自然随性',
  '轻熟知性',
  '新中式雅致',
  '清冷高级',
  '复古摩登',
];

// 单品/面料意象提炼
function extractGarmentFeatures(garments: GarmentItem[]): string {
  if (!garments || garments.length === 0) return '高定套装';

  // 提取关键词
  const titles = garments.map((g) => g.title).join(' ');
  const subCats = garments.map((g) => g.subCategory || '').join(' ');
  const combined = (titles + ' ' + subCats).toLowerCase();

  if (combined.includes('阔腿裤') || combined.includes('长裤')) {
    if (combined.includes('亚麻') || combined.includes('棉麻')) return '亚麻阔腿';
    if (combined.includes('牛仔')) return '复古牛仔';
    return '垂顺长裤';
  }
  if (combined.includes('西装')) return '利落西装';
  if (combined.includes('风衣') || combined.includes('大衣')) return '潇洒大衣';
  if (combined.includes('衬衫')) return '质感衬衫';
  if (combined.includes('连衣裙') || combined.includes('短裙')) return '轻盈裙装';
  if (combined.includes('针织') || combined.includes('开衫')) return '软糯针织';
  if (combined.includes('卫衣') || combined.includes('t恤')) return '休闲卫衣';

  // 兜底返回主品类
  return garments[0]?.subCategory || garments[0]?.primaryCategory || '经典单品';
}

/**
 * AI 智能搭配起名与严格排重核验生成器
 * @param garments 当前穿戴的单品集合
 * @param sceneTag 搭配场景 (CASUAL, COMMUTE, DATE, VACATION, PARTY)
 * @param existingTitles 用户搭配库中已有的所有标题集合（用于排重核验）
 * @param currentTitle 当前输入框里的名字（避免再次生成相同名字）
 */
export function generateSmartOutfitTitle(
  garments: GarmentItem[],
  sceneTag: string = 'CASUAL',
  existingTitles: string[] = [],
  currentTitle?: string
): { title: string; styleTone: string } {
  const paletteAnalysis = extractOutfitColorPalette(garments);
  const dominantColorName = paletteAnalysis.palette[0]?.name || '纯色';
  const garmentFeature = extractGarmentFeatures(garments);
  const styleTone = paletteAnalysis.styleTone;

  const sceneList = SCENE_VIBES[sceneTag] || SCENE_VIBES.CASUAL;

  // 规范化已存在名称集合，方便快速严格核验
  const normalizedExisting = new Set(
    existingTitles.map((t) => (t || '').trim().toLowerCase())
  );
  const normalizedCurrent = (currentTitle || '').trim().toLowerCase();

  let finalTitle = '';
  let attempts = 0;
  const MAX_ATTEMPTS = 25;

  while (attempts < MAX_ATTEMPTS) {
    attempts++;

    // 随机选择组合模板
    const templateIdx = attempts % 4;
    const prefix = FASHION_PREFIXES[Math.floor(Math.random() * FASHION_PREFIXES.length)];
    const sceneVibe = sceneList[Math.floor(Math.random() * sceneList.length)];

    let candidate = '';
    switch (templateIdx) {
      case 0:
        // 格式: 静奢老钱 · 米白亚麻阔腿职场通勤
        candidate = `${prefix} · ${dominantColorName}${garmentFeature}${sceneVibe}`;
        break;
      case 1:
        // 格式: 早秋美拉德 · 浅灰蓝衬衫松弛日常
        candidate = `${styleTone} · ${dominantColorName}${garmentFeature}${sceneVibe}`;
        break;
      case 2:
        // 格式: 法式松弛 · 米白高定搭配辑
        candidate = `${prefix} · ${dominantColorName}${sceneVibe}搭配`;
        break;
      case 3:
      default:
        // 格式: 极简冷淡 · 亚麻阔腿穿搭公式
        candidate = `${prefix} · ${dominantColorName}${garmentFeature}公式`;
        break;
    }

    // 严格核验：不能与已存搭配重名，也不能与当前输入框内的名字完全相同
    const norm = candidate.trim().toLowerCase();
    if (!normalizedExisting.has(norm) && norm !== normalizedCurrent) {
      finalTitle = candidate;
      break;
    }
  }

  // 极端重名兜底：自动附加高定序数，确保 100% 独一无二
  if (!finalTitle) {
    const base = `${styleTone} · ${dominantColorName}${garmentFeature}${sceneList[0]}`;
    let counter = 1;
    while (true) {
      const roman = counter === 1 ? 'II' : counter === 2 ? 'III' : `Vol.${counter}`;
      const fallback = `${base} ${roman}`;
      if (!normalizedExisting.has(fallback.toLowerCase())) {
        finalTitle = fallback;
        break;
      }
      counter++;
    }
  }

  return {
    title: finalTitle,
    styleTone,
  };
}
