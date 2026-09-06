import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

export interface QualityGateResult {
  passed: boolean;
  code: 'PASS' | 'DIRECTION_REVERSAL' | 'HARD_CUT' | 'CAMERA_STAGNATION' | 'INSUFFICIENT_ROTATION';
  reason: string;
  metrics: {
    totalFrames: number;
    estimatedMaxAngle: number;
    cutFrameIndex: number; // 0-based, 精准 360° 截断点
    dominantDirection: 'CLOCKWISE' | 'COUNTER_CLOCKWISE' | 'UNKNOWN';
    reversalFrame?: number;
    jumpCutFrame?: number;
    stagnationRange?: [number, number];
    quadrantsDetected: {
      hasFront: boolean;
      hasRight: boolean;
      hasBack: boolean;
      hasLeft: boolean;
      hasLoop: boolean;
    };
  };
}

interface FrameStats {
  frameIdx: number;
  width: number;
  darkCount: number;
  diffWithPrev: number;
  diffWithFirst: number;
  flowVelocity: number; // 基于 Horn-Schunck 光流梯度的水平旋转速度
}

export class VideoLoopValidator {
  /**
   * 严格按 5 重物理硬核质检标准审查切片目录
   * @param framesDir 切片帧所在目录 (按序号升序命名)
   * @param minAngleThreshold 最低接受角度 (默认 358.0°)
   */
  public static async validateFrames(
    framesDir: string,
    minAngleThreshold: number = 358.0
  ): Promise<QualityGateResult> {
    const files = fs.readdirSync(framesDir)
      .filter(f => /\.(jpe?g|png|webp)$/i.test(f))
      .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

    if (files.length < 24) {
      return {
        passed: false,
        code: 'INSUFFICIENT_ROTATION',
        reason: `切片帧数严重不足 (${files.length} 帧)，无法构成物理连续旋转`,
        metrics: {
          totalFrames: files.length,
          estimatedMaxAngle: 0,
          cutFrameIndex: 0,
          dominantDirection: 'UNKNOWN',
          quadrantsDetected: { hasFront: false, hasRight: false, hasBack: false, hasLeft: false, hasLoop: false },
        },
      };
    }

    const totalFrames = files.length;
    const stats: FrameStats[] = [];

    // 标准化缩放至 90x160 灰度，快速且对结构特征极度敏感
    const frameBuffers: Buffer[] = [];
    for (let i = 0; i < totalFrames; i++) {
      const buf = await sharp(path.join(framesDir, files[i]))
        .resize(90, 160)
        .grayscale()
        .raw()
        .toBuffer();
      frameBuffers.push(buf);
    }

    const w = 90;
    const h = 160;
    const startY = Math.floor(h * 0.25);
    const endY = Math.floor(h * 0.75);

    // 第一帧基准数据
    const firstBuf = frameBuffers[0];

    for (let i = 0; i < totalFrames; i++) {
      const curBuf = frameBuffers[i];
      let diffFirst = 0;
      let diffPrev = 0;
      let darkCount = 0;
      let totalWidth = 0;
      let validRows = 0;

      const prevBuf = i > 0 ? frameBuffers[i - 1] : curBuf;

      for (let y = startY; y < endY; y++) {
        let minX = w;
        let maxX = -1;
        const rowOffset = y * w;

        for (let x = 0; x < w; x++) {
          const idx = rowOffset + x;
          const val = curBuf[idx];

          diffFirst += Math.abs(val - firstBuf[idx]);
          diffPrev += Math.abs(val - prevBuf[idx]);

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

      // 计算一阶时空光流速度
      let flowVel = 0;
      if (i > 0) {
        flowVel = VideoLoopValidator.computeOpticalFlowVelocity(prevBuf, curBuf, w, startY, endY);
      }

      stats.push({
        frameIdx: i,
        width: validRows > 0 ? totalWidth / validRows : 0,
        darkCount,
        diffWithPrev: diffPrev,
        diffWithFirst: diffFirst,
        flowVelocity: flowVel,
      });
    }

    // ==========================================
    // 门禁 1：连续性检验 (防止硬切瞬移跳帧 Hard Cut) - 前置执行
    // ==========================================
    const diffs = stats.slice(1).map(s => s.diffWithPrev);
    const avgDiff = diffs.reduce((a, b) => a + b, 0) / (diffs.length || 1);
    let jumpCutFrame = -1;

    for (let i = 1; i < totalFrames; i++) {
      // 若某一帧差异突然达到平均差异的 3.8 倍以上且绝对值显著，判定为剪辑跳变
      if (stats[i].diffWithPrev > Math.max(avgDiff * 3.8, 40000)) {
        jumpCutFrame = i;
        break;
      }
    }

    if (jumpCutFrame !== -1) {
      return {
        passed: false,
        code: 'HARD_CUT',
        reason: `检测到镜头跳变硬切 (在第 ${jumpCutFrame + 1} 帧画面出现不连续断层突变)`,
        metrics: {
          totalFrames,
          estimatedMaxAngle: 0,
          cutFrameIndex: 0,
          dominantDirection: 'UNKNOWN',
          jumpCutFrame: jumpCutFrame + 1,
          quadrantsDetected: { hasFront: true, hasRight: false, hasBack: false, hasLeft: false, hasLoop: false },
        },
      };
    }

    // ==========================================
    // 门禁 2：主旋转方向测定与反向倒退检验 (Monotonicity Guard)
    // ==========================================
    let positiveFlow = 0;
    let negativeFlow = 0;
    for (let i = 1; i < totalFrames; i++) {
      if (stats[i].flowVelocity > 0.08) positiveFlow++;
      else if (stats[i].flowVelocity < -0.08) negativeFlow++;
    }

    const dominantDirection: 'CLOCKWISE' | 'COUNTER_CLOCKWISE' | 'UNKNOWN' =
      positiveFlow >= negativeFlow ? 'CLOCKWISE' : 'COUNTER_CLOCKWISE';

    // 检查是否有持续 4 帧以上相反符号的光流流动 (严禁倒车)
    let consecutiveReverse = 0;
    let reversalFrame = -1;
    for (let i = 1; i < totalFrames; i++) {
      const v = stats[i].flowVelocity;
      const isReverse = dominantDirection === 'CLOCKWISE' ? v < -0.12 : v > 0.12;
      if (isReverse) {
        consecutiveReverse++;
        if (consecutiveReverse >= 4) {
          reversalFrame = i - 3;
          break;
        }
      } else {
        consecutiveReverse = 0;
      }
    }

    if (reversalFrame !== -1) {
      return {
        passed: false,
        code: 'DIRECTION_REVERSAL',
        reason: `检测到镜头反向掉头倒退 (在第 ${reversalFrame + 1} 帧附近出现持续反向运镜)`,
        metrics: {
          totalFrames,
          estimatedMaxAngle: 0,
          cutFrameIndex: 0,
          dominantDirection,
          reversalFrame: reversalFrame + 1,
          quadrantsDetected: { hasFront: true, hasRight: false, hasBack: false, hasLeft: false, hasLoop: false },
        },
      };
    }

    // ==========================================
    // 门禁 3：角速度下限检验 (防止长时间停滞发呆 Stagnation)
    // ==========================================
    const stagnationThreshold = Math.max(15, Math.floor(totalFrames * 0.12));
    let consecutiveFreeze = 0;
    let stagnationRange: [number, number] | undefined;

    for (let i = 1; i < totalFrames; i++) {
      if (stats[i].diffWithPrev < avgDiff * 0.18 && Math.abs(stats[i].flowVelocity) < 0.05) {
        consecutiveFreeze++;
        if (consecutiveFreeze >= stagnationThreshold) {
          stagnationRange = [i - stagnationThreshold + 1, i + 1];
          break;
        }
      } else {
        consecutiveFreeze = 0;
      }
    }

    if (stagnationRange) {
      return {
        passed: false,
        code: 'CAMERA_STAGNATION',
        reason: `检测到运镜原地停滞发呆 (在第 ${stagnationRange[0]} 至 ${stagnationRange[1]} 帧之间画面无有效推进)`,
        metrics: {
          totalFrames,
          estimatedMaxAngle: 0,
          cutFrameIndex: 0,
          dominantDirection,
          stagnationRange,
          quadrantsDetected: { hasFront: true, hasRight: false, hasBack: false, hasLeft: false, hasLoop: false },
        },
      };
    }

    // ==========================================
    // 门禁 4 & 5：四方位波谷解析与 358°~360° 完整性量尺
    // ==========================================
    const smoothedWidths = stats.map((s, i) => {
      let sum = 0;
      let count = 0;
      for (let k = Math.max(0, i - 2); k <= Math.min(stats.length - 1, i + 2); k++) {
        sum += stats[k].width;
        count++;
      }
      return sum / count;
    });

    // 寻找两次身体变窄的侧身点 (90° 与 270°)
    const q1Start = Math.floor(totalFrames * 0.12);
    const q1End = Math.floor(totalFrames * 0.50);
    let rightSideIdx = -1;
    let minW1 = Infinity;
    for (let i = q1Start; i <= q1End; i++) {
      if (smoothedWidths[i] < minW1) {
        minW1 = smoothedWidths[i];
        rightSideIdx = i;
      }
    }

    const q3Start = Math.max(rightSideIdx + 8, Math.floor(totalFrames * 0.52));
    const q3End = Math.floor(totalFrames * 0.88);
    let leftSideIdx = -1;
    let minW2 = Infinity;
    for (let i = q3Start; i <= q3End; i++) {
      if (smoothedWidths[i] < minW2) {
        minW2 = smoothedWidths[i];
        leftSideIdx = i;
      }
    }

    // 背面 180°
    let backIdx = -1;
    if (rightSideIdx !== -1 && leftSideIdx !== -1 && leftSideIdx > rightSideIdx + 6) {
      let maxBackScore = -Infinity;
      for (let i = rightSideIdx + 3; i <= leftSideIdx - 3; i++) {
        const score = smoothedWidths[i] + (stats[i].diffWithFirst / 15000);
        if (score > maxBackScore) {
          maxBackScore = score;
          backIdx = i;
        }
      }
    }

    // 闭环点搜索：在左侧身之后寻找与第 1 帧差异极小的回正帧
    let bestLoopIdx = -1;
    let minLoopDiff = Infinity;
    if (leftSideIdx !== -1) {
      for (let i = leftSideIdx + 4; i < totalFrames; i++) {
        if (stats[i].diffWithFirst < minLoopDiff) {
          minLoopDiff = stats[i].diffWithFirst;
          bestLoopIdx = i;
        }
      }
    }

    const hasFront = true;
    const hasRight = rightSideIdx !== -1;
    const hasBack = backIdx !== -1;
    const hasLeft = leftSideIdx !== -1;
    let hasLoop = false;
    let estimatedMaxAngle = 0;

    if (hasRight) estimatedMaxAngle = Math.max(estimatedMaxAngle, 90);
    if (hasBack) estimatedMaxAngle = Math.max(estimatedMaxAngle, 180);
    if (hasLeft) estimatedMaxAngle = Math.max(estimatedMaxAngle, 270);

    if (bestLoopIdx !== -1 && leftSideIdx !== -1) {
      const spanFromLeft = bestLoopIdx - leftSideIdx;
      const expectedSpan = (leftSideIdx - (backIdx !== -1 ? backIdx : rightSideIdx));
      const ratio = expectedSpan > 0 ? spanFromLeft / expectedSpan : 1;
      
      const firstFrameBaseline = stats[rightSideIdx]?.diffWithFirst || 100000;
      const isResidualGood = minLoopDiff < firstFrameBaseline * 0.45;

      if (isResidualGood && ratio >= 0.8) {
        estimatedMaxAngle = 360;
        hasLoop = true;
      } else {
        estimatedMaxAngle = Math.min(355, 270 + ratio * 85);
      }
    }

    // 严格按照用户制定的 358.0° 门禁阈值进行生死判定
    if (estimatedMaxAngle < minAngleThreshold || !hasLoop || bestLoopIdx === -1) {
      return {
        passed: false,
        code: 'INSUFFICIENT_ROTATION',
        reason: `旋转角度未达到 358° 物理闭环标准 (实际仅约 ${estimatedMaxAngle.toFixed(1)}°，缺少完整回正面)`,
        metrics: {
          totalFrames,
          estimatedMaxAngle,
          cutFrameIndex: bestLoopIdx !== -1 ? bestLoopIdx : totalFrames - 1,
          dominantDirection,
          quadrantsDetected: { hasFront, hasRight, hasBack, hasLeft, hasLoop },
        },
      };
    }

    // 质检完全通过！精准定位 360° 截断点
    return {
      passed: true,
      code: 'PASS',
      reason: `5重物理质检全部通过！成功覆盖 360° 全闭环 (在第 ${bestLoopIdx + 1} 帧精准完成闭环截断)`,
      metrics: {
        totalFrames,
        estimatedMaxAngle: 360,
        cutFrameIndex: bestLoopIdx,
        dominantDirection,
        quadrantsDetected: { hasFront: true, hasRight: true, hasBack: true, hasLeft: true, hasLoop: true },
      },
    };
  }

  /**
   * 基于 Horn-Schunck 时空一阶梯度计算前景像素的平均水平光流速度
   * It + u*Ix = 0 => u ~ - (Ix * It) / (Ix^2 + epsilon)
   */
  private static computeOpticalFlowVelocity(
    prevBuf: Buffer,
    curBuf: Buffer,
    width: number,
    startY: number,
    endY: number
  ): number {
    let sumIxIt = 0;
    let sumIx2 = 0;

    for (let y = startY; y < endY; y++) {
      const row = y * width;
      for (let x = 2; x < width - 2; x++) {
        const idx = row + x;
        // 前景掩码过滤 (纯白背景为 255，阈值 235)
        if (curBuf[idx] < 235 || prevBuf[idx] < 235) {
          const Ix = (curBuf[idx + 1] - curBuf[idx - 1]) * 0.5;
          const It = curBuf[idx] - prevBuf[idx];

          sumIxIt += Ix * It;
          sumIx2 += Ix * Ix;
        }
      }
    }

    if (sumIx2 < 50) return 0;
    return - (sumIxIt / (sumIx2 + 1e-4));
  }
}
