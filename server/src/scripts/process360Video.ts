import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { EquiangularResampler } from '../equiangularResampler';
import { VideoLoopValidator } from '../videoLoopValidator';

async function main() {
  const args = process.argv.slice(2);
  const inputArg = args[0] || 'web/public/experiments/orbit_v4.mp4';
  const outputDirArg = args[1] || 'web/public/experiments/frames_v4_180fps';
  const targetFrames = parseInt(args[2] || '180', 10);

  const rootDir = path.resolve(__dirname, '../../..');
  const inputPath = path.resolve(rootDir, inputArg);
  const outputDir = path.resolve(rootDir, outputDirArg);

  console.log('========================================================');
  console.log(`🚀 360° 空间环视等角重采样流水线启动 (目标 ${targetFrames} 帧 · ${(360 / targetFrames).toFixed(1)}°/帧)`);
  console.log(`输入源: ${inputPath}`);
  console.log(`输出目录: ${outputDir}`);
  console.log('========================================================');

  let framesSourceDir = inputPath;

  // 若输入是视频文件，则先使用 FFmpeg 快速提取原始序列
  if (fs.existsSync(inputPath) && fs.statSync(inputPath).isFile()) {
    const tempDir = path.resolve(rootDir, 'temp/orbit_raw_extract');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    console.log(`[FFmpeg] 正在从视频原片快速提取全量帧至临时目录: ${tempDir}`);
    const ffStart = Date.now();
    execSync(`ffmpeg -y -i "${inputPath}" -q:v 2 "${tempDir}/frame_%04d.jpg"`, { stdio: 'ignore' });
    console.log(`[FFmpeg] 提取完成，耗时: ${Date.now() - ffStart} ms`);
    framesSourceDir = tempDir;
  }

  // 1. 严格执行 5 重物理硬核质检门禁 (卡死 358°，杜绝反转/跳切/停滞)
  console.log('\n[QualityGate] 正在执行 5 重物理硬核质检 (反转/跳切/停滞/四方位/358°闭环)...');
  const qStart = Date.now();
  const qResult = await VideoLoopValidator.validateFrames(framesSourceDir, 358.0);
  console.log(`[QualityGate] 质检解算耗时: ${Date.now() - qStart} ms`);

  if (!qResult.passed) {
    console.error(`\n🚨 [QualityGate Rejected] 视频未通过 360° 物理质检门禁！`);
    console.error(`- 错误代码: ${qResult.code}`);
    console.error(`- 详细原因: ${qResult.reason}`);
    console.error(`- 质检指标:`, qResult.metrics);
    console.error(`⚠️ 已自动拦截，坚决不向展台交付瑕疵资源！建议触发重试重新生成。\n`);
    process.exit(1);
  }

  console.log(`✅ [QualityGate Passed] 5重物理质检完全达标！`);
  console.log(`- 主导旋转方向: ${qResult.metrics.dominantDirection}`);
  console.log(`- 精准 360° 闭环截断帧: 第 ${qResult.metrics.cutFrameIndex + 1} 帧\n`);

  console.log('[Resampler] 正在执行人体姿态轨迹自动分析与等角重采样...');
  const result = await EquiangularResampler.resample({
    inputDir: framesSourceDir,
    outputDir: outputDir,
    targetTotalFrames: targetFrames,
    enableBlending: true,
  });

  // 计算输出目录大小
  const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.jpg'));
  let totalBytes = 0;
  for (const f of files) {
    totalBytes += fs.statSync(path.join(outputDir, f)).size;
  }
  const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);

  console.log('\n🎉 [Success] 等角重采样完成！全量指标报告如下:');
  console.log(`- 输出帧数: ${result.totalFrames} 帧 (严格每 ${result.degPerFrame}° 一帧)`);
  console.log(`- 总体积: ${totalMB} MB (平均单帧 ${(totalBytes / files.length / 1024).toFixed(1)} KB)`);
  console.log(`- 纯算法重采样耗时: ${result.durationMs} ms`);
  console.log('- 物理四方位标准化对齐:');
  console.log(`  · 正面 (0.0°):   第 ${result.metadata.frontFrame} 帧`);
  console.log(`  · 右侧 (90.0°):  第 ${result.metadata.rightSideFrame} 帧`);
  console.log(`  · 背面 (180.0°): 第 ${result.metadata.backFrame} 帧`);
  console.log(`  · 左侧 (270.0°): 第 ${result.metadata.leftSideFrame} 帧`);
  console.log(`  · 闭环 (357.5°): 第 ${result.metadata.loopFrame} 帧`);
}

main().catch(err => {
  console.error('处理过程发生异常:', err);
  process.exit(1);
});
