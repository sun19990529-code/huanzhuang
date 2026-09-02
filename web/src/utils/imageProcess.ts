/**
 * 图像透明通道提取与纯白底去除工具 (Alpha Cutout Engine)
 */

export function removeWhiteBackground(imageSrc: string): Promise<string> {
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
        const totalPixels = width * height;
        const mask = new Uint8Array(totalPixels); // 0: 前景, 1: 背景(透明)

        const getPixel = (x: number, y: number) => {
          const idx = (y * width + x) * 4;
          return { r: data[idx], g: data[idx + 1], b: data[idx + 2], a: data[idx + 3] };
        };

        // 1. 采样四角及边缘采样点
        const samples: Array<{ r: number; g: number; b: number }> = [];
        const sampleCoords = [
          [2, 2], [Math.floor(width / 2), 2], [width - 3, 2],
          [2, Math.floor(height / 2)], [width - 3, Math.floor(height / 2)],
          [2, height - 3], [Math.floor(width / 2), height - 3], [width - 3, height - 3],
        ];
        for (const [sx, sy] of sampleCoords) {
          if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
            const p = getPixel(sx, sy);
            samples.push({ r: p.r, g: p.g, b: p.b });
          }
        }

        const bgR = Math.round(samples.reduce((s, p) => s + p.r, 0) / samples.length);
        const bgG = Math.round(samples.reduce((s, p) => s + p.g, 0) / samples.length);
        const bgB = Math.round(samples.reduce((s, p) => s + p.b, 0) / samples.length);

        const colorDistance = (r: number, g: number, b: number, tr = bgR, tg = bgG, tb = bgB) => {
          return Math.sqrt(Math.pow(r - tr, 2) + Math.pow(g - tg, 2) + Math.pow(b - tb, 2));
        };

        const sampleDists = samples.map((s) => colorDistance(s.r, s.g, s.b));
        const maxSampleDist = Math.max(...sampleDists);

        const isWhiteLike = bgR >= 235 && bgG >= 235 && bgB >= 235;
        const baseTolerance = isWhiteLike ? 14 : Math.max(8, Math.min(13, maxSampleDist + 5));

        // 2. 第一阶段：边缘种子 BFS 泛洪
        const queue = new Int32Array(totalPixels);
        let head = 0;
        let tail = 0;

        const pushQueue = (x: number, y: number) => {
          const pIdx = y * width + x;
          if (mask[pIdx] === 0) {
            const p = getPixel(x, y);
            const dist = colorDistance(p.r, p.g, p.b);
            const isPureWhite = isWhiteLike && (p.r >= 248 && p.g >= 248 && p.b >= 248);
            if (dist <= baseTolerance || isPureWhite) {
              mask[pIdx] = 1;
              queue[tail++] = pIdx;
            }
          }
        };

        for (let x = 0; x < width; x++) {
          pushQueue(x, 0);
          pushQueue(x, height - 1);
        }
        for (let y = 0; y < height; y++) {
          pushQueue(0, y);
          pushQueue(width - 1, y);
        }

        while (head < tail) {
          const curr = queue[head++];
          const cx = curr % width;
          const cy = Math.floor(curr / width);

          const neighbors = [
            [cx + 1, cy], [cx - 1, cy],
            [cx, cy + 1], [cx, cy - 1],
          ];

          for (const [nx, ny] of neighbors) {
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nIdx = ny * width + nx;
              if (mask[nIdx] === 0) {
                const p = getPixel(nx, ny);
                const dist = colorDistance(p.r, p.g, p.b);
                const isPureWhite = isWhiteLike && (p.r >= 248 && p.g >= 248 && p.b >= 248);
                if (dist <= baseTolerance || isPureWhite) {
                  mask[nIdx] = 1;
                  queue[tail++] = nIdx;
                }
              }
            }
          }
        }

        // 3. 第二阶段：内部闭合空腔分析
        const visitedForCavity = new Uint8Array(totalPixels);
        const cavityTolerance = isWhiteLike ? 12 : 8;

        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            if (mask[idx] === 0 && visitedForCavity[idx] === 0) {
              const p0 = getPixel(x, y);
              const dist0 = colorDistance(p0.r, p0.g, p0.b);
              const isWhiteHit0 = isWhiteLike && (p0.r >= 248 && p0.g >= 248 && p0.b >= 248);

              if (dist0 <= cavityTolerance || isWhiteHit0) {
                const regionPixels: number[] = [];
                let rSum = 0, gSum = 0, bSum = 0;
                let touchesBorder = false;

                const rQueue: number[] = [idx];
                visitedForCavity[idx] = 1;

                let rHead = 0;
                while (rHead < rQueue.length) {
                  const cIdx = rQueue[rHead++];
                  regionPixels.push(cIdx);
                  const rx = cIdx % width;
                  const ry = Math.floor(cIdx / width);
                  const p = getPixel(rx, ry);
                  rSum += p.r;
                  gSum += p.g;
                  bSum += p.b;

                  if (rx === 0 || rx === width - 1 || ry === 0 || ry === height - 1) {
                    touchesBorder = true;
                  }

                  const rNeighbors = [
                    [rx + 1, ry], [rx - 1, ry],
                    [rx, ry + 1], [rx, ry - 1],
                  ];
                  for (const [rnx, rny] of rNeighbors) {
                    if (rnx >= 0 && rnx < width && rny >= 0 && rny < height) {
                      const rnIdx = rny * width + rnx;
                      if (mask[rnIdx] === 0 && visitedForCavity[rnIdx] === 0) {
                        const np = getPixel(rnx, rny);
                        const nDist = colorDistance(np.r, np.g, np.b);
                        const nWhite = isWhiteLike && (np.r >= 248 && np.g >= 248 && np.b >= 248);
                        if (nDist <= cavityTolerance || nWhite) {
                          visitedForCavity[rnIdx] = 1;
                          rQueue.push(rnIdx);
                        }
                      }
                    }
                  }
                }

                if (regionPixels.length >= 16 && !touchesBorder) {
                  const count = regionPixels.length;
                  const avgR = rSum / count;
                  const avgG = gSum / count;
                  const avgB = bSum / count;
                  const avgDistToBg = colorDistance(avgR, avgG, avgB);

                  if (avgDistToBg <= cavityTolerance || (isWhiteLike && avgR >= 248 && avgG >= 248 && avgB >= 248)) {
                    for (const cavPixel of regionPixels) {
                      mask[cavPixel] = 1;
                    }
                  }
                }
              }
            }
          }
        }

        // 4. 第三阶段：边缘平滑羽化
        for (let i = 0; i < totalPixels; i++) {
          const rawIdx = i * 4;
          if (mask[i] === 1) {
            data[rawIdx + 3] = 0;
          } else {
            const px = i % width;
            const py = Math.floor(i / width);
            let nearBg = false;

            if (px > 0 && mask[i - 1] === 1) nearBg = true;
            else if (px < width - 1 && mask[i + 1] === 1) nearBg = true;
            else if (py > 0 && mask[i - width] === 1) nearBg = true;
            else if (py < height - 1 && mask[i + width] === 1) nearBg = true;

            if (nearBg) {
              const p = getPixel(px, py);
              const dist = colorDistance(p.r, p.g, p.b);
              if (dist < baseTolerance + 8) {
                const ratio = Math.max(0.1, Math.min(1.0, (dist - (baseTolerance - 4)) / 12));
                data[rawIdx + 3] = Math.round(255 * Math.pow(ratio, 1.2));
              } else {
                data[rawIdx + 3] = 255;
              }
            } else {
              data[rawIdx + 3] = 255;
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        console.warn('Enhanced Matting Canvas 抠图异常，回退原图:', err);
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
  const isNecklace = /链|项圈|项链|necklace|choker|jewelry/i.test(title) || /necklace|jewelry/i.test(subCategory);
  const isBelt = /带|腰带|皮带|waistband|belt/i.test(title) || /belt/i.test(subCategory);
  const isBag = /包|手提|单肩|斜挎|托特|bag|tote|handbag|crossbody|clutch/i.test(title) || /bag|tote|handbag/i.test(subCategory);
  const isShorts = /短裤|热裤|shorts/i.test(title) || /shorts/i.test(subCategory);

  if (isCrown) return { offsetY: -325, offsetX: 0, scale: 0.22, scaleX: 0.22, scaleY: 0.22 };
  if (isHat) return { offsetY: -310, offsetX: 0, scale: 0.32, scaleX: 0.32, scaleY: 0.32 };
  if (isNecklace) return { offsetY: -195, offsetX: 0, scale: 0.28, scaleX: 0.28, scaleY: 0.28 };
  if (isBelt) return { offsetY: -28, offsetX: 0, scale: 0.38, scaleX: 0.38, scaleY: 0.38 };
  if (isBag) return { offsetY: 75, offsetX: 105, scale: 0.38, scaleX: 0.38, scaleY: 0.38 };
  if (category === 'ACCESSORIES') return { offsetY: -195, offsetX: 0, scale: 0.32, scaleX: 0.32, scaleY: 0.32 };
  
  if (isDress) return { offsetY: 40, offsetX: 0, scale: 0.94, scaleX: 0.88, scaleY: 0.96 };
  if (category === 'TOPS') return { offsetY: -105, offsetX: 0, scale: 0.48, scaleX: 0.48, scaleY: 0.48 };
  if (category === 'OUTERWEAR') return { offsetY: -90, offsetX: 0, scale: 0.56, scaleX: 0.56, scaleY: 0.56 };
  if (isShorts) return { offsetY: 35, offsetX: 0, scale: 0.45, scaleX: 0.45, scaleY: 0.45 };
  if (category === 'BOTTOMS') return { offsetY: 105, offsetX: 0, scale: 0.50, scaleX: 0.50, scaleY: 0.50 };
  if (category === 'FOOTWEAR') return { offsetY: 295, offsetX: 0, scale: 0.36, scaleX: 0.36, scaleY: 0.36 };

  return { offsetY: 0, offsetX: 0, scale: 0.5, scaleX: 0.5, scaleY: 0.5 };
}

