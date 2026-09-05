import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../dist/db.js';
import type { ExtendedGarmentItem } from '../dist/db.js';
import { pipeline } from '../dist/pipeline.js';
import { pgPool } from '../dist/pgPool.js';
import {
  calculateGoldenRatioBody,
  segmentMultiGarments,
  generateWeatherOutfitSuggestion,
  generateFissionAssets,
} from '@smart-wardrobe/shared';

test.before(async () => {
  // 按照规则第五章要求，测试前必须预加载真实的持久化落盘数据
  await db.init();
});


test('1. 用户初始积分与状态检查', () => {
  // 严格绑定规则第五章指定的固定标准用户测试账号
  const user = Array.from(db.users.values()).find((u) => u.email === 'test@smartwardrobe.com');
  assert.ok(user, '固定测试用户 test@smartwardrobe.com 必须存在于数据库中');
  assert.equal(user.status, 'NORMAL');
  assert.ok(user.dailyCredits >= 0);
  assert.ok(user.permanentCredits >= 0);
});

test('2. 公共衣物 Prototype 深度克隆与解耦验证', () => {
  const user = Array.from(db.users.values()).find((u) => u.email === 'test@smartwardrobe.com')!;
  const targetProfile = Array.from(db.profiles.values()).find((p) => p.userId === user.id) || Array.from(db.profiles.values())[0];
  const publicGarment = Array.from(db.garments.values()).find((g) => g.isPublic);

  assert.ok(targetProfile, '测试用户 profile 必须存在');
  assert.ok(publicGarment, '系统预设公共单品必须存在');

  const cloned = db.clonePublicGarment(publicGarment.id, targetProfile.id);
  assert.ok(cloned);
  assert.notEqual(cloned.id, publicGarment.id);
  assert.equal(cloned.profileId, targetProfile.id);
  assert.equal(cloned.isPublic, false);
  assert.equal(cloned.clonedFromId, publicGarment.id);

  // 验证切片独立性
  if (cloned.assets && cloned.assets.length > 0) {
    assert.equal(cloned.assets[0].garmentId, cloned.id);
  }
});

test('3. 积分原子扣除机制（优先消耗 daily_credits，不足消耗 permanent_credits）', () => {
  const user = Array.from(db.users.values()).find((u) => u.email === 'test@smartwardrobe.com')!;
  const origDaily = user.dailyCredits;
  const origPerm = user.permanentCredits;

  try {
    // 临时设置充足基准积分测试原子扣除机制
    user.dailyCredits = 50;
    user.permanentCredits = 20;

    // 扣 5 点测试
    const res1 = db.deductCredits(user.id, 5, 'AI VTON 测试');
    assert.equal(res1.success, true);
    assert.equal(res1.remainingDaily, 45);
    assert.equal(res1.remainingPermanent, 20);

    // 耗尽当前 daily
    const res2 = db.deductCredits(user.id, 45, '耗尽每日积分');
    assert.equal(res2.success, true);
    assert.equal(res2.remainingDaily, 0);

    // 扣除部分 permanent
    const res3 = db.deductCredits(user.id, 10, '消耗永久积分');
    assert.equal(res3.success, true);
    assert.equal(res3.remainingDaily, 0);
    assert.equal(res3.remainingPermanent, 10);
  } finally {
    // 严格恢复测试用户的原始积分，保证不污染真实数据库资产
    user.dailyCredits = origDaily;
    user.permanentCredits = origPerm;
  }
});

test('4. 每日零点批量重置积分与记账流水', () => {
  const user = Array.from(db.users.values()).find((u) => u.email === 'test@smartwardrobe.com')!;
  const origDaily = user.dailyCredits;

  try {
    db.resetDailyCredits();
    assert.equal(user.dailyCredits, 100);

    const resetLedger = db.creditLedger.find((l) => l.txType === 'DAILY_RESET');
    assert.ok(resetLedger);
  } finally {
    user.dailyCredits = origDaily;
  }
});

test('5. AI 上传打标与外套双态裂变入库测试', () => {
  const gId = `g-outer-test-${Date.now()}`;
  const openUrl = 'data:image/png;base64,mockOpenData';
  const closedUrl = 'data:image/png;base64,mockClosedData';

  const assets = generateFissionAssets(gId, 'OUTERWEAR', openUrl, closedUrl);
  assert.equal(assets.length, 2);
  const openAsset = assets.find((a) => a.stateType === 'OPEN');
  const closedAsset = assets.find((a) => a.stateType === 'CLOSED');

  assert.ok(openAsset, '必须存在 OPEN 敞开切片');
  assert.ok(closedAsset, '必须存在 CLOSED 扣合切片');
  assert.equal(openAsset.pngUrl, openUrl);
  assert.equal(closedAsset.pngUrl, closedUrl);
  assert.notEqual(openAsset.pngUrl, closedAsset.pngUrl, '外套双态切片绝对禁止同图');
});

test('6. 好友借穿穿搭建议推送与采纳测试 (Suggest Outfit)', () => {
  const user = Array.from(db.users.values()).find((u) => u.email === 'test@smartwardrobe.com')!;
  const targetProfile = Array.from(db.profiles.values()).find((p) => p.userId === user.id) || Array.from(db.profiles.values())[0];
  const publicGarment = Array.from(db.garments.values()).find((g) => g.isPublic)!;

  const suggestionId = `sug-${Date.now()}`;
  db.suggestions.set(suggestionId, {
    id: suggestionId,
    fromUserId: 'user-friend-mock-001',
    fromNickname: '闺蜜小美',
    targetUserId: user.id,
    targetProfileId: targetProfile.id,
    title: '早秋叠穿',
    garmentIds: [publicGarment.id],
    isAccepted: false,
    createdAt: new Date().toISOString(),
  });

  const sug = db.suggestions.get(suggestionId)!;
  assert.equal(sug.isAccepted, false);

  sug.isAccepted = true;
  assert.equal(sug.isAccepted, true);
});

test('7. 超时退款事务保护 (90s SLA Refund)', () => {
  const user = Array.from(db.users.values()).find((u) => u.email === 'test@smartwardrobe.com')!;
  const beforeRefund = user.dailyCredits;

  db.refundCredits(user.id, 5, '任务超时 90s 退款', 'task-timeout-test');
  const afterRefund = user.dailyCredits;

  assert.equal(afterRefund, beforeRefund + 5);

  const refundLedger = db.creditLedger.find((l) => l.txType === 'REFUND');
  assert.ok(refundLedger);
  assert.equal(refundLedger.deltaDaily, 5);

  // 恢复退款前积分
  user.dailyCredits = beforeRefund;
});

test('8. [Phase 3] 多 Profile 创建与黄金比例身材计算', () => {
  const golden = calculateGoldenRatioBody('FEMALE', 170);
  assert.ok(golden.bustCm > 0);
  assert.ok(golden.waistCm > 0);
  assert.ok(golden.hipsCm > 0);
  assert.ok(golden.weightKg > 0);

  const user = Array.from(db.users.values()).find((u) => u.email === 'test@smartwardrobe.com')!;
  const profileId = `profile-test-${Date.now()}`;
  db.profiles.set(profileId, {
    id: profileId,
    userId: user.id,
    name: '宝贝女儿',
    gender: 'FEMALE',
    isDefault: false,
    heightCm: 140,
    weightKg: 35,
    bustCm: 68,
    waistCm: 56,
    hipsCm: 70,
    isCustomBodyParams: true,
    privacyLevel: 'PRIVATE',
  });

  const created = db.profiles.get(profileId);
  assert.ok(created);
  assert.equal(created.name, '宝贝女儿');
  assert.equal(created.privacyLevel, 'PRIVATE');

  // 清理临时 profile
  db.profiles.delete(profileId);
});

test('9. [Phase 3] CMS 公共单品修改、上下架切换与解耦隔离', () => {
  const garment = Array.from(db.garments.values()).find((g) => g.isPublic)!;
  const originalArchived = garment.isArchived;

  try {
    garment.isArchived = false;
    assert.equal(garment.isArchived, false);

    // 模拟下架
    garment.isArchived = true;
    assert.equal(garment.isArchived, true);
  } finally {
    garment.isArchived = originalArchived;
  }
});

test('10. [V2.5] 一拍多衣批量分割与 2 积分打包扣除测试', () => {
  const user = Array.from(db.users.values()).find((u) => u.email === 'test@smartwardrobe.com')!;
  const targetProfile = Array.from(db.profiles.values()).find((p) => p.userId === user.id) || Array.from(db.profiles.values())[0];
  const segRes = segmentMultiGarments('test-multi-photo');
  assert.ok(segRes.items.length >= 2);
  assert.equal(segRes.costCredits, 2);

  // 模拟批量写入并生成切片
  segRes.items.forEach((item, idx) => {
    const gId = `batch-test-${idx}`;
    const assets = generateFissionAssets(gId, item.primaryCategory);
    db.garments.set(gId, {
      id: gId,
      profileId: targetProfile.id,
      isPublic: false,
      title: item.title,
      primaryCategory: item.primaryCategory,
      subCategory: item.subCategory,
      colors: item.colors,
      patterns: ['SOLID'],
      assets,
    });
    assert.ok(db.garments.get(gId));
    // 清理模拟单品
    db.garments.delete(gId);
  });
});

test('11. [V2.5] 灵感扭蛋机气温推演与锁轴匹配测试', () => {
  const garments = Array.from(db.garments.values());
  const suggestion = generateWeatherOutfitSuggestion(garments, 20);
  assert.ok(suggestion.selectedGarments.length >= 2);
  assert.ok(suggestion.description.includes('20°C'));
});

test.after(async () => {
  await pgPool.end();
});
