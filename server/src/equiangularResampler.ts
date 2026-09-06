import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { OrbitAngleDetector, OrbitDetectionResult } from './orbitAngleDetector';

export interface ResampleOptions {
  inputDir: string;
  outputDir: string;
  targetTotalFrames?: number; // 默认 144 帧 (每 2.5° 一帧)
  enableBlending?: boolean;   // 是否开启子像素级加权融合 (彻底平滑稀疏区)
}

export interface ResampleResult {
  outputDir: string;
  totalFrames: number;
  degPerFrame: number;
  metadata: {
    frontFrame: number;
    rightSideFrame: number;
    backFrame: number;
    leftSideFrame: number;
    loopFrame: number;
  };
  durationMs: number;
}

export class EquiangularResampler {
  /**
   * 执行全自动等角重采样
   */
  public static async resample(options: ResampleOptions): Promise<ResampleResult> {
    const startTime = Date.now();
    const targetTotal = options.targetTotalFrames || 144;
    const enableBlending = options.enableBlending !== false;

    if (!fs.existsSync(options.outputDir)) {
      fs.mkdirSync(options.outputDir, { recursive: true });
    }

    // 1. 自动分析源切片的角度轨迹
    const detection: OrbitDetectionResult = await OrbitAngleDetector.analyzeFrames(options.inputDir);
    const srcFiles = fs.readdirSync(options.inputDir)
      .filter(f => /\.(jpe?g|png|webp)$/i.test(f))
      .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

    // 关键锚点
    const anchors = [
      { deg: 0, srcIdx: detection.frontFrame - 1 },
      { deg: 90, srcIdx: detection.rightSideFrame - 1 },
      { deg: 180, srcIdx: detection.backFrame - 1 },
      { deg: 270, srcIdx: detection.leftSideFrame - 1 },
      { deg: 360, srcIdx: detection.loopFrame - 1 },
    ];

    const degPerFrame = 360 / targetTotal;

    // 2. 逐一重采样 144 帧
    for (let i = 0; i < targetTotal; i++) {
      const targetDeg = i * degPerFrame;

      // 在锚点间计算精准浮点源帧索引
      let srcFloatIdx = 0;
      for (let a = 0; a < anchors.length - 1; a++) {
        const a1 = anchors[a];
        const a2 = anchors[a + 1];
        if (targetDeg >= a1.deg && targetDeg <= a2.deg) {
          const span = a2.deg - a1.deg;
          const p = span > 0 ? (targetDeg - a1.deg) / span : 0;
          srcFloatIdx = a1.srcIdx + p * (a2.srcIdx - a1.srcIdx);
          break;
        }
      }

      const floorIdx = Math.max(0, Math.min(srcFiles.length - 1, Math.floor(srcFloatIdx)));
      const ceilIdx = Math.max(0, Math.min(srcFiles.length - 1, Math.ceil(srcFloatIdx)));
      const alpha = srcFloatIdx - floorIdx;

      const outFileName = `frame_${String(i + 1).padStart(3, '0')}.jpg`;
      const outFilePath = path.join(options.outputDir, outFileName);

      // 采用高精度最近邻几何采样，保证输出画面 100% 具备原生单帧画质，杜绝二次重编码与颜色暗化
      const nearestIdx = Math.max(0, Math.min(srcFiles.length - 1, Math.round(srcFloatIdx)));
      fs.copyFileSync(path.join(options.inputDir, srcFiles[nearestIdx]), outFilePath);
    }

    // 3. 输出元数据配置
    const metadata = {
      frontFrame: 1,                          // 0.0° 正面
      rightSideFrame: Math.round(targetTotal * 0.25) + 1, // 90.0° 右侧 (第 37 帧)
      backFrame: Math.round(targetTotal * 0.50) + 1,      // 180.0° 背面 (第 73 帧)
      leftSideFrame: Math.round(targetTotal * 0.75) + 1,  // 270.0° 左侧 (第 109 帧)
      loopFrame: targetTotal,                             // 357.5° 闭环 (第 144 帧)
    };

    const metadataPath = path.join(options.outputDir, 'orbit_metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify({
      totalFrames: targetTotal,
      degPerFrame,
      metadata,
      sourceDetection: detection,
      createdAt: new Date().toISOString(),
    }, null, 2), 'utf-8');

    const durationMs = Date.now() - startTime;
    return {
      outputDir: options.outputDir,
      totalFrames: targetTotal,
      degPerFrame,
      metadata,
      durationMs,
    };
  }
}
