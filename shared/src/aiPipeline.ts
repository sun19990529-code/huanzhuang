// ====================================================================
// SmartWardrobe AI 多模态视觉标准化流水线与切片裂变引擎 (V2.5)
// ====================================================================

import {
  GarmentCategory,
  GarmentState,
  GarmentAssetItem,
  GarmentItem,
  UserProfile,
  UserAvatar,
} from './types.js';

export interface GarmentVisionAnalysis {
  primaryCategory: GarmentCategory;
  subCategory: string;
  colors: string[];
  colorNames: string[];
  patterns: string[];
  material: string;
  silhouette: string; // 修身, 宽松, 廓形等
}

export interface SegmentedGarmentItem {
  tempId: string;
  title: string;
  primaryCategory: GarmentCategory;
  subCategory: string;
  colors: string[];
  colorNames: string[];
  confidence: number;
  assets: GarmentAssetItem[];
}

/**
 * 模拟 Vision LLM 视觉多模态结构化打标 (PRD 3.2.2)
 */
export function analyzeGarmentAttributes(
  title: string,
  categoryHint?: GarmentCategory
): GarmentVisionAnalysis {
  let primaryCategory: GarmentCategory = categoryHint || 'TOPS';
  let subCategory = 'T-Shirt';
  let colors = ['#2E7D32', '#FFFFFF'];
  let colorNames = ['复古森林绿', '纯白'];
  let patterns = ['STRIPED'];
  let material = '100% 精梳纯棉';
  let silhouette = '微宽松落肩版型';

  const t = title.toLowerCase();
  if (t.includes('西装') || t.includes('大衣') || t.includes('夹克') || t.includes('blazer') || t.includes('coat')) {
    primaryCategory = 'OUTERWEAR';
    subCategory = 'Blazer';
    colors = ['#D7CCC8', '#8D6E63'];
    colorNames = ['米燕麦色', '深卡其'];
    patterns = ['SOLID'];
    material = '羊毛高阶混纺';
    silhouette = '法式复古廓形';
  } else if (t.includes('裤') || t.includes('裙') || t.includes('jeans') || t.includes('pants')) {
    primaryCategory = 'BOTTOMS';
    subCategory = t.includes('裙') ? 'Skirt' : 'Jeans';
    colors = ['#5C6BC0'];
    colorNames = ['复古丹宁蓝'];
    patterns = ['SOLID'];
    material = '高支重磅牛仔布';
    silhouette = '高腰直筒微阔';
  } else if (t.includes('鞋') || t.includes('sneaker') || t.includes('boots')) {
    primaryCategory = 'FOOTWEAR';
    subCategory = 'Sneakers';
    colors = ['#EEEEEE', '#8D6E63'];
    colorNames = ['米灰白', '复古棕'];
    patterns = ['SOLID'];
    material = '牛剖层革+生胶大底';
    silhouette = '德训低帮';
  } else if (t.includes('帽') || t.includes('包') || t.includes('hat') || t.includes('bag')) {
    primaryCategory = 'ACCESSORIES';
    subCategory = 'Hat';
    colors = ['#212121'];
    colorNames = ['经典纯黑'];
    patterns = ['SOLID'];
    material = '100% 澳大利亚美利奴羊毛';
    silhouette = '法式贝雷';
  }

  return {
    primaryCategory,
    subCategory,
    colors,
    colorNames,
    patterns,
    material,
    silhouette,
  };
}

/**
 * 多态标准资产自动裂变生成器 (Ghost Mannequin Splitting - PRD 3.2.2)
 * 外套自动裂变为 state_open 与 state_closed
 * 上装自动裂变为 DEFAULT 与 TUCKED
 */
export function getDefaultGarmentSvg(category: GarmentCategory, color = '#D63031'): string {
  let path = 'M30 20 L70 20 L85 40 L70 45 L70 85 L30 85 L30 45 L15 40 Z';
  if (category === 'BOTTOMS') path = 'M30 15 L70 15 L75 85 L53 85 L50 40 L47 85 L25 85 Z';
  if (category === 'OUTERWEAR') path = 'M25 15 L75 15 L90 45 L75 50 L75 88 L25 88 L25 50 L10 45 Z';
  if (category === 'FOOTWEAR') path = 'M20 50 L50 50 L80 65 L80 80 L20 80 Z';
  if (category === 'ACCESSORIES') path = 'M50 20 C65 20 75 35 75 50 C75 65 65 80 50 80 C35 80 25 65 25 50 C25 35 35 20 50 20 Z';
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="${color}"><rect width="100" height="100" fill="#FAF8F5" rx="16"/><path d="${path}" opacity="0.85"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function generateFissionAssets(
  garmentId: string,
  category: GarmentCategory,
  basePngUrl?: string
): GarmentAssetItem[] {
  const url = basePngUrl || getDefaultGarmentSvg(category);
  const isDataUrl = url.startsWith('data:image');

  if (category === 'OUTERWEAR') {
    return [
      {
        id: `${garmentId}-asset-open`,
        garmentId,
        stateType: 'OPEN',
        pngUrl: isDataUrl ? url : url.replace('.png', '_open.png'),
        boundingBox: { x: 0.30, y: 0.27, w: 0.40, h: 0.38 },
        defaultAnchor: { x: 0.5, y: 0.28 },
        baseLayerWeight: 40,
      },
      {
        id: `${garmentId}-asset-closed`,
        garmentId,
        stateType: 'CLOSED',
        pngUrl: isDataUrl ? url : url.replace('.png', '_closed.png'),
        boundingBox: { x: 0.30, y: 0.27, w: 0.40, h: 0.38 },
        defaultAnchor: { x: 0.5, y: 0.28 },
        baseLayerWeight: 45,
      },
    ];
  }

  if (category === 'TOPS') {
    return [
      {
        id: `${garmentId}-asset-default`,
        garmentId,
        stateType: 'DEFAULT',
        pngUrl: url,
        boundingBox: { x: 0.35, y: 0.28, w: 0.30, h: 0.25 },
        defaultAnchor: { x: 0.5, y: 0.28 },
        baseLayerWeight: 10,
      },
      {
        id: `${garmentId}-asset-tucked`,
        garmentId,
        stateType: 'TUCKED',
        pngUrl: isDataUrl ? url : url.replace('.png', '_tucked.png'),
        boundingBox: { x: 0.35, y: 0.28, w: 0.30, h: 0.22 },
        defaultAnchor: { x: 0.5, y: 0.28 },
        baseLayerWeight: 10,
      },
    ];
  }

  if (category === 'BOTTOMS') {
    return [
      {
        id: `${garmentId}-asset-default`,
        garmentId,
        stateType: 'DEFAULT',
        pngUrl: url,
        boundingBox: { x: 0.36, y: 0.50, w: 0.28, h: 0.40 },
        defaultAnchor: { x: 0.5, y: 0.53 },
        baseLayerWeight: 20,
      },
    ];
  }

  if (category === 'FOOTWEAR') {
    return [
      {
        id: `${garmentId}-asset-default`,
        garmentId,
        stateType: 'DEFAULT',
        pngUrl: url,
        boundingBox: { x: 0.38, y: 0.86, w: 0.24, h: 0.10 },
        defaultAnchor: { x: 0.5, y: 0.88 },
        baseLayerWeight: 50,
      },
    ];
  }

  // ACCESSORIES
  return [
    {
      id: `${garmentId}-asset-default`,
      garmentId,
      stateType: 'DEFAULT',
      pngUrl: url,
      boundingBox: { x: 0.42, y: 0.08, w: 0.16, h: 0.08 },
      defaultAnchor: { x: 0.5, y: 0.12 },
      baseLayerWeight: 60,
    },
  ];
}

/**
 * 一拍多衣：多目标实例分割与结构化提取 (One-Shot Multi-Garment Segmentation - V2.5)
 * 接收单张照片，自动剥离出 2~4 件独立单品切片
 */
export function segmentMultiGarments(
  imageHint = 'photo'
): { items: SegmentedGarmentItem[]; costCredits: number; message: string } {
  const items: SegmentedGarmentItem[] = [
    {
      tempId: `seg-${Date.now()}-1`,
      title: '法式米杏色小香风西装外套',
      primaryCategory: 'OUTERWEAR',
      subCategory: 'Blazer',
      colors: ['#D7CCC8'],
      colorNames: ['米杏色'],
      confidence: 0.98,
      assets: generateFissionAssets(`seg-1`, 'OUTERWEAR'),
    },
    {
      tempId: `seg-${Date.now()}-2`,
      title: '简约纯棉字母印花短袖T恤',
      primaryCategory: 'TOPS',
      subCategory: 'T-Shirt',
      colors: ['#FFFFFF', '#212121'],
      colorNames: ['珍珠白', '墨黑'],
      confidence: 0.96,
      assets: generateFissionAssets(`seg-2`, 'TOPS'),
    },
    {
      tempId: `seg-${Date.now()}-3`,
      title: '复古高腰微喇水洗牛仔裤',
      primaryCategory: 'BOTTOMS',
      subCategory: 'Jeans',
      colors: ['#5C6BC0'],
      colorNames: ['复古丹宁蓝'],
      confidence: 0.95,
      assets: generateFissionAssets(`seg-3`, 'BOTTOMS'),
    },
  ];

  const count = items.length;
  const costCredits = count >= 2 ? 2 : 1;
  const message =
    count >= 2
      ? `🌸 哇！一次性捕获了 ${count} 件心动单品，已享打包优惠（仅消耗 2 积分）～`
      : `✨ 发现 1 件漂亮单品～已为您贴心按单件标准结算（仅消耗 1 积分）`;

  return { items, costCredits, message };
}

/**
 * “今天穿什么”：基于温度与层叠逻辑的智能穿搭推演 (Capsule Slot Machine Engine - V2.5)
 */
export function generateWeatherOutfitSuggestion(
  garments: GarmentItem[],
  temperatureC = 22,
  lockedGarmentIds: string[] = []
): {
  selectedGarments: GarmentItem[];
  appliedStates: Record<string, GarmentState>;
  description: string;
} {
  const tops = garments.filter((g) => g.primaryCategory === 'TOPS');
  const bottoms = garments.filter((g) => g.primaryCategory === 'BOTTOMS');
  const outerwear = garments.filter((g) => g.primaryCategory === 'OUTERWEAR');
  const footwear = garments.filter((g) => g.primaryCategory === 'FOOTWEAR');

  const selectedGarments: GarmentItem[] = [];
  const appliedStates: Record<string, GarmentState> = {};

  // 1. 保留已锁定的单品
  lockedGarmentIds.forEach((id) => {
    const locked = garments.find((g) => g.id === id);
    if (locked) {
      selectedGarments.push(locked);
      appliedStates[locked.id] = locked.primaryCategory === 'OUTERWEAR' ? 'OPEN' : 'DEFAULT';
    }
  });

  // 2. 如果未锁定上装，随机抽取一件
  if (!selectedGarments.some((g) => g.primaryCategory === 'TOPS') && tops.length > 0) {
    const pickTop = tops[Math.floor(Math.random() * tops.length)];
    selectedGarments.push(pickTop);
    appliedStates[pickTop.id] = 'TUCKED';
  }

  // 3. 如果未锁定下装，随机抽取一件
  if (!selectedGarments.some((g) => g.primaryCategory === 'BOTTOMS') && bottoms.length > 0) {
    const pickBottom = bottoms[Math.floor(Math.random() * bottoms.length)];
    selectedGarments.push(pickBottom);
    appliedStates[pickBottom.id] = 'DEFAULT';
  }

  // 4. 根据温度决定是否加外搭 (<24°C 推荐外搭)
  if (temperatureC < 24 && !selectedGarments.some((g) => g.primaryCategory === 'OUTERWEAR') && outerwear.length > 0) {
    const pickOuter = outerwear[Math.floor(Math.random() * outerwear.length)];
    selectedGarments.push(pickOuter);
    appliedStates[pickOuter.id] = 'OPEN';
  }

  // 5. 鞋履
  if (!selectedGarments.some((g) => g.primaryCategory === 'FOOTWEAR') && footwear.length > 0) {
    const pickFoot = footwear[Math.floor(Math.random() * footwear.length)];
    selectedGarments.push(pickFoot);
    appliedStates[pickFoot.id] = 'DEFAULT';
  }

  const desc =
    temperatureC < 20
      ? `气温 ${temperatureC}°C 微凉，建议法式西装敞开叠穿 + 塞衣角，保暖又有层次感 ✨`
      : `气温 ${temperatureC}°C 舒适宜人，简约短袖配高腰裤，清爽显高出片 🎀`;

  return {
    selectedGarments,
    appliedStates,
    description: desc,
  };
}

/**
 * 黄金比例标准参数计算 (Golden Ratio Body Estimator - PRD 3.1.1 & 3.2.1)
 */
export function calculateGoldenRatioBody(gender: 'MALE' | 'FEMALE' | 'OTHER', heightCm = 168): {
  weightKg: number;
  bustCm: number;
  waistCm: number;
  hipsCm: number;
} {
  if (gender === 'MALE') {
    const weightKg = Number(((heightCm - 100) * 0.9).toFixed(1));
    const bustCm = Number((heightCm * 0.53).toFixed(1));
    const waistCm = Number((heightCm * 0.43).toFixed(1));
    const hipsCm = Number((heightCm * 0.52).toFixed(1));
    return { weightKg, bustCm, waistCm, hipsCm };
  }

  const weightKg = Number(((heightCm - 105) * 0.92).toFixed(1));
  const bustCm = Number((heightCm * 0.51).toFixed(1));
  const waistCm = Number((heightCm * 0.37).toFixed(1));
  const hipsCm = Number((heightCm * 0.53).toFixed(1));
  return { weightKg, bustCm, waistCm, hipsCm };
}
