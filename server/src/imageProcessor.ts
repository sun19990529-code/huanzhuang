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
   * 1. 智能去底与 Alpha 通道提纯 (支持纯白底 #FFFFFF 及影棚中性灰底 #7F7F7F)
   * 将背景转换为 100% 纯净透明通道，生成高质量免抠图 PNG 切片
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

      const pixelData = Buffer.from(data);

      // 采样四角及边缘背景基准色
      const getPixel = (x: number, y: number) => {
        const idx = (y * width + x) * 4;
        return {
          r: pixelData[idx],
          g: pixelData[idx + 1],
          b: pixelData[idx + 2],
          a: pixelData[idx + 3],
        };
      };

      const cornerPoints = [
        getPixel(2, 2),
        getPixel(Math.max(0, width - 3), 2),
        getPixel(2, Math.max(0, height - 3)),
        getPixel(Math.max(0, width - 3), Math.max(0, height - 3)),
        getPixel(Math.floor(width / 2), 2),
        getPixel(2, Math.floor(height / 2)),
      ];

      const avgBgR = Math.round(cornerPoints.reduce((sum, p) => sum + p.r, 0) / cornerPoints.length);
      const avgBgG = Math.round(cornerPoints.reduce((sum, p) => sum + p.g, 0) / cornerPoints.length);
      const avgBgB = Math.round(cornerPoints.reduce((sum, p) => sum + p.b, 0) / cornerPoints.length);

      const isCornerUniform = cornerPoints.every(
        (c) =>
          Math.abs(c.r - avgBgR) < 35 &&
          Math.abs(c.g - avgBgG) < 35 &&
          Math.abs(c.b - avgBgB) < 35
      );

      const isWhiteBg = avgBgR >= 230 && avgBgG >= 230 && avgBgB >= 230;
      const isGrayBg =
        !isWhiteBg &&
        Math.abs(avgBgR - avgBgG) < 18 &&
        Math.abs(avgBgG - avgBgB) < 18 &&
        avgBgR >= 50 &&
        avgBgR <= 200;

      for (let i = 0; i < pixelData.length; i += 4) {
        const r = pixelData[i];
        const g = pixelData[i + 1];
        const b = pixelData[i + 2];

        // 场景 1: 纯白 / 浅色高亮底
        if (isWhiteBg || (r >= 238 && g >= 238 && b >= 238)) {
          const minVal = Math.min(r, g, b);
          if (minVal >= 248) {
            pixelData[i + 3] = 0;
          } else if (minVal >= 225) {
            const alphaRatio = (255 - minVal) / (255 - 225);
            pixelData[i + 3] = Math.round(255 * Math.pow(alphaRatio, 1.4));
          }
        }
        // 场景 2: 中性纯灰底 (#7F7F7F / 影棚纯色背景)
        else if (isGrayBg || isCornerUniform) {
          const colorDist = Math.sqrt(
            Math.pow(r - avgBgR, 2) + Math.pow(g - avgBgG, 2) + Math.pow(b - avgBgB, 2)
          );

          if (colorDist < 26) {
            pixelData[i + 3] = 0;
          } else if (colorDist < 44) {
            const ratio = (colorDist - 26) / 18;
            pixelData[i + 3] = Math.round(pixelData[i + 3] * Math.pow(ratio, 1.2));
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
        .png({ compressionLevel: 8 })
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
