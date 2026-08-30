// ====================================================================
// SmartWardrobe 图层层级权重 (Z-Index Matrix) 与状态机运算规范
// ====================================================================

import { GarmentCategory, GarmentState } from './types.js';

export interface LayerWeightConfig {
  code: string;
  category: GarmentCategory | 'AVATAR';
  name: string;
  baseZIndex: number;
}

export const BASE_LAYER_WEIGHTS: Record<string, LayerWeightConfig> = {
  AVATAR: { code: 'L0', category: 'AVATAR', name: '人物素体', baseZIndex: 0 },
  TOPS: { code: 'L1', category: 'TOPS', name: '内搭/T恤/衬衫', baseZIndex: 10 },
  BOTTOMS: { code: 'L2', category: 'BOTTOMS', name: '下装', baseZIndex: 20 },
  MID_LAYER: { code: 'L3', category: 'ONE_PIECE', name: '中层保暖/马甲', baseZIndex: 30 },
  OUTERWEAR: { code: 'L4', category: 'OUTERWEAR', name: '外套/夹克/大衣', baseZIndex: 40 },
  FOOTWEAR: { code: 'L5', category: 'FOOTWEAR', name: '鞋袜', baseZIndex: 50 },
  ACCESSORIES: { code: 'L6', category: 'ACCESSORIES', name: '配饰/包/帽子', baseZIndex: 60 },
};

/**
 * 状态修饰修正值 (Delta State Modifier)
 */
export function getStateModifier(
  category: GarmentCategory,
  state: GarmentState
): number {
  if (category === 'TOPS') {
    if (state === 'UNTUCKED') {
      return 15; // L1-Untuck: 10 + 15 = 25 (覆盖 L2 下装腰线)
    }
    if (state === 'TUCKED' || state === 'DEFAULT') {
      return 0; // 塞衣角保持 10 (低于下装 20)
    }
  }

  if (category === 'OUTERWEAR') {
    if (state === 'CLOSED') {
      return 5; // 外套合拢: 40 + 5 = 45 (完全遮盖中层与内搭)
    }
    if (state === 'OPEN' || state === 'DEFAULT') {
      return 0; // 外套敞开保持 40
    }
  }

  return 0;
}

/**
 * 实时图层绝对层级计算公式:
 * Render_Z_Index = Base_Layer_Weight + Delta_State_Modifier + User_Offset
 */
export function calculateRenderZIndex(
  category: GarmentCategory,
  state: GarmentState = 'DEFAULT',
  userOffset = 0
): number {
  const baseWeight = BASE_LAYER_WEIGHTS[category]?.baseZIndex ?? 10;
  const modifier = getStateModifier(category, state);
  return baseWeight + modifier + userOffset;
}

/**
 * 判断两个类目是否存在同层互斥（如：上衣换上衣，同层单品脱下）
 */
export function isMutuallyExclusive(
  cat1: GarmentCategory,
  cat2: GarmentCategory
): boolean {
  if (cat1 === 'ONE_PIECE' && (cat2 === 'TOPS' || cat2 === 'BOTTOMS')) return true;
  if (cat2 === 'ONE_PIECE' && (cat1 === 'TOPS' || cat1 === 'BOTTOMS')) return true;
  return cat1 === cat2;
}
