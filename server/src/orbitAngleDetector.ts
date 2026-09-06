import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

export interface OrbitDetectionResult {
  totalFrames: number;
  frontFrame: number;     // 0° 正面关键帧 (1-based)
  rightSideFrame: number; // 90° 正右侧关键帧 (1-based)
  backFrame: number;      // 180° 正背面关键帧 (1-based)
  leftSideFrame: number;  // 270° 正左侧关键帧 (1-based)
  loopFrame: number;      // 360° 闭环转正帧 (1-based)
  frameAngles: number[];  // 每一帧对应的物理估算角度 (长为 totalFrames)
}

interface FrameFeature {
  frameIdx: number;       // 0-based
  avgWidth: number;       // 躯干平均投影宽度
  darkPixels: number;     // 深色特征像素数
  diffWithFirst: number;  // 与第一帧的灰度差分
}

export class OrbitAngleDetector {
  /**
   * 自动分析切片目录中的帧序列，提取 360° 各关键视角及连续角度曲线
   */
  public static async analyzeFrames(framesDir: string): Promise<OrbitDetectionResult> {
    const files = fs.readdirSync(framesDir)
      .filter(f => /\.(jpe?g|png|webp)$/i.test(f))
      .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

    if (files.length < 12) {
      throw new Error(`切片帧数过少 (${files.length})，无法进行 360° 旋转轨迹分析`);
    }

    const totalFrames = files.length;
    const features: FrameFeature[] = [];

    // 获取第一帧基准数据
    const firstBuf = await sharp(path.join(framesDir, files[0]))
      .resize(90, 160)
      .grayscale()
      .raw()
      .toBuffer();

    for (let i = 0; i < totalFrames; i++) {
      const filePath = path.join(framesDir, files[i]);
      const { data, info } = await sharp(filePath)
        .resize(90, 160)
        .grayscale()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const w = info.width;
      const h = info.height;

      // 分析上身与腰臀区域 (y: 25% ~ 70%)
      const startY = Math.floor(h * 0.25);
      const endY = Math.floor(h * 0.70);

      let totalWidth = 0;
      let validRows = 0;
      let darkCount = 0;
      let diffSum = 0;

      for (let y = startY; y < endY; y++) {
        let minX = w;
        let maxX = -1;
        const rowOffset = y * w;

        for (let x = 0; x < w; x++) {
          const idx = rowOffset + x;
          const val = data[idx];
          diffSum += Math.abs(val - firstBuf[idx]);

          // 背景纯白 > 235，前景 < 235
          if (val < 235) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
          }
          if (val < 85) {
            darkCount++;
          }
        }

        if (maxX >= minX) {
          totalWidth += (maxX - minX);
          validRows++;
        }
      }

      features.push({
        frameIdx: i,
        avgWidth: validRows > 0 ? totalWidth / validRows : 0,
        darkPixels: darkCount,
        diffWithFirst: diffSum,
      });
    }

    // 1. 平滑宽度曲线 (滑动窗口滤波，窗口大小 5)
    const smoothedWidths = features.map((f, i) => {
      let sum = 0;
      let count = 0;
      for (let k = Math.max(0, i - 2); k <= Math.min(features.length - 1, i + 2); k++) {
        sum += features[k].avgWidth;
        count++;
      }
      return sum / count;
    });

    // 2. 搜索第一次侧身（90° 右侧，在 15% ~ 55% 区间内搜索局部最小宽度）
    const searchStart1 = Math.floor(totalFrames * 0.15);
    const searchEnd1 = Math.floor(totalFrames * 0.55);
    let rightSideIdx = searchStart1;
    let minWidth1 = Infinity;

    for (let i = searchStart1; i <= searchEnd1; i++) {
      if (smoothedWidths[i] < minWidth1) {
        minWidth1 = smoothedWidths[i];
        rightSideIdx = i;
      }
    }

    // 3. 搜索第二次侧身（270° 左侧，在 60% ~ 90% 区间内搜索局部最小宽度）
    const searchStart2 = Math.floor(totalFrames * 0.60);
    const searchEnd2 = Math.floor(totalFrames * 0.90);
    let leftSideIdx = searchStart2;
    let minWidth2 = Infinity;

    for (let i = searchStart2; i <= searchEnd2; i++) {
      if (smoothedWidths[i] < minWidth2) {
        minWidth2 = smoothedWidths[i];
        leftSideIdx = i;
      }
    }

    // 4. 搜索 180° 正背面：在两次侧身之间，搜索宽度展开与差分极大值的综合波峰
    let backIdx = Math.floor((rightSideIdx + leftSideIdx) / 2);
    let maxBackScore = -Infinity;
    const backSearchStart = rightSideIdx + Math.max(5, Math.floor((leftSideIdx - rightSideIdx) * 0.2));
    const backSearchEnd = leftSideIdx - Math.max(5, Math.floor((leftSideIdx - rightSideIdx) * 0.2));

    for (let i = backSearchStart; i <= backSearchEnd; i++) {
      const score = smoothedWidths[i] * 1.2 + (features[i].diffWithFirst / 10000);
      if (score > maxBackScore) {
        maxBackScore = score;
        backIdx = i;
      }
    }

    // 5. 搜索 360° 闭环点：在左侧身之后，寻找首次平稳回到正面形态的转正帧（排除尾部多余静止帧）
    let loopIdx = totalFrames - 1;
    let minDiff = Infinity;
    const loopSearchStart = leftSideIdx + 5;
    for (let i = loopSearchStart; i < totalFrames; i++) {
      if (features[i].diffWithFirst < minDiff) {
        minDiff = features[i].diffWithFirst;
      }
    }
    for (let i = loopSearchStart; i < totalFrames; i++) {
      if (features[i].diffWithFirst <= minDiff * 1.08) {
        loopIdx = i;
        break;
      }
    }

    // 构建单调分段角度映射表
    const anchors = [
      { frameIdx: 0, deg: 0 },
      { frameIdx: rightSideIdx, deg: 90 },
      { frameIdx: backIdx, deg: 180 },
      { frameIdx: leftSideIdx, deg: 270 },
      { frameIdx: loopIdx, deg: 360 },
    ];

    const frameAngles: number[] = new Array(totalFrames).fill(0);
    for (let a = 0; a < anchors.length - 1; a++) {
      const a1 = anchors[a];
      const a2 = anchors[a + 1];
      const span = a2.frameIdx - a1.frameIdx;
      for (let f = a1.frameIdx; f <= a2.frameIdx; f++) {
        const p = span > 0 ? (f - a1.frameIdx) / span : 0;
        frameAngles[f] = Number((a1.deg + p * (a2.deg - a1.deg)).toFixed(2));
      }
    }
    // 超过 loopIdx 的静止帧保持 360°
    for (let f = loopIdx; f < totalFrames; f++) {
      frameAngles[f] = 360;
    }

    return {
      totalFrames,
      frontFrame: 1,
      rightSideFrame: rightSideIdx + 1,
      backFrame: backIdx + 1,
      leftSideFrame: leftSideIdx + 1,
      loopFrame: loopIdx + 1,
      frameAngles,
    };
  }
}
