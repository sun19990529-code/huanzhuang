import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizedToPixel,
  pixelToNormalized,
  calculateNormalizedDistance,
  evaluateSnapAlignment,
  calculateRenderZIndex,
  isMutuallyExclusive,
  analyzeGarmentAttributes,
  generateFissionAssets,
  calculateGoldenRatioBody,
  segmentMultiGarments,
  generateWeatherOutfitSuggestion,
} from '../dist/index.js';
import type { GarmentItem } from '../dist/index.js';

test('1. 归一化坐标转换与精度测试', () => {
  const canvas = { width: 800, height: 1200 };
  const normPoint = { x: 0.5, y: 0.28 };
  const pixel = normalizedToPixel(normPoint, canvas);

  assert.equal(pixel.x, 400);
  assert.equal(pixel.y, 336);

  const backToNorm = pixelToNormalized(pixel, canvas);
  assert.equal(backToNorm.x, 0.5);
  assert.equal(backToNorm.y, 0.28);
});

test('2. 欧几里得距离计算', () => {
  const p1 = { x: 0.5, y: 0.3 };
  const p2 = { x: 0.53, y: 0.34 };
  const dist = calculateNormalizedDistance(p1, p2);
  assert.equal(Math.round(dist * 100) / 100, 0.05);
});

test('3. 骨骼锚点智能吸附测试 (Snap Engine)', () => {
  const anchors = [
    { name: 'neck', anchor: { x: 0.5, y: 0.28 } },
    { name: 'waist', anchor: { x: 0.5, y: 0.55 } },
  ];

  const nearNeck = { x: 0.52, y: 0.29 };
  const res1 = evaluateSnapAlignment(nearNeck, anchors, 0.08);
  assert.equal(res1.isSnapped, true);
  assert.equal(res1.targetName, 'neck');
  assert.equal(res1.snappedPosition.x, 0.5);
  assert.equal(res1.snappedPosition.y, 0.28);

  const farAway = { x: 0.7, y: 0.8 };
  const res2 = evaluateSnapAlignment(farAway, anchors, 0.08);
  assert.equal(res2.isSnapped, false);
});

test('4. Z-Index 矩阵与状态联动计算', () => {
  const tShirtDefault = calculateRenderZIndex('TOPS', 'DEFAULT');
  assert.equal(tShirtDefault, 10);

  const tShirtUntucked = calculateRenderZIndex('TOPS', 'UNTUCKED');
  assert.equal(tShirtUntucked, 25);

  const jeansZ = calculateRenderZIndex('BOTTOMS', 'DEFAULT');
  assert.equal(jeansZ, 20);
  assert.ok(tShirtUntucked > jeansZ);
  assert.ok(tShirtDefault < jeansZ);

  assert.equal(calculateRenderZIndex('OUTERWEAR', 'OPEN'), 40);
  assert.equal(calculateRenderZIndex('OUTERWEAR', 'CLOSED'), 45);
});

test('5. 类目互斥检测', () => {
  assert.equal(isMutuallyExclusive('TOPS', 'TOPS'), true);
  assert.equal(isMutuallyExclusive('TOPS', 'BOTTOMS'), false);
  assert.equal(isMutuallyExclusive('ONE_PIECE', 'TOPS'), true);
  assert.equal(isMutuallyExclusive('ONE_PIECE', 'BOTTOMS'), true);
});

test('6. AI 多模态打标与属性提取测试', () => {
  const analysis1 = analyzeGarmentAttributes('极简复古法式西装大衣');
  assert.equal(analysis1.primaryCategory, 'OUTERWEAR');
  assert.equal(analysis1.subCategory, 'Blazer');
  assert.ok(analysis1.colors.length > 0);

  const analysis2 = analyzeGarmentAttributes('高腰复古牛仔短裙');
  assert.equal(analysis2.primaryCategory, 'BOTTOMS');
  assert.equal(analysis2.subCategory, 'Skirt');
});

test('7. 外套自动双态切片裂变测试 (Open/Closed Fission)', () => {
  const outerAssets = generateFissionAssets('test-outer', 'OUTERWEAR');
  assert.equal(outerAssets.length, 2);
  const stateTypes = outerAssets.map((a) => a.stateType);
  assert.ok(stateTypes.includes('OPEN'));
  assert.ok(stateTypes.includes('CLOSED'));

  const topAssets = generateFissionAssets('test-top', 'TOPS');
  assert.equal(topAssets.length, 2);
  assert.ok(topAssets.map((a) => a.stateType).includes('DEFAULT'));
  assert.ok(topAssets.map((a) => a.stateType).includes('TUCKED'));
});

test('8. 黄金比例身材估算测试 (Golden Ratio Body)', () => {
  const femaleBody = calculateGoldenRatioBody('FEMALE', 165);
  assert.ok(femaleBody.bustCm > 0);
  assert.ok(femaleBody.waistCm < femaleBody.bustCm);
  assert.ok(femaleBody.hipsCm > femaleBody.waistCm);

  const maleBody = calculateGoldenRatioBody('MALE', 180);
  assert.ok(maleBody.weightKg > 60);
});

test('9. [V2.5] 一拍多衣实例分割与温和文案测试 (One-Shot Multi-Segmentation)', () => {
  const segRes = segmentMultiGarments('photo-sample');
  assert.ok(segRes.items.length >= 2);
  assert.equal(segRes.costCredits, 2); // 打包优惠扣 2 分
  assert.ok(segRes.message.includes('打包优惠'));

  // 验证拆分出的单品各自包含切片与类别
  const categories = segRes.items.map((i) => i.primaryCategory);
  assert.ok(categories.includes('OUTERWEAR'));
  assert.ok(categories.includes('TOPS'));
  assert.ok(categories.includes('BOTTOMS'));
});

test('10. [V2.5] 气温情境穿搭推演与锁轴测试 (Capsule Slot Machine)', () => {
  const mockGarments: GarmentItem[] = [
    {
      id: 'g-top',
      profileId: 'p1',
      isPublic: false,
      title: '法式条纹T恤',
      primaryCategory: 'TOPS',
      subCategory: 'T-Shirt',
      colors: ['#2E7D32'],
      patterns: ['STRIPED'],
      assets: generateFissionAssets('g-top', 'TOPS'),
    },
    {
      id: 'g-bottom',
      profileId: 'p1',
      isPublic: false,
      title: '高腰直筒牛仔裤',
      primaryCategory: 'BOTTOMS',
      subCategory: 'Jeans',
      colors: ['#5C6BC0'],
      patterns: ['SOLID'],
      assets: generateFissionAssets('g-bottom', 'BOTTOMS'),
    },
    {
      id: 'g-outer',
      profileId: 'p1',
      isPublic: false,
      title: '廓形西装外套',
      primaryCategory: 'OUTERWEAR',
      subCategory: 'Blazer',
      colors: ['#D7CCC8'],
      patterns: ['SOLID'],
      assets: generateFissionAssets('g-outer', 'OUTERWEAR'),
    },
  ];

  // 18°C 微凉天气 -> 自动推荐上装 + 下装 + 外套
  const coolRes = generateWeatherOutfitSuggestion(mockGarments, 18);
  assert.equal(coolRes.selectedGarments.length, 3);
  assert.equal(coolRes.appliedStates['g-outer'], 'OPEN');

  // 锁定牛仔裤 -> 再次摇号保证牛仔裤依然在选中列表中
  const lockedRes = generateWeatherOutfitSuggestion(mockGarments, 25, ['g-bottom']);
  assert.ok(lockedRes.selectedGarments.some((g) => g.id === 'g-bottom'));
});
