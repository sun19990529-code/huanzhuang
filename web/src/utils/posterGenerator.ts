import { GarmentItem } from '@smart-wardrobe/shared';
import { extractOutfitColorPalette, OutfitColorAnalysis } from './fashionFilterMatcher';

export type PosterLayoutMode = 'MIXED' | 'PORTRAIT' | 'GARMENTS';

export interface PosterOptions {
  layoutMode: PosterLayoutMode;
  dateStr: string;
  title: string;
  weatherTag: string;
  notes: string;
  previewImageUrl?: string | null;
  garments: GarmentItem[];
}

/**
 * 辅助函数：安全加载图片（兼容相对路径、本地代理与 Data URL）
 */
function loadImageSafe(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // 只有非 data: 协议的图片才设置 crossOrigin，防止 data:image 跨域污染警告
    if (!src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);

    // 智能补全绝对路径
    let fullSrc = src;
    if (!src.startsWith('data:') && !src.startsWith('http')) {
      if (typeof window !== 'undefined') {
        fullSrc = `${window.location.origin}${src.startsWith('/') ? '' : '/'}${src}`;
      }
    }
    img.src = fullSrc;
  });
}

/**
 * 在 Canvas 上绘制自适应居中的高质量图片
 */
function drawContainedImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  padding: number = 36
) {
  const availW = w - padding * 2;
  const availH = h - padding * 2;
  if (availW <= 0 || availH <= 0) return;

  const aspect = img.width / img.height;
  let drawW = availW;
  let drawH = drawW / aspect;

  if (drawH > availH) {
    drawH = availH;
    drawW = drawH * aspect;
  }

  const posX = x + (w - drawW) / 2;
  const posY = y + (h - drawH) / 2;
  ctx.drawImage(img, posX, posY, drawW, drawH);
}

/**
 * 高定时尚杂志级 OOTD 海报渲染引擎 (2K 视网膜超清画幅: 2160 × 2880)
 * 支持 3 种版式：MIXED (画册混合) / PORTRAIT (单人物大片) / GARMENTS (单品画廊)
 */
export async function generateOotdPosterCanvas(options: PosterOptions): Promise<HTMLCanvasElement> {
  const {
    layoutMode = 'MIXED',
    dateStr,
    title,
    weatherTag,
    notes,
    previewImageUrl,
    garments = [],
  } = options;

  // 2K 视网膜超清画幅 (3:4 黄金比例，完全原生1:1映射 1080×1440 成片)
  const width = 2160;
  const height = 2880;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D 初始化失败');

  // 开启全硬件级高质量图像平滑
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 1. 优雅暖白底色与高定发丝内框
  ctx.fillStyle = '#FAF8F5';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.roundRect(72, 72, width - 144, height - 144, 64);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#EAE6DF';
  ctx.stroke();

  // 2. 标头排版
  ctx.fillStyle = '#D63031';
  ctx.font = 'bold 34px "Microsoft YaHei", Arial, sans-serif';
  ctx.fillText(`OOTD DOSSIER · ${dateStr}`, 144, 185);

  ctx.fillStyle = '#2D3436';
  ctx.font = 'bold 64px "Microsoft YaHei", Arial, sans-serif';
  const displayTitle = title || '今日定制搭配';
  ctx.fillText(displayTitle.length > 20 ? displayTitle.slice(0, 19) + '...' : displayTitle, 144, 275);

  // 气温天气微型胶囊
  ctx.fillStyle = '#FAF8F5';
  ctx.beginPath();
  ctx.roundRect(width - 540, 135, 396, 85, 26);
  ctx.fill();
  ctx.strokeStyle = '#EAE6DF';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#2D3436';
  ctx.font = 'bold 30px "Microsoft YaHei", Arial, sans-serif';
  ctx.fillText(weatherTag || '晴朗 24°C', width - 495, 188);

  // 心得灵感
  ctx.fillStyle = '#777777';
  ctx.font = 'italic 34px "Microsoft YaHei", Georgia, serif';
  ctx.fillText(`"${notes || '经典美学，色系统一'}"`, 144, 345);

  // 3. 核心画幅舞台 (中段主要区域)
  const imgX = 144;
  const imgY = 415;
  const imgW = width - 288; // 1872px
  const imgH = height - 830; // 2050px

  // 提纯调色盘
  const colorAnalysis: OutfitColorAnalysis = extractOutfitColorPalette(garments);

  // 预加载模特成片
  let heroImage: HTMLImageElement | null = null;
  if (previewImageUrl) {
    try {
      heroImage = await loadImageSafe(previewImageUrl);
    } catch (e) {
      console.warn('[PosterGenerator] 模特大片加载失败:', e);
    }
  }

  // 预加载单品切片图
  const loadedGarments: { garment: GarmentItem; img: HTMLImageElement | null }[] = [];
  for (const g of garments) {
    const rawUrl = g.assets?.[0]?.pngUrl;
    let imgObj: HTMLImageElement | null = null;
    if (rawUrl) {
      try {
        imgObj = await loadImageSafe(rawUrl);
      } catch (e) {
        console.warn(`[PosterGenerator] 单品【${g.title}】加载失败:`, e);
      }
    }
    loadedGarments.push({ garment: g, img: imgObj });
  }

  // -------------------------------------------------------------
  // 版式渲染分支
  // -------------------------------------------------------------
  if (layoutMode === 'PORTRAIT' || (!garments.length && heroImage)) {
    // -----------------------------------------------------------
    // 【模式 B：纯人物大片 (Solo Portrait)】
    // -----------------------------------------------------------
    ctx.fillStyle = '#F5F2EB';
    ctx.beginPath();
    ctx.roundRect(imgX, imgY, imgW, imgH, 45);
    ctx.fill();

    if (heroImage) {
      drawContainedImage(ctx, heroImage, imgX, imgY, imgW, imgH, 45);
    } else if (loadedGarments[0]?.img) {
      drawContainedImage(ctx, loadedGarments[0].img, imgX, imgY, imgW, imgH, 80);
    }
  } else if (layoutMode === 'GARMENTS' || !heroImage) {
    // -----------------------------------------------------------
    // 【模式 C：纯单品画廊 (Flat Lay Showcase)】
    // -----------------------------------------------------------
    const totalGarments = loadedGarments.length;
    // 单品画廊最多支持 12 件单品平铺自适应网格
    const maxGarmentSlots = 12;
    const hasMoreOverflow = totalGarments > maxGarmentSlots;
    const items = hasMoreOverflow
      ? loadedGarments.slice(0, maxGarmentSlots - 1)
      : loadedGarments.slice(0, maxGarmentSlots);
    const displayCount = hasMoreOverflow ? maxGarmentSlots : items.length;

    let cols = 1;
    if (displayCount === 2) cols = 2;
    else if (displayCount >= 3 && displayCount <= 4) cols = 2;
    else if (displayCount >= 5 && displayCount <= 9) cols = 3;
    else if (displayCount >= 10) cols = 4;

    const rows = Math.ceil(displayCount / cols);
    const gap = 36;
    const cellW = (imgW - gap * (cols - 1)) / cols;
    const cellH = (imgH - gap * (rows - 1)) / rows;

    items.forEach((item, idx) => {
      const colIdx = idx % cols;
      const rowIdx = Math.floor(idx / cols);
      const cx = imgX + colIdx * (cellW + gap);
      const cy = imgY + rowIdx * (cellH + gap);

      // 单品高定卡片底色
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(cx, cy, cellW, cellH, 36);
      ctx.fill();
      ctx.strokeStyle = '#EAE6DF';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      if (item.img) {
        drawContainedImage(ctx, item.img, cx, cy, cellW, cellH - 70, 50);
      }

      // 单品标题
      ctx.fillStyle = '#2D3436';
      ctx.font = 'bold 28px "Microsoft YaHei", Arial, sans-serif';
      const label = item.garment.title || '搭配单品';
      const textW = ctx.measureText(label).width;
      const tx = Math.max(cx + 20, cx + (cellW - textW) / 2);
      ctx.fillText(label.length > 12 ? label.slice(0, 11) + '...' : label, tx, cy + cellH - 26);
    });

    // 若超过最大槽位，绘制“+N 更多单品”徽章卡片
    if (hasMoreOverflow) {
      const overflowIdx = maxGarmentSlots - 1;
      const colIdx = overflowIdx % cols;
      const rowIdx = Math.floor(overflowIdx / cols);
      const cx = imgX + colIdx * (cellW + gap);
      const cy = imgY + rowIdx * (cellH + gap);

      ctx.fillStyle = '#FAF8F5';
      ctx.beginPath();
      ctx.roundRect(cx, cy, cellW, cellH, 36);
      ctx.fill();
      ctx.strokeStyle = '#EAE6DF';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = '#D63031';
      ctx.font = 'bold 48px "Microsoft YaHei", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`+${totalGarments - maxGarmentSlots + 1}`, cx + cellW / 2, cy + cellH / 2 - 10);
      ctx.fillStyle = '#777777';
      ctx.font = 'bold 26px "Microsoft YaHei", Arial, sans-serif';
      ctx.fillText('更多单品', cx + cellW / 2, cy + cellH / 2 + 36);
      ctx.textAlign = 'start';
    }
  } else {
    // -----------------------------------------------------------
    // 【模式 A：画册混合 (Mixed Magazine Blend)】[默认/推荐]
    // 左侧 1120px 模特大片（1:1 无损容纳 1080P）+ 右侧 716px 单品自适应矩阵
    // -----------------------------------------------------------
    const heroW = 1120; // 宽达 1120px，完全点对点承载原生 1080×1440 试穿成片！
    const gap = 36;
    const matrixX = imgX + heroW + gap; // 1300px
    const matrixW = imgW - heroW - gap; // 716px

    // 1. 绘制左侧人物大片
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(imgX, imgY, heroW, imgH, 45);
    ctx.fill();
    ctx.strokeStyle = '#EAE6DF';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    if (heroImage) {
      drawContainedImage(ctx, heroImage, imgX, imgY, heroW, imgH, 36);
    }

    // 2. 绘制右侧单品自适应展台
    const totalGarments = loadedGarments.length;
    // 混合模式右侧矩阵展台支持最多 8 个单品槽位（2列 x 4行完整陈列 8 件衣服）
    // 仅当超过 8 件时，第 8 格显示 "+N 更多单品"
    const maxMatrixSlots = 8;
    const hasMoreOverflow = totalGarments > maxMatrixSlots;
    const gItems = hasMoreOverflow
      ? loadedGarments.slice(0, maxMatrixSlots - 1)
      : loadedGarments.slice(0, maxMatrixSlots);
    const displayCount = hasMoreOverflow ? maxMatrixSlots : gItems.length;

    if (displayCount === 1) {
      // 1 件单品：单张大卡居中
      const cardH = 945;
      const cy = imgY + (imgH - cardH) / 2;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(matrixX, cy, matrixW, cardH, 40);
      ctx.fill();
      ctx.strokeStyle = '#EAE6DF';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      if (gItems[0]?.img) {
        drawContainedImage(ctx, gItems[0].img, matrixX, cy, matrixW, cardH - 80, 50);
      }
      ctx.fillStyle = '#2D3436';
      ctx.font = 'bold 30px "Microsoft YaHei", Arial, sans-serif';
      ctx.fillText(gItems[0]?.garment.title || '单品', matrixX + 36, cy + cardH - 36);
    } else if (displayCount === 2) {
      // 2 件单品：上下等分 2 张大卡
      const cardH = (imgH - gap) / 2;
      gItems.forEach((it, idx) => {
        const cy = imgY + idx * (cardH + gap);
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.roundRect(matrixX, cy, matrixW, cardH, 40);
        ctx.fill();
        ctx.strokeStyle = '#EAE6DF';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        if (it.img) {
          drawContainedImage(ctx, it.img, matrixX, cy, matrixW, cardH - 72, 45);
        }
        ctx.fillStyle = '#2D3436';
        ctx.font = 'bold 28px "Microsoft YaHei", Arial, sans-serif';
        const t = it.garment.title;
        ctx.fillText(t.length > 12 ? t.slice(0, 11) + '...' : t, matrixX + 32, cy + cardH - 32);
      });
    } else if (displayCount === 3) {
      // 3 件单品：上下等分 3 卡
      const cardH = (imgH - gap * 2) / 3;
      gItems.forEach((it, idx) => {
        const cy = imgY + idx * (cardH + gap);
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.roundRect(matrixX, cy, matrixW, cardH, 36);
        ctx.fill();
        ctx.strokeStyle = '#EAE6DF';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        if (it.img) {
          drawContainedImage(ctx, it.img, matrixX, cy, matrixW, cardH - 54, 32);
        }
        ctx.fillStyle = '#2D3436';
        ctx.font = 'bold 26px "Microsoft YaHei", Arial, sans-serif';
        const t = it.garment.title;
        ctx.fillText(t.length > 12 ? t.slice(0, 11) + '...' : t, matrixX + 28, cy + cardH - 24);
      });
    } else {
      // 4~8 件单品：2 列网格自适应 (4件: 2x2, 5~6件: 2x3, 7~8件: 2x4 完整呈现！)
      const mCols = 2;
      const mRows = Math.ceil(displayCount / mCols);
      const mGap = 24;
      const cellW = (matrixW - mGap) / mCols;
      const cellH = (imgH - mGap * (mRows - 1)) / mRows;

      gItems.forEach((it, idx) => {
        const cIdx = idx % mCols;
        const rIdx = Math.floor(idx / mCols);
        const cx = matrixX + cIdx * (cellW + mGap);
        const cy = imgY + rIdx * (cellH + mGap);

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.roundRect(cx, cy, cellW, cellH, 30);
        ctx.fill();
        ctx.strokeStyle = '#EAE6DF';
        ctx.lineWidth = 2;
        ctx.stroke();

        if (it.img) {
          drawContainedImage(ctx, it.img, cx, cy, cellW, cellH - 48, 24);
        }
        ctx.fillStyle = '#444444';
        ctx.font = 'bold 22px "Microsoft YaHei", Arial, sans-serif';
        const t = it.garment.title;
        ctx.fillText(t.length > 7 ? t.slice(0, 6) + '..' : t, cx + 18, cy + cellH - 18);
      });

      // 若超过 8 件单品，第 8 格绘制“+N 更多单品”
      if (hasMoreOverflow) {
        const overflowIdx = maxMatrixSlots - 1;
        const cIdx = overflowIdx % mCols;
        const rIdx = Math.floor(overflowIdx / mCols);
        const cx = matrixX + cIdx * (cellW + mGap);
        const cy = imgY + rIdx * (cellH + mGap);

        ctx.fillStyle = '#FAF8F5';
        ctx.beginPath();
        ctx.roundRect(cx, cy, cellW, cellH, 30);
        ctx.fill();
        ctx.strokeStyle = '#EAE6DF';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#D63031';
        ctx.font = 'bold 42px "Microsoft YaHei", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`+${totalGarments - maxMatrixSlots + 1}`, cx + cellW / 2, cy + cellH / 2 - 8);
        ctx.fillStyle = '#777777';
        ctx.font = 'bold 22px "Microsoft YaHei", Arial, sans-serif';
        ctx.fillText('更多单品', cx + cellW / 2, cy + cellH / 2 + 32);
        ctx.textAlign = 'start';
      }
    }
  }

  // 4. [核心亮点] 动态高定调色盘 (Look Palette) 标尺 (2K 高清呈现)
  const palY = height - 338;
  const palH = 162;
  ctx.fillStyle = '#FAF8F5';
  ctx.beginPath();
  ctx.roundRect(imgX, palY, imgW, palH, 40);
  ctx.fill();
  ctx.strokeStyle = '#EAE6DF';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // 左侧调色盘标题与风格调
  ctx.fillStyle = '#2D3436';
  ctx.font = 'bold 28px "Microsoft YaHei", Arial, sans-serif';
  ctx.fillText('COLOR PALETTE', imgX + 54, palY + 65);
  ctx.fillStyle = '#D63031';
  ctx.font = 'bold 26px "Microsoft YaHei", Arial, sans-serif';
  ctx.fillText(colorAnalysis.styleTone, imgX + 54, palY + 115);

  // 右侧展示真实提取的 3~4 个潘通色标卡
  const palItems = colorAnalysis.palette.slice(0, 4);
  const startColorX = imgX + 450;
  const colorBlockW = (imgW - 500) / Math.max(1, palItems.length);

  palItems.forEach((p, idx) => {
    const bx = startColorX + idx * colorBlockW;
    // 色彩圆形
    ctx.fillStyle = p.hex;
    ctx.beginPath();
    ctx.arc(bx + 36, palY + 81, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.stroke();

    // 中文色名与 Hex
    ctx.fillStyle = '#2D3436';
    ctx.font = 'bold 26px "Microsoft YaHei", Arial, sans-serif';
    ctx.fillText(p.name, bx + 80, palY + 72);

    ctx.fillStyle = '#888888';
    ctx.font = '22px monospace';
    ctx.fillText(p.hex, bx + 80, palY + 110);
  });

  // 5. 底部品牌标识
  ctx.fillStyle = '#AAAAAA';
  ctx.font = 'bold 26px monospace';
  ctx.fillText('SMARTWARDROBE ATELIER · PRIVATE OOTD', 144, height - 95);
  ctx.fillText('AUTUMN / WINTER 2026', width - 560, height - 95);

  return canvas;
}
