// ====================================================================
// SmartWardrobe 时尚色彩空间聚类与款式语义模糊匹配引擎
// 解决“AI 识别出微调细分颜色/款式与基准筛选器不一致导致0匹配”痛点
// 提供 13 大基础色 + 彩色调色板，并支持单品与整套搭配的高定调色盘提取
// ====================================================================

import { GarmentItem } from '@smart-wardrobe/shared';

// 13 基础时装色系 + 彩色调色板 (极简直白，高定柔和调)
export const COLOR_PALETTE = [
  { key: 'black', label: '黑色', hex: '#1A1A1A' },
  { key: 'white', label: '白色', hex: '#FFFFFF' },
  { key: 'grey', label: '灰色', hex: '#8E8E93' },
  { key: 'beige', label: '米色', hex: '#E8D8C8' },
  { key: 'brown', label: '棕色', hex: '#7C533E' },
  { key: 'blue', label: '蓝色', hex: '#2A5298' },
  { key: 'green', label: '绿色', hex: '#4A6046' },
  { key: 'red', label: '红色', hex: '#A8202A' },
  { key: 'pink', label: '粉色', hex: '#D49A9A' },
  { key: 'yellow', label: '黄色', hex: '#D4A359' },
  { key: 'purple', label: '紫色', hex: '#867691' },
  { key: 'gold', label: '金色', hex: '#C5A059' },
  { key: 'silver', label: '银色', hex: '#B4B8BC' },
  { key: 'multicolor', label: '彩色', hex: 'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 50%, #FFE66D 100%)', isGradient: true },
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

export const SEASON_OPTIONS = [
  { key: 'SPRING_AUTUMN', label: '春秋' },
  { key: 'SUMMER', label: '夏季' },
  { key: 'WINTER', label: '冬季' },
  { key: 'ALL_SEASON', label: '四季通勤' },
];

export const OCCASION_OPTIONS = [
  { key: 'COMMUTE', label: '通勤职场' },
  { key: 'CASUAL', label: '休闲日常' },
  { key: 'DATING', label: '约会聚会' },
  { key: 'OUTDOOR', label: '运动户外' },
  { key: 'VACATION', label: '度假旅行' },
];

// 中文/英文语义色系同义词库
const COLOR_SEMANTIC_KEYWORDS: Record<string, string[]> = {
  black: ['黑', '墨', '炭', '暗黑', '玄', 'black', 'charcoal', 'dark', 'noir'],
  white: ['白', '米白', '象牙', '奶白', '雪白', '本白', 'white', 'ivory', 'cream', 'blanc'],
  grey: ['灰', '麻灰', '花灰', '烟灰', '水泥灰', 'grey', 'gray', 'slate'],
  beige: ['米', '杏', '卡其', '驼', '燕麦', '奶茶', '裸', '香槟', '浅咖', '原色', '麻', 'beige', 'khaki', 'nude', 'tan', 'camel', 'oatmeal'],
  red: ['红', '朱', '绯', '酒红', '砖红', '枫叶', '车厘子', 'red', 'burgundy', 'crimson', 'maroon', 'rouge'],
  pink: ['粉', '桃', '玫', '樱', '芭比粉', '皮粉', '干枯玫瑰', 'pink', 'rose', 'magenta'],
  yellow: ['黄', '姜黄', '柠檬', '鹅黄', '芥末', '浅黄', 'yellow', 'mustard'],
  green: ['绿', '翠', '碧', '青草', '橄榄', '墨绿', '薄荷', '牛油果', '鼠尾草', '军绿', 'green', 'olive', 'mint', 'sage'],
  blue: ['蓝', '青', '牛仔', '藏青', '靛', '雾霾蓝', '克莱因', '浅灰蓝', '天蓝', 'navy', 'blue', 'denim', 'cyan', 'azure'],
  purple: ['紫', '罗兰', '薰衣草', '香芋', '紫藤', '丁香', 'purple', 'violet', 'lavender', 'lilac'],
  brown: ['棕', '褐', '咖', '焦糖', '栗', '泥', '大地', '咖啡', '巧克力', '鳄鱼纹', '复古棕', 'brown', 'coffee', 'caramel', 'chocolate'],
  gold: ['金', '黄金', '黄铜', '香槟金', '玫瑰金', '金饰', 'gold', 'brass'],
  silver: ['银', '钛银', '白金', '冷银', '银灰', '银饰', '冷金属', 'silver', 'platinum', 'chrome'],
  multicolor: ['彩', '彩色', '多色', '拼色', '撞色', '花', '印花', '碎花', '条纹', '格纹', '扎染', '渐变', 'multicolor', 'floral', 'stripe', 'plaid'],
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
 * 将任意物理 Hex 映射至对应的 13 大基础基准色系 (连续物理色彩空间投影计算保底，绝无漏单)
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

  // 2. 金属色特征识别 (金/银)
  if (h >= 35 && h <= 52 && s >= 25 && s <= 80 && l >= 45 && l <= 75) {
    matched.add('gold');
  }
  if (s <= 15 && l >= 60 && l <= 85) {
    matched.add('silver');
  }

  // 3. 低饱和中性色：灰 / 米色
  if (s <= 22 && l > 22 && l < 86) {
    matched.add('grey');
  }
  if ((h >= 20 && h <= 55 && s <= 45 && l >= 55) || (h >= 25 && h <= 50 && l >= 65)) {
    matched.add('beige');
  }

  // 4. 色相连续扇区投影
  if (h >= 10 && h <= 45 && s >= 20 && l < 58) {
    matched.add('brown');
  }
  if ((h >= 345 || h <= 15) && s >= 20 && l > 20) {
    matched.add('red');
  }
  if (h >= 315 && h <= 350 && s >= 18 && l >= 45) {
    matched.add('pink');
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

  // 若仍未命中任何分类（极低饱和近中性），安全兜底至灰色
  if (matched.size === 0) {
    if (l < 50) matched.add('grey');
    else matched.add('beige');
  }

  return Array.from(matched);
}

/**
 * 校验单品是否匹配目标颜色 (双层双保险：语义包含 + 连续 HSL 空间计算 + 彩色判定)
 */
export function isGarmentMatchingColor(garment: GarmentItem, targetColorKey: string): boolean {
  // 特殊：彩色 (Multicolor) 判定
  if (targetColorKey === 'multicolor') {
    const isPatternMulti = (garment.patterns || []).some((p) =>
      ['STRIPED', 'PLAID', 'FLORAL', '条纹', '格纹', '印花', '碎花', '拼色'].some((k) =>
        (p || '').toUpperCase().includes(k) || (garment.title || '').includes(k)
      )
    );
    const hasMultipleColors = (garment.colors || []).length >= 2;
    const hasMultiName = ((garment as any).colorNames || []).some((n: string) =>
      ['彩', '拼色', '撞色', '花', '杂色', '渐变'].some((kw) => n.includes(kw))
    );
    if (isPatternMulti || hasMultipleColors || hasMultiName) {
      return true;
    }
  }

  // 维度 1: 标题、子类目、细化颜色名称的语义关键词模糊匹配
  const keywords = COLOR_SEMANTIC_KEYWORDS[targetColorKey] || [];
  const targetText = `${garment.title || ''} ${garment.subCategory || ''} ${((garment as any).colorNames || []).join(' ')}`.toLowerCase();
  if (keywords.some((kw) => targetText.includes(kw.toLowerCase()))) {
    return true;
  }

  // 维度 2: 单品物理 Hex 数组在 HSL 空间中的连续投影匹配
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

// --------------------------------------------------------------------
// 高定调色盘 (Look Palette) 提取引擎
// 动态聚合整套搭配中各单品的真实细化颜色、生成色卡与风格审美标签
// --------------------------------------------------------------------

export interface OutfitPaletteItem {
  hex: string;
  name: string;
  categoryLabel?: string;
}

export interface OutfitColorAnalysis {
  palette: OutfitPaletteItem[];
  styleTone: string; // e.g. "低饱和莫兰迪调" | "大地美拉德调" | "黑白极简风"
  colorCount: number;
}

/**
 * 根据物理 Hex 推测优雅的高定中文色名 (当单品未自带精确色名时的保底生成器)
 */
export function getPoeticColorName(hex: string): string {
  const hsl = hexToHsl(hex);
  if (!hsl) return '高定原色';
  const { h, s, l } = hsl;

  if (l <= 18) return '曜石黑';
  if (l >= 88 && s <= 18) return '象牙白';
  if (s <= 18) {
    if (l >= 65) return '燕麦浅灰';
    return '冷岩深灰';
  }
  if (h >= 20 && h <= 55 && s <= 45 && l >= 55) return '奶茶米杏';
  if (h >= 10 && h <= 45 && l < 55) return '焦糖暖棕';
  if (h >= 168 && h <= 250) {
    if (l < 35) return '深海藏青';
    if (s <= 35) return '雾霾灰蓝';
    return '经典丹宁蓝';
  }
  if (h >= 68 && h <= 168) {
    if (s <= 35) return '鼠尾草绿';
    return '橄榄墨绿';
  }
  if (h >= 345 || h <= 15) {
    if (l < 40) return '勃艮第酒红';
    return '砖红复古';
  }
  if (h >= 315 && h <= 345) return '烟粉茱萸';
  if (h >= 45 && h <= 68) return '复古姜黄';
  if (h >= 260 && h <= 320) return '香芋灰紫';

  return '高级定制色';
}

/**
 * 从多件穿戴单品中提取整套搭配的【高定调色盘】
 */
export function extractOutfitColorPalette(garments: GarmentItem[]): OutfitColorAnalysis {
  const extracted: OutfitPaletteItem[] = [];
  const seenHex = new Set<string>();

  for (const g of garments) {
    const rawColors = g.colors || [];
    const rawNames = (g as any).colorNames || [];

    for (let i = 0; i < rawColors.length; i++) {
      const hex = rawColors[i].toUpperCase();
      if (!seenHex.has(hex)) {
        seenHex.add(hex);
        const name = rawNames[i] || getPoeticColorName(hex);
        extracted.push({
          hex,
          name,
          categoryLabel: g.primaryCategory,
        });
      }
      if (extracted.length >= 4) break;
    }
    if (extracted.length >= 4) break;
  }

  // 若为空，使用极简高定兜底
  if (extracted.length === 0) {
    extracted.push(
      { hex: '#2D3436', name: '曜石黑' },
      { hex: '#FAF8F5', name: '象牙白' }
    );
  }

  // 风格基调判定 (基于色调分布推导审美标签)
  let styleTone = '极简经典调';
  const hasBrown = extracted.some((c) => {
    const hsl = hexToHsl(c.hex);
    return hsl && hsl.h >= 10 && hsl.h <= 45 && hsl.l < 60;
  });
  const hasLowSat = extracted.every((c) => {
    const hsl = hexToHsl(c.hex);
    return !hsl || hsl.s <= 40;
  });
  const hasNavyOrBlue = extracted.some((c) => {
    const hsl = hexToHsl(c.hex);
    return hsl && hsl.h >= 168 && hsl.h <= 250;
  });

  if (hasBrown) {
    styleTone = '大地美拉德调';
  } else if (hasLowSat && hasNavyOrBlue) {
    styleTone = '清爽莫兰迪调';
  } else if (hasLowSat) {
    styleTone = '静奢低饱和调';
  } else if (extracted.length >= 3) {
    styleTone = '层次进阶撞色调';
  }

  return {
    palette: extracted,
    styleTone,
    colorCount: extracted.length,
  };
}
