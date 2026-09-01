import sharp from 'sharp';

/**
 * 图像服务端智能处理引擎 (Server-Side Image Processor)
 * 提供工业级 Alpha 抠图、纯白/中性灰底剔除、以及 WebP 1024px 动态自适应压缩
 */
export class ImageProcessor {
  /**
   * 将 Data URL 或原始 Base64 解析为 Buffer
   */
  public static base64ToBuffer(base64Str: string): { buffer: Buffer; mimeType: string } {
    let cleanBase64 = base64Str;
    let mimeType = 'image/png';

    const match = base64Str.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      mimeType = match[1];
      cleanBase64 = match[2];
    }

    return {
      buffer: Buffer.from(cleanBase64, 'base64'),
      mimeType,
    };
  }

  /**
   * 方案 B: 边缘泛洪 + 闭合空腔色差分析 (Enhanced Matting Engine)
   * 1. 采样四角及边缘采样点作为背景基准色（精准适配纯白 #FFFFFF、米白及影棚中性灰 #7F7F7F）
   * 2. 第一阶段：边缘种子 BFS 泛洪 (Outer Flood-Fill)，建立外围透明掩模，不碰衣物内部高光
   * 3. 第二阶段：内部闭合空腔检测 (Cavity Analysis)，精准识别并抠除包包提手、吊带空隙、腰带扣内部
   * 4. 第三阶段：双边色彩距离羽化与抗锯齿 (Alpha Feathering)，输出细腻透明底 PNG
   */
  public static async removeBackground(imageBase64: string): Promise<string> {
    if (!imageBase64 || (!imageBase64.startsWith('data:image') && imageBase64.length < 100)) {
      return imageBase64;
    }

    try {
      const { buffer } = this.base64ToBuffer(imageBase64);

      // 解码为 RGBA 原始像素矩阵
      const { data, info } = await sharp(buffer)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const { width, height, channels } = info;
      if (channels !== 4) return imageBase64;

      const totalPixels = width * height;
      const mask = new Uint8Array(totalPixels); // 0: 前景主体, 1: 背景(透明)
      const pixelData = Buffer.from(data);

      const getPixel = (x: number, y: number) => {
        const idx = (y * width + x) * 4;
        return {
          r: pixelData[idx],
          g: pixelData[idx + 1],
          b: pixelData[idx + 2],
          a: pixelData[idx + 3],
        };
      };

      // 1. 采样四角及外围边缘采样点作为背景基准
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

      // 2. 第一阶段：边缘种子 BFS 泛洪 (Outer Flood-Fill)
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

      // 3. 第二阶段：闭合空腔检测与透光抠除 (Cavity Analysis for bag handles, belt loops, suspenders)
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

      // 4. 第三阶段：Alpha 通道应用与边缘抗锯齿羽化 (Edge Feathering)
      for (let i = 0; i < totalPixels; i++) {
        const rawIdx = i * 4;
        if (mask[i] === 1) {
          pixelData[rawIdx + 3] = 0;
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
              pixelData[rawIdx + 3] = Math.round(255 * Math.pow(ratio, 1.2));
            } else {
              pixelData[rawIdx + 3] = 255;
            }
          } else {
            pixelData[rawIdx + 3] = 255;
          }
        }
      }

      const pngBuffer = await sharp(pixelData, {
        raw: {
          width,
          height,
          channels: 4,
        },
      })
        .png({ compressionLevel: 8, adaptiveFiltering: true })
        .toBuffer();

      return `data:image/png;base64,${pngBuffer.toString('base64')}`;
    } catch (err: any) {
      console.warn('[ImageProcessor] 抠图处理异常，保留原图:', err.message);
      return imageBase64;
    }
  }

  /**
   * 2. WebP 1024px 自适应动态压缩 (大模型发包前拦截器)
   * 将任意大图等比例约束在长边 1024px 以内，转为 WebP (质量 0.88)，体积从 3MB+ 骤降至 <120KB
   */
  public static async compressToWebP1024(
    imageBase64: string,
    maxDimension = 1024,
    quality = 88
  ): Promise<string> {
    if (!imageBase64) return imageBase64;
    if (imageBase64.startsWith('http')) return imageBase64;

    try {
      const { buffer } = this.base64ToBuffer(imageBase64);

      const metadata = await sharp(buffer).metadata();
      const currentWidth = metadata.width || 1024;
      const currentHeight = metadata.height || 1024;

      let pipeline = sharp(buffer);
      if (currentWidth > maxDimension || currentHeight > maxDimension) {
        pipeline = pipeline.resize({
          width: maxDimension,
          height: maxDimension,
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      const webpBuffer = await pipeline
        .webp({
          quality,
          alphaQuality: 90,
          effort: 4,
        })
        .toBuffer();

      return `data:image/webp;base64,${webpBuffer.toString('base64')}`;
    } catch (err: any) {
      console.warn('[ImageProcessor] WebP 压缩异常，回退原始图:', err.message);
      return imageBase64;
    }
  }
}
