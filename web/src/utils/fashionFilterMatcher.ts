// ====================================================================
// SmartWardrobe 时尚色彩空间聚类与款式语义模糊匹配引擎
// 解决“AI 识别出微调细分颜色/款式与基准筛选器不一致导致0匹配”痛点
// ====================================================================

import { GarmentItem } from '@smart-wardrobe/shared';

// 12 标准基准色谱与色相元数据
export const COLOR_PALETTE = [
  { key: 'black', label: '黑色', hex: '#1A1A1A' },
  { key: 'white', label: '白色', hex: '#FFFFFF' },
  { key: 'grey', label: '灰色', hex: '#808080' },
  { key: 'beige', label: '米杏', hex: '#E8D8C8' },
  { key: 'red', label: '红色', hex: '#E74C3C' },
  { key: 'pink', label: '粉色', hex: '#FF85A2' },
  { key: 'orange', label: '橙色', hex: '#E67E22' },
  { key: 'yellow', label: '黄色', hex: '#F1C40F' },
  { key: 'green', label: '绿色', hex: '#2ECC71' },
  { key: 'blue', label: '蓝色', hex: '#3498DB' },
  { key: 'purple', label: '紫色', hex: '#9B59B6' },
  { key: 'brown', label: '棕褐', hex: '#8D6E63' },
];

export const SUB_CATEGORIES = [
  'T恤', '衬衫', '卫衣', '西装', '夹克', '大衣', '短裙', '长裤', '阔腿裤', '牛仔裤', '连衣裙', '礼服', '发冠/配饰'
];

export const PATTERN_OPTIONS = [
  { key: 'SOLID', label: '纯色' },
  { key: 'STRIPED', label: '条纹' },
  { key: 'PLAID', label: '格纹' },
  { key: 'FLORAL', label: '印花/碎花' },
];

// 中文/英文语义色系同义词库
const COLOR_SEMANTIC_KEYWORDS: Record<string, string[]> = {
  black: ['黑', '墨', '炭', '暗黑', '玄', 'black', 'charcoal', 'dark', 'noir'],
  white: ['白', '米白', '象牙', '奶白', '雪白', '本白', 'white', 'ivory', 'cream', 'blanc'],
  grey: ['灰', '麻灰', '银', '花灰', '烟灰', 'grey', 'gray', 'silver', 'slate'],
  beige: ['米', '杏', '卡其', '驼', '燕麦', '奶茶', '裸', '香槟', '浅咖', '原色', '麻', 'beige', 'khaki', 'nude', 'tan', 'camel', 'oatmeal'],
  red: ['红', '朱', '绯', '酒红', '砖红', '枫叶', 'red', 'burgundy', 'crimson', 'maroon', 'rouge'],
  pink: ['粉', '桃', '玫', '樱', '芭比粉', '皮粉', 'pink', 'rose', 'magenta'],
  orange: ['橙', '橘', '橘红', '珊瑚', '南瓜', 'orange', 'coral'],
  yellow: ['黄', '姜黄', '金', '柠檬', '鹅黄', '芥末', 'yellow', 'gold', 'mustard'],
  green: ['绿', '翠', '碧', '青草', '橄榄', '墨绿', '薄荷', '牛油果', '鼠尾草', '军绿', 'green', 'olive', 'mint', 'sage'],
  blue: ['蓝', '青', '牛仔', '藏青', '靛', '雾霾蓝', '克莱因', '浅灰蓝', 'navy', 'blue', 'denim', 'cyan', 'azure'],
  purple: ['紫', '罗兰', '薰衣草', '香芋', '紫藤', 'purple', 'violet', 'lavender', 'lilac'],
  brown: ['棕', '褐', '咖', '焦糖', '栗', '泥', '大地', '咖啡', '巧克力', '鳄鱼纹', '复古棕', 'brown', 'coffee', 'caramel', 'chocolate'],
};

// 款式同义词与包含关系词库
export const STYLE_SYNONYMS: Record<string, string[]> = {
  'T恤': ['t恤', '短袖', '圆领t', 'v领t', '打底衫', 'tee', 't-shirt'],
  '衬衫': ['衬衫', '衬衣', '短袖衬', '长袖衬', '翻领', '开领衫', 'shirt', 'blouse'],
  '卫衣': ['卫衣', '连帽衫', '套头衫', 'hoodie', 'sweatshirt'],
  '西装': ['西装', '西服', '西装外套', '小西装', 'blazer', 'suit'],
  '夹克': ['夹克', '棒球服', '飞行员', '皮衣', '夹克外套', 'jacket'],
  '大衣': ['大衣', '风衣', '毛呢', '羽绒服', '棉服', '毛呢大衣', 'coat', 'trench'],
  '短裙': ['短裙', '半身裙', '百褶裙', 'a字裙', '包臀裙', 'skirt'],
  '长裤': ['长裤', '休闲裤', '西裤', '卫裤', '直筒裤', '烟管裤', 'pants', 'trousers'],
  '阔腿裤': ['阔腿裤', '宽松裤', '喇叭裤', '垂坠裤', '拖地裤', 'wide leg'],
  '牛仔裤': ['牛仔裤', '牛仔长裤', '牛仔短裤', '丹宁', 'jeans', 'denim'],
  '连衣裙': ['连衣裙', '连身裙', '长裙', '吊带裙', '茶歇裙', 'dress'],
  '礼服': ['礼服', '晚礼服', '抹胸裙', '宴会裙', 'gown'],
  '发冠/配饰': ['配饰', '发冠', '帽子', '项链', '包', '腰带', '墨镜', '眼镜', '手提包', '腋下包', '托特包', '单肩包', '首饰', '耳环', 'accessory', 'bag', 'hat'],
};

/**
 * 任意 Hex 转换为 HSL 色彩空间参数
 */
export function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  if (!hex || typeof hex !== 'string') return null;
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  if (clean.length !== 6) return null;

  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;

  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * 将任意 Hex 映射至对应的基准色系 (支持多色系模糊归属，如浅灰蓝 -> blue + grey)
 */
export function classifyHexToColorKeys(hex: string): string[] {
  const hsl = hexToHsl(hex);
  if (!hsl) return [];
  const { h, s, l } = hsl;
  const matched = new Set<string>();

  // 1. 明度极限：黑 / 白
  if (l <= 22 || (s <= 20 && l <= 28)) {
    matched.add('black');
  }
  if (l >= 84 && s <= 22) {
    matched.add('white');
  }

  // 2. 低饱和中性色：灰 / 米杏
  if (s <= 22 && l > 22 && l < 86) {
    matched.add('grey');
  }
  if ((h >= 20 && h <= 55 && s <= 45 && l >= 55) || (h >= 25 && h <= 50 && l >= 65)) {
    matched.add('beige');
  }

  // 3. 色相色系匹配
  if (h >= 10 && h <= 45 && s >= 20 && l < 58) {
    matched.add('brown');
  }
  if ((h >= 345 || h <= 15) && s >= 20 && l > 20) {
    matched.add('red');
  }
  if (h >= 315 && h <= 350 && s >= 18 && l >= 45) {
    matched.add('pink');
  }
  if (h >= 15 && h <= 45 && s >= 45 && l >= 38) {
    matched.add('orange');
  }
  if (h >= 45 && h <= 68 && s >= 25 && l >= 38) {
    matched.add('yellow');
  }
  if (h >= 68 && h <= 168 && s >= 12) {
    matched.add('green');
  }
  if (h >= 168 && h <= 260 && s >= 10) {
    matched.add('blue');
  }
  if (h >= 260 && h <= 320 && s >= 12) {
    matched.add('purple');
  }

  return Array.from(matched);
}

/**
 * 校验单品是否匹配指定的目标基准色系
 */
export function isGarmentMatchingColor(garment: GarmentItem, targetColorKey: string): boolean {
  // 维度 1: 标题、子类目、颜色描述的语义关键词匹配
  const keywords = COLOR_SEMANTIC_KEYWORDS[targetColorKey] || [];
  const targetText = `${garment.title || ''} ${garment.subCategory || ''} ${((garment as any).colorNames || []).join(' ')}`.toLowerCase();
  if (keywords.some((kw) => targetText.includes(kw.toLowerCase()))) {
    return true;
  }

  // 维度 2: 单品具体 Hex 数组的 HSL 空间聚类归属匹配
  for (const rawHex of garment.colors || []) {
    const keys = classifyHexToColorKeys(rawHex);
    if (keys.includes(targetColorKey)) {
      return true;
    }
  }

  return false;
}

/**
 * 校验单品是否匹配指定的目标款式
 */
export function isGarmentMatchingSubCategory(garment: GarmentItem, targetSubCategory: string): boolean {
  const synonyms = STYLE_SYNONYMS[targetSubCategory] || [targetSubCategory];
  const targetText = `${garment.title || ''} ${garment.subCategory || ''}`.toLowerCase();
  return synonyms.some((syn) => targetText.includes(syn.toLowerCase()));
}
