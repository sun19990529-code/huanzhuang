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
  basePngUrl?: string,
  secondaryPngUrl?: string
): GarmentAssetItem[] {
  const url = basePngUrl || getDefaultGarmentSvg(category);
  const isDataUrl = url.startsWith('data:image');
  const secondaryUrl = secondaryPngUrl || (isDataUrl ? url : url.replace('.png', category === 'OUTERWEAR' ? '_closed.png' : '_tucked.png'));

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
        pngUrl: secondaryUrl,
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
        pngUrl: secondaryUrl,
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

export type FemaleBodyTypeKey = 'HOURGLASS' | 'PEAR' | 'RECTANGLE' | 'INVERTED_TRIANGLE' | 'APPLE';
export type MaleBodyTypeKey = 'ATHLETIC' | 'AVERAGE' | 'SLIM' | 'ROBUST';
export type BodyTypeKey = FemaleBodyTypeKey | MaleBodyTypeKey;

export const FEMALE_BODY_TYPE_CONFIGS: Array<{ key: FemaleBodyTypeKey; label: string; desc: string }> = [
  { key: 'HOURGLASS', label: '沙漏型', desc: '胸臀丰满，细腰明显' },
  { key: 'PEAR', label: '梨型', desc: '肩窄腰细，臀部丰满' },
  { key: 'RECTANGLE', label: 'H 矩形', desc: '胸腰臀线条平缓匀称' },
  { key: 'INVERTED_TRIANGLE', label: '倒三角', desc: '肩部较宽，下身纤细' },
  { key: 'APPLE', label: '苹果型', desc: '上身圆润，腰腹饱满' },
];

export const MALE_BODY_TYPE_CONFIGS: Array<{ key: MaleBodyTypeKey; label: string; desc: string }> = [
  { key: 'ATHLETIC', label: '倒三角健美型', desc: '宽肩阔背，紧实细腰' },
  { key: 'AVERAGE', label: '匀称标准型', desc: '比例协调，线条自然' },
  { key: 'SLIM', label: '修长消瘦型', desc: '骨架细长，清瘦轻盈' },
  { key: 'ROBUST', label: '微胖丰满型', desc: '骨架厚实，体态饱满' },
];

export const SKIN_TONE_CONFIGS = [
  { key: 'FAIR', label: '冷白皮', hex: '#FDF1E7', desc: '白皙剔透冷调' },
  { key: 'WARM_NATURAL', label: '自然暖杏', hex: '#F3DEC9', desc: '健康自然微光' },
  { key: 'WHEAT_TAN', label: '健康小麦', hex: '#DDB68F', desc: '阳光健康暖棕' },
  { key: 'BRONZE_DEEP', label: '古铜深色', hex: '#9C7A5B', desc: '高级深邃古铜' },
];

export const HAIRSTYLE_CONFIGS = {
  FEMALE: [
    { key: 'KEEP_PHOTO', label: '保持照片原发型', desc: '1:1 原生发型发色与刘海' },
    { key: 'FRENCH_WAVY_LONG', label: '法式大波浪微卷', desc: '蓬松优雅，锁骨下及胸' },
    { key: 'SLEEK_HIGH_PONYTAIL', label: '高颅顶高马尾', desc: '干练俐落，微碎刘海' },
    { key: 'COLLARBONE_BOB', label: '齐肩轻盈锁骨发', desc: '随性自然，层次感内扣' },
    { key: 'KOREAN_HALF_UP', label: '韩系半扎公主发', desc: '温婉甜美，两侧微卷碎发' },
    { key: 'PIXIE_SHORT', label: '清爽超短发', desc: '帅气洒脱，纹理感碎发' },
    { key: 'RETRO_SHORT_CURL', label: '复古微卷短发', desc: '摩登复古，微蓬港风' },
  ],
  MALE: [
    { key: 'KEEP_PHOTO', label: '保持照片原发型', desc: '1:1 原生发型' },
    { key: 'CLEAN_SHORT', label: '清爽层次短发', desc: '阳光干练寸短' },
    { key: 'TEXTURED_CROP', label: '韩系碎盖前刺', desc: '潮流微蓬前刺' },
    { key: 'SIDE_PART_SLICK', label: '复古二八分大背头', desc: '绅士成熟油头' },
    { key: 'MEDIUM_WAVY', label: '日系中长微卷', desc: '慵懒文艺微卷' },
  ],
};

export function calculateBmi(heightCm: number, weightKg: number): { bmi: number; label: string; color: string } {
  if (!heightCm || !weightKg) return { bmi: 21, label: '匀称', color: '#10B981' };
  const hM = heightCm / 100;
  const bmi = Number((weightKg / (hM * hM)).toFixed(1));
  if (bmi < 18.5) return { bmi, label: '清瘦苗条', color: '#3B82F6' };
  if (bmi < 24) return { bmi, label: '健康匀称', color: '#10B981' };
  if (bmi < 28) return { bmi, label: '丰满饱满', color: '#F59E0B' };
  return { bmi, label: '丰腴厚实', color: '#EF4444' };
}

export function calculateWhr(waistCm: number, hipsCm: number): { whr: number; label: string } {
  if (!waistCm || !hipsCm) return { whr: 0.7, label: '黄金腰臀比' };
  const whr = Number((waistCm / hipsCm).toFixed(2));
  if (whr <= 0.72) return { whr, label: '极致沙漏腰臀比' };
  if (whr <= 0.80) return { whr, label: '标准匀称腰臀比' };
  return { whr, label: '平缓腰腹比例' };
}

/**
 * 根据三围与身高体重纯数学推导人体体型 (ISO 8559 & GB/T 1335)
 */
export function deriveBodyTypeFromMeasurements(
  gender: 'MALE' | 'FEMALE' | 'OTHER',
  bustCm: number,
  waistCm: number,
  hipsCm: number,
  heightCm: number,
  weightKg: number
): BodyTypeKey {
  if (gender === 'MALE') {
    const chestWaistDiff = bustCm - waistCm;
    const bmi = weightKg / Math.pow(heightCm / 100, 2);
    if (bmi >= 25 || waistCm >= hipsCm) return 'ROBUST';
    if (chestWaistDiff >= 15) return 'ATHLETIC';
    if (bmi < 19) return 'SLIM';
    return 'AVERAGE';
  }

  const bustHipsDiff = bustCm - hipsCm;
  const hipsBustDiff = hipsCm - bustCm;
  const hipsWaistDiff = hipsCm - waistCm;
  const bustWaistDiff = bustCm - waistCm;
  const whr = waistCm / hipsCm;

  // 1. 苹果型：腰腹饱满，腰臀比 >= 0.83 或腰围接近胸围
  if (whr >= 0.83 || waistCm >= bustCm - 6) return 'APPLE';

  // 2. 梨型：臀围比胸围大 >= 6cm 且臀围比腰围大 >= 18cm
  if (hipsBustDiff >= 6 && hipsWaistDiff >= 18) return 'PEAR';

  // 3. 倒三角型：胸围比臀围大 >= 6cm 且胸腰差大
  if (bustHipsDiff >= 6 && bustWaistDiff >= 14) return 'INVERTED_TRIANGLE';

  // 4. 沙漏型：胸臀围相当且丰满，细腰明显
  if (Math.abs(bustHipsDiff) <= 5 && hipsWaistDiff >= 18 && bustWaistDiff >= 16) return 'HOURGLASS';

  // 5. 矩形 / H 型：胸腰臀落差平缓
  return 'RECTANGLE';
}

/**
 * 根据体型模板与身高，反向推导推荐的基准三围与体重
 */
export function getBodyTypePresetMeasurements(
  gender: 'MALE' | 'FEMALE' | 'OTHER',
  bodyType: BodyTypeKey | string,
  heightCm: number
): { weightKg: number; bustCm: number; waistCm: number; hipsCm: number } {
  const baseGolden = calculateGoldenRatioBody(gender, heightCm);

  if (gender === 'MALE') {
    switch (bodyType) {
      case 'ATHLETIC':
        return {
          weightKg: Number((baseGolden.weightKg * 1.05).toFixed(1)),
          bustCm: Number((baseGolden.bustCm + 5).toFixed(1)),
          waistCm: Number((baseGolden.waistCm - 3).toFixed(1)),
          hipsCm: Number(baseGolden.hipsCm.toFixed(1)),
        };
      case 'SLIM':
        return {
          weightKg: Number((baseGolden.weightKg * 0.86).toFixed(1)),
          bustCm: Number((baseGolden.bustCm - 4).toFixed(1)),
          waistCm: Number((baseGolden.waistCm - 4).toFixed(1)),
          hipsCm: Number((baseGolden.hipsCm - 3).toFixed(1)),
        };
      case 'ROBUST':
        return {
          weightKg: Number((baseGolden.weightKg * 1.20).toFixed(1)),
          bustCm: Number((baseGolden.bustCm + 6).toFixed(1)),
          waistCm: Number((baseGolden.waistCm + 10).toFixed(1)),
          hipsCm: Number((baseGolden.hipsCm + 6).toFixed(1)),
        };
      default:
        return baseGolden;
    }
  }

  // 女性预设
  switch (bodyType) {
    case 'PEAR':
      return {
        weightKg: Number((baseGolden.weightKg * 1.02).toFixed(1)),
        bustCm: Number((baseGolden.bustCm - 3).toFixed(1)),
        waistCm: Number((baseGolden.waistCm - 1).toFixed(1)),
        hipsCm: Number((baseGolden.hipsCm + 7).toFixed(1)),
      };
    case 'APPLE':
      return {
        weightKg: Number((baseGolden.weightKg * 1.08).toFixed(1)),
        bustCm: Number((baseGolden.bustCm + 3).toFixed(1)),
        waistCm: Number((baseGolden.waistCm + 8).toFixed(1)),
        hipsCm: Number((baseGolden.hipsCm + 1).toFixed(1)),
      };
    case 'INVERTED_TRIANGLE':
      return {
        weightKg: Number(baseGolden.weightKg.toFixed(1)),
        bustCm: Number((baseGolden.bustCm + 6).toFixed(1)),
        waistCm: Number(baseGolden.waistCm.toFixed(1)),
        hipsCm: Number((baseGolden.hipsCm - 4).toFixed(1)),
      };
    case 'RECTANGLE':
      return {
        weightKg: Number((baseGolden.weightKg * 0.94).toFixed(1)),
        bustCm: Number((baseGolden.bustCm - 2).toFixed(1)),
        waistCm: Number((baseGolden.waistCm + 3).toFixed(1)),
        hipsCm: Number((baseGolden.hipsCm - 2).toFixed(1)),
      };
    case 'HOURGLASS':
    default:
      return {
        weightKg: Number(baseGolden.weightKg.toFixed(1)),
        bustCm: Number((baseGolden.bustCm + 2).toFixed(1)),
        waistCm: Number((baseGolden.waistCm - 2).toFixed(1)),
        hipsCm: Number((baseGolden.hipsCm + 2).toFixed(1)),
      };
  }
}
