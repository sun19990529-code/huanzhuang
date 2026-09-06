import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import test from 'node:test';
import assert from 'node:assert/strict';
import { VideoLoopValidator } from '../dist/videoLoopValidator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SAMPLE_FRAMES_DIR = path.resolve(__dirname, '../../web/public/experiments/frames_v4_180fps');
const TEMP_TEST_BASE = path.resolve(__dirname, '../temp_test_validator');

test('5重物理硬核质检门禁综合测试 (VideoLoopValidator)', async (t) => {
  // 确保测试临时目录干净
  if (fs.existsSync(TEMP_TEST_BASE)) {
    fs.rmSync(TEMP_TEST_BASE, { recursive: true, force: true });
  }
  fs.mkdirSync(TEMP_TEST_BASE, { recursive: true });

  const allFiles = fs.readdirSync(SAMPLE_FRAMES_DIR)
    .filter(f => /\.(jpe?g|png|webp)$/i.test(f))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

  assert.ok(allFiles.length >= 180, '基础测试样本 frames_v4_180fps 必须存在且不少于 180 帧');

  await t.test('1. 正常 360° 完美闭环视频质检验证 (通过门禁)', async () => {
    const res = await VideoLoopValidator.validateFrames(SAMPLE_FRAMES_DIR, 358.0);
    assert.equal(res.passed, true, '完整 360° 视频必须通过质检');
    assert.equal(res.code, 'PASS');
    assert.ok(res.metrics.cutFrameIndex > 150, '闭环截断帧应在末尾附近');
    assert.equal(res.metrics.quadrantsDetected.hasFront, true);
    assert.equal(res.metrics.quadrantsDetected.hasRight, true);
    assert.equal(res.metrics.quadrantsDetected.hasBack, true);
    assert.equal(res.metrics.quadrantsDetected.hasLeft, true);
    assert.equal(res.metrics.quadrantsDetected.hasLoop, true);
  });

  await t.test('2. 欠转缺角视频拦截测试 (仅转半圈/未达 358° 必须拦截打回)', async () => {
    const undershootDir = path.join(TEMP_TEST_BASE, 'undershoot');
    fs.mkdirSync(undershootDir, { recursive: true });
    // 只拷贝前 90 帧 (仅转了约 180°)
    for (let i = 0; i < 90; i++) {
      fs.copyFileSync(
        path.join(SAMPLE_FRAMES_DIR, allFiles[i]),
        path.join(undershootDir, `frame_${String(i + 1).padStart(3, '0')}.jpg`)
      );
    }

    const res = await VideoLoopValidator.validateFrames(undershootDir, 358.0);
    assert.equal(res.passed, false, '欠转视频坚决不允许放行');
    assert.equal(res.code, 'INSUFFICIENT_ROTATION');
    assert.ok(res.reason.includes('未达到 358°'), '应明确指出未达到 358° 阈值');
  });

  await t.test('3. 镜头反向倒车拦截测试 (DIRECTION_REVERSAL 必须拦截打回)', async () => {
    const reversalDir = path.join(TEMP_TEST_BASE, 'reversal');
    fs.mkdirSync(reversalDir, { recursive: true });
    // 拷贝前 50 帧正向，然后拼接 20 帧倒退
    let counter = 1;
    for (let i = 0; i < 50; i++) {
      fs.copyFileSync(
        path.join(SAMPLE_FRAMES_DIR, allFiles[i]),
        path.join(reversalDir, `frame_${String(counter++).padStart(3, '0')}.jpg`)
      );
    }
    // 倒退 20 帧
    for (let i = 49; i >= 30; i--) {
      fs.copyFileSync(
        path.join(SAMPLE_FRAMES_DIR, allFiles[i]),
        path.join(reversalDir, `frame_${String(counter++).padStart(3, '0')}.jpg`)
      );
    }

    const res = await VideoLoopValidator.validateFrames(reversalDir, 358.0);
    assert.equal(res.passed, false, '镜头反向掉头必须被拦截');
    assert.equal(res.code, 'DIRECTION_REVERSAL');
    assert.ok(res.metrics.reversalFrame && res.metrics.reversalFrame > 45, '应精准标记反向发生的帧号');
  });

  await t.test('4. 镜头跳变瞬移拦截测试 (HARD_CUT 必须拦截打回)', async () => {
    const hardCutDir = path.join(TEMP_TEST_BASE, 'hardcut');
    fs.mkdirSync(hardCutDir, { recursive: true });
    // 前 40 帧正常 (约 80°)，第 41 帧突然硬切到第 120 帧 (约 240°)
    let counter = 1;
    for (let i = 0; i < 40; i++) {
      fs.copyFileSync(
        path.join(SAMPLE_FRAMES_DIR, allFiles[i]),
        path.join(hardCutDir, `frame_${String(counter++).padStart(3, '0')}.jpg`)
      );
    }
    for (let i = 120; i < 160; i++) {
      fs.copyFileSync(
        path.join(SAMPLE_FRAMES_DIR, allFiles[i]),
        path.join(hardCutDir, `frame_${String(counter++).padStart(3, '0')}.jpg`)
      );
    }

    const res = await VideoLoopValidator.validateFrames(hardCutDir, 358.0);
    assert.equal(res.passed, false, '跳变硬切必须被拦截');
    assert.equal(res.code, 'HARD_CUT');
    assert.ok(res.metrics.jumpCutFrame && res.metrics.jumpCutFrame >= 40, '应精准标记跳变硬切的帧号');
  });

  // 测试清理
  fs.rmSync(TEMP_TEST_BASE, { recursive: true, force: true });
});
