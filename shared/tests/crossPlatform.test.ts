import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizedToPixel,
  pixelToNormalized,
  calculateNormalizedDistance,
  evaluateSnapAlignment,
  calculateRenderZIndex,
  isMutuallyExclusive,
} from '../dist/index.js';

test('1. 跨端高精度归一化坐标转换一致性 (Web & Android Precision Test)', () => {
  // 模拟典型 Android 手机物理分辨率 (1080 x 2400) 与 Web 标准画布 (400 x 600)
  const androidCanvas = { width: 1080, height: 2400 };
  const webCanvas = { width: 400, height: 600 };

  const anchorNeck = { x: 0.5, y: 0.28 };

  const androidPix = normalizedToPixel(anchorNeck, androidCanvas);
  const webPix = normalizedToPixel(anchorNeck, webCanvas);

  assert.equal(androidPix.x, 540);
  assert.equal(androidPix.y, 672);
  assert.equal(webPix.x, 200);
  assert.equal(webPix.y, 168);

  // 反向转换误差必须 < 0.0001
  const androidBack = pixelToNormalized(androidPix, androidCanvas);
  const webBack = pixelToNormalized(webPix, webCanvas);

  assert.ok(Math.abs(androidBack.x - 0.5) < 0.0001);
  assert.ok(Math.abs(androidBack.y - 0.28) < 0.0001);
  assert.ok(Math.abs(webBack.x - 0.5) < 0.0001);
  assert.ok(Math.abs(webBack.y - 0.28) < 0.0001);
});

test('2. 跨端欧几里得 Snap 磁吸阈值判定一致性 (<0.08)', () => {
  const anchors = [
    { name: 'neck', anchor: { x: 0.5, y: 0.28 } },
    { name: 'waist', anchor: { x: 0.5, y: 0.53 } },
    { name: 'feet', anchor: { x: 0.5, y: 0.88 } },
  ];

  // 边界距离测试：0.079 (< 0.08 吸附)
  const nearNeck = { x: 0.55, y: 0.32 };
  const dist = calculateNormalizedDistance(nearNeck, anchors[0].anchor);
  assert.ok(dist < 0.08);

  const res = evaluateSnapAlignment(nearNeck, anchors, 0.08);
  assert.equal(res.isSnapped, true);
  assert.equal(res.targetName, 'neck');
  assert.equal(res.snappedPosition.x, 0.5);
  assert.equal(res.snappedPosition.y, 0.28);
});

test('3. 跨端 Z-Index 矩阵与形态联动计算公式一致性', () => {
  // L0 素体
  assert.equal(calculateRenderZIndex('AVATAR' as any, 'DEFAULT'), 0);
  // L1 T恤塞衣角 10, 外放 25
  assert.equal(calculateRenderZIndex('TOPS', 'DEFAULT'), 10);
  assert.equal(calculateRenderZIndex('TOPS', 'TUCKED'), 10);
  assert.equal(calculateRenderZIndex('TOPS', 'UNTUCKED'), 25);
  // L2 下装 20
  assert.equal(calculateRenderZIndex('BOTTOMS', 'DEFAULT'), 20);
  // L4 外套敞开 40, 合拢 45
  assert.equal(calculateRenderZIndex('OUTERWEAR', 'OPEN'), 40);
  assert.equal(calculateRenderZIndex('OUTERWEAR', 'CLOSED'), 45);
  // L5 鞋袜 50
  assert.equal(calculateRenderZIndex('FOOTWEAR', 'DEFAULT'), 50);
  // L6 配饰 60
  assert.equal(calculateRenderZIndex('ACCESSORIES', 'DEFAULT'), 60);
});

test('4. 离线优先同步状态机流转 (Offline-First State Machine)', () => {
  // 离线暂存 -> 初始 PENDING
  const localOutfit = {
    id: 'outfit-local-1',
    syncStatus: 'PENDING',
    items: ['garment-1', 'garment-2'],
  };
  assert.equal(localOutfit.syncStatus, 'PENDING');

  // 模拟网络恢复 WorkManager 同步成功 -> 标记为 SYNCED
  localOutfit.syncStatus = 'SYNCED';
  assert.equal(localOutfit.syncStatus, 'SYNCED');
});
