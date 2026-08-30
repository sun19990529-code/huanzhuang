/**
 * 图像透明通道提取与纯白底去除工具 (Alpha Cutout Engine)
 */

export function removeWhiteBackground(imageSrc: string, threshold = 230): Promise<string> {
  return new Promise((resolve) => {
    if (!imageSrc) {
      resolve(imageSrc);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageSrc);
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        // 采样四个角的背景基准色 (Top-Left, Top-Right, Bottom-Left, Bottom-Right)
        const getPixel = (x: number, y: number) => {
          const idx = (y * width + x) * 4;
          return { r: data[idx], g: data[idx + 1], b: data[idx + 2], a: data[idx + 3] };
        };

        const corners = [
          getPixel(2, 2),
          getPixel(Math.max(0, width - 3), 2),
          getPixel(2, Math.max(0, height - 3)),
          getPixel(Math.max(0, width - 3), Math.max(0, height - 3)),
        ];

        // 计算平均背景参考色
        const avgBgR = Math.round(corners.reduce((s, c) => s + c.r, 0) / 4);
        const avgBgG = Math.round(corners.reduce((s, c) => s + c.g, 0) / 4);
        const avgBgB = Math.round(corners.reduce((s, c) => s + c.b, 0) / 4);
        const isCornerUniform = corners.every(
          (c) => Math.abs(c.r - avgBgR) < 25 && Math.abs(c.g - avgBgG) < 25 && Math.abs(c.b - avgBgB) < 25
        );

        // 像素级提取背景并转换为完全透明
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // 模式 1: 纯白/高亮近白色背景
          if (r >= threshold && g >= threshold && b >= threshold) {
            const minVal = Math.min(r, g, b);
            if (minVal >= 246) {
              data[i + 3] = 0; // 纯白完全透明
            } else {
              const alphaRatio = (255 - minVal) / (255 - threshold);
              data[i + 3] = Math.round(255 * Math.pow(alphaRatio, 1.2));
            }
          }
          // 模式 2: 若四角具备高度一致的背景色 (如棚拍纯灰底/纯色底)，基于欧氏色彩距离抠除
          else if (isCornerUniform) {
            const dist = Math.sqrt(
              Math.pow(r - avgBgR, 2) + Math.pow(g - avgBgG, 2) + Math.pow(b - avgBgB, 2)
            );
            if (dist < 18) {
              data[i + 3] = 0;
            } else if (dist < 32) {
              const ratio = (dist - 18) / 14;
              data[i + 3] = Math.round(data[i + 3] * ratio);
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        console.warn('Canvas 抠图异常，回退原图:', err);
        resolve(imageSrc);
      }
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
}

/**
 * 图像多目标区域精准裁切引擎 (Bounding Box Crop Engine)
 * 传入整张照片与 0~1000 归一化坐标 [ymin, xmin, ymax, xmax]
 * 毫秒级提取出独立单品切片，带有呼吸边距
 */
export function cropImageRegion(
  imageSrc: string,
  box2d?: [number, number, number, number] // [ymin, xmin, ymax, xmax] 0 ~ 1000
): Promise<string> {
  return new Promise((resolve) => {
    if (!imageSrc || !box2d || box2d.length < 4) {
      resolve(imageSrc);
      return;
    }

    const [ymin, xmin, ymax, xmax] = box2d;
    // 如果是全图范围 [0, 0, 1000, 1000] 则直接返回
    if (ymin <= 10 && xmin <= 10 && ymax >= 990 && xmax >= 990) {
      resolve(imageSrc);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const nw = img.naturalWidth || img.width;
        const nh = img.naturalHeight || img.height;

        // 计算 4% 的安全呼吸边距 (Padding)，避免裁掉服装边缘
        const padY = (ymax - ymin) * 0.04;
        const padX = (xmax - xmin) * 0.04;

        const sy = Math.max(0, Math.floor(((ymin - padY) / 1000) * nh));
        const sx = Math.max(0, Math.floor(((xmin - padX) / 1000) * nw));
        const sh = Math.min(nh - sy, Math.ceil(((ymax - ymin + 2 * padY) / 1000) * nh));
        const sw = Math.min(nw - sx, Math.ceil(((xmax - xmin + 2 * padX) / 1000) * nw));

        if (sw <= 0 || sh <= 0) {
          resolve(imageSrc);
          return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = sw;
        canvas.height = sh;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageSrc);
          return;
        }

        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        console.warn('Canvas 区域裁切异常，回退原图:', err);
        resolve(imageSrc);
      }
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
}

/**
 * 根据单品品类与名称返回解剖学默认吸附偏移与缩放比例
 */
export function getCategoryDefaultOffsets(
  category: string,
  subCategory = '',
  title = ''
) {
  const isDress = /裙|礼服|长裙|连衣裙|旗袍|gown|dress/i.test(title) || /dress|gown/i.test(subCategory);
  const isCrown = /冠|发饰|头饰|发带|皇冠|crown/i.test(title) || /crown/i.test(subCategory);
  const isHat = /帽|贝雷|hat|beret|cap/i.test(title) || /hat|beret/i.test(subCategory);
  const isNecklace = /链|项圈|项链|necklace|choker/i.test(title) || /necklace/i.test(subCategory);
  const isShorts = /短裤|热裤|shorts/i.test(title) || /shorts/i.test(subCategory);

  if (isCrown) return { offsetY: -325, offsetX: 0, scale: 0.22, scaleX: 0.22, scaleY: 0.22 };
  if (isHat) return { offsetY: -310, offsetX: 0, scale: 0.32, scaleX: 0.32, scaleY: 0.32 };
  if (isNecklace) return { offsetY: -195, offsetX: 0, scale: 0.28, scaleX: 0.28, scaleY: 0.28 };
  if (category === 'ACCESSORIES') return { offsetY: -195, offsetX: 0, scale: 0.32, scaleX: 0.32, scaleY: 0.32 };
  
  if (isDress) return { offsetY: 40, offsetX: 0, scale: 0.94, scaleX: 0.88, scaleY: 0.96 };
  if (category === 'TOPS') return { offsetY: -105, offsetX: 0, scale: 0.48, scaleX: 0.48, scaleY: 0.48 };
  if (category === 'OUTERWEAR') return { offsetY: -90, offsetX: 0, scale: 0.56, scaleX: 0.56, scaleY: 0.56 };
  if (isShorts) return { offsetY: 35, offsetX: 0, scale: 0.45, scaleX: 0.45, scaleY: 0.45 };
  if (category === 'BOTTOMS') return { offsetY: 105, offsetX: 0, scale: 0.50, scaleX: 0.50, scaleY: 0.50 };
  if (category === 'FOOTWEAR') return { offsetY: 295, offsetX: 0, scale: 0.36, scaleX: 0.36, scaleY: 0.36 };

  return { offsetY: 0, offsetX: 0, scale: 0.5, scaleX: 0.5, scaleY: 0.5 };
}

