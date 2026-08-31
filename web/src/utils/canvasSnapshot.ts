import { GarmentItem, GarmentState } from '@smart-wardrobe/shared';
import { getCategoryDefaultOffsets } from './imageProcess';

export interface CanvasWornItem {
  garment: GarmentItem;
  state: GarmentState;
  zIndex: number;
  offsetX: number;
  offsetY: number;
  scale: number;
  scaleX?: number;
  scaleY?: number;
}

/**
 * 将试衣间 2D 模特与已穿戴衣物层在离屏 Canvas 中精准合成为 3:4 黄金画幅高清快照
 * 专为 nanonanana2 / Gemini 3.1 Flash Image 多模态空间拓扑对齐设计
 */
export async function generate2DCanvasSnapshot(
  avatarUrl: string,
  wornItems: CanvasWornItem[],
  stagePixelWidth = 768,
  stagePixelHeight = 1024
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = stagePixelWidth;
  canvas.height = stagePixelHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 1. 绘制纯白摄影棚底衬 #FFFFFF
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, stagePixelWidth, stagePixelHeight);

  // 辅助图片加载器
  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load canvas image'));
      img.src = url;
    });
  };

  try {
    // 2. 绘制模特底模
    if (avatarUrl) {
      try {
        const avatarImg = await loadImage(avatarUrl);
        ctx.drawImage(avatarImg, 0, 0, stagePixelWidth, stagePixelHeight);
      } catch (e) {
        console.warn('[CanvasSnapshot] 模特底模加载失败，跳过底模绘制:', e);
      }
    }

    // 3. 按 Z-Index 从低到高对穿戴衣物进行层叠绘制
    const sortedWorn = [...wornItems].sort((a, b) => a.zIndex - b.zIndex);

    for (const worn of sortedWorn) {
      const activeAsset =
        worn.garment.assets?.find((a: any) => a.stateType === worn.state) ||
        worn.garment.assets?.[0];
      const gUrl = activeAsset?.pngUrl || (worn.garment as any).previewUrl;
      if (!gUrl) continue;

      try {
        const gImg = await loadImage(gUrl);

        const defaultOffs = getCategoryDefaultOffsets(
          worn.garment.primaryCategory,
          worn.garment.subCategory,
          worn.garment.title
        );

        const offX = worn.offsetX !== undefined && worn.offsetX !== 0 ? worn.offsetX : defaultOffs.offsetX;
        const offY = worn.offsetY !== undefined && worn.offsetY !== 0 ? worn.offsetY : defaultOffs.offsetY;
        const scX = worn.scaleX !== undefined && worn.scaleX !== 1 ? worn.scaleX : (worn.scale !== 1 ? worn.scale : defaultOffs.scale);
        const scY = worn.scaleY !== undefined && worn.scaleY !== 1 ? worn.scaleY : (worn.scale !== 1 ? worn.scale : defaultOffs.scale);

        // 基准画布尺寸缩放比 (UI 视图通常为 ~380x506，导出为 768x1024)
        const scaleRatio = stagePixelWidth / 380;

        ctx.save();
        // 平移到中心 + 偏移量
        const centerX = stagePixelWidth / 2 + offX * scaleRatio;
        const centerY = stagePixelHeight / 2 + offY * scaleRatio;
        ctx.translate(centerX, centerY);

        // 缩放计算
        const drawWidth = (340 * scX) * scaleRatio;
        const drawHeight = (580 * scY) * scaleRatio;

        ctx.drawImage(
          gImg,
          -drawWidth / 2,
          -drawHeight / 2,
          drawWidth,
          drawHeight
        );
        ctx.restore();
      } catch (err) {
        console.warn(`[CanvasSnapshot] 单品 "${worn.garment.title}" 加载绘制跳过:`, err);
      }
    }

    // 4. WebP / JPEG 高质轻量压缩导出 (~120KB)
    const webpUrl = canvas.toDataURL('image/webp', 0.88);
    if (webpUrl.startsWith('data:image/webp')) {
      return webpUrl;
    }
    return canvas.toDataURL('image/jpeg', 0.88);
  } catch (err) {
    console.error('[CanvasSnapshot] 2D 快照合成异常:', err);
    return canvas.toDataURL('image/jpeg', 0.85);
  }
}
