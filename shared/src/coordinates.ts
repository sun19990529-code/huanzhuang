// ====================================================================
// SmartWardrobe 跨端 2D 归一化几何与智能吸附算法规范
// ====================================================================

import { NormalizedPoint, PixelPoint, CanvasDimensions } from './types.js';

/**
 * 归一化坐标转换为实际物理画布像素坐标
 * Pixel_X = Normalized_X * W_px
 * Pixel_Y = Normalized_Y * H_px
 */
export function normalizedToPixel(
  point: NormalizedPoint,
  canvas: CanvasDimensions
): PixelPoint {
  return {
    x: Math.round(point.x * canvas.width * 100) / 100,
    y: Math.round(point.y * canvas.height * 100) / 100,
  };
}

/**
 * 物理画布像素坐标转换为归一化虚拟坐标 (0.0000 ~ 1.0000)
 */
export function pixelToNormalized(
  pixel: PixelPoint,
  canvas: CanvasDimensions
): NormalizedPoint {
  if (canvas.width <= 0 || canvas.height <= 0) {
    return { x: 0, y: 0 };
  }
  const nx = Math.max(0, Math.min(1, pixel.x / canvas.width));
  const ny = Math.max(0, Math.min(1, pixel.y / canvas.height));
  return {
    x: Number(nx.toFixed(4)),
    y: Number(ny.toFixed(4)),
  };
}

/**
 * 计算两点在归一化空间中的欧几里得距离
 * Dist = sqrt((x1 - x2)^2 + (y1 - y2)^2)
 */
export function calculateNormalizedDistance(
  p1: NormalizedPoint,
  p2: NormalizedPoint
): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 默认吸附阈值（8% 相对归一化距离）
 */
export const DEFAULT_SNAP_THRESHOLD = 0.08;

export interface SnapTarget {
  name: string;
  anchor: NormalizedPoint;
  presetOffset?: NormalizedPoint;
}

export interface SnapResult {
  isSnapped: boolean;
  targetName?: string;
  distance: number;
  snappedPosition: NormalizedPoint;
}

/**
 * 智能骨骼锚点吸附计算 (Snap Calculation)
 * @param currentPos 衣物当前归一化中心基准点
 * @param anchors 候选骨骼锚点集合
 * @param threshold 吸附阈值（默认 0.08）
 */
export function evaluateSnapAlignment(
  currentPos: NormalizedPoint,
  anchors: SnapTarget[],
  threshold = DEFAULT_SNAP_THRESHOLD
): SnapResult {
  let closestTarget: SnapTarget | null = null;
  let minDistance = Infinity;

  for (const target of anchors) {
    const dist = calculateNormalizedDistance(currentPos, target.anchor);
    if (dist < minDistance) {
      minDistance = dist;
      closestTarget = target;
    }
  }

  if (closestTarget && minDistance < threshold) {
    const offsetX = closestTarget.presetOffset?.x ?? 0;
    const offsetY = closestTarget.presetOffset?.y ?? 0;
    return {
      isSnapped: true,
      targetName: closestTarget.name,
      distance: Number(minDistance.toFixed(4)),
      snappedPosition: {
        x: Number((closestTarget.anchor.x + offsetX).toFixed(4)),
        y: Number((closestTarget.anchor.y + offsetY).toFixed(4)),
      },
    };
  }

  return {
    isSnapped: false,
    distance: minDistance === Infinity ? 0 : Number(minDistance.toFixed(4)),
    snappedPosition: currentPos,
  };
}
