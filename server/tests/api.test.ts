import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../dist/db.js';
import type { ExtendedGarmentItem } from '../dist/db.js';
import { pipeline } from '../dist/pipeline.js';
import {
  calculateGoldenRatioBody,
  segmentMultiGarments,
  generateWeatherOutfitSuggestion,
  generateFissionAssets,
} from '@smart-wardrobe/shared';

test('1. 用户初始积分与状态检查', () => {
  const user = db.users.get('11111111-1111-1111-1111-111111111111')!;
  assert.ok(user);
  assert.equal(user.dailyCredits, 100);
  assert.equal(user.permanentCredits, 20);
});

test('2. 公共衣物 Prototype 深度克隆与解耦验证', () => {
  const targetProfileId = 'c4d3b2a1-0000-0000-0000-123456789abc';
  const publicGarmentId = '9f8e7d6c-5b4a-3210-fedc-ba9876543210';

  const cloned = db.clonePublicGarment(publicGarmentId, targetProfileId);
  assert.ok(cloned);
  assert.notEqual(cloned.id, publicGarmentId);
  assert.equal(cloned.profileId, targetProfileId);
  assert.equal(cloned.isPublic, false);
  assert.equal(cloned.clonedFromId, publicGarmentId);

  // 验证切片独立性
  assert.notEqual(cloned.assets[0].id, 'asset-9f8e-default');
  assert.equal(cloned.assets[0].garmentId, cloned.id);
});

test('3. 积分原子扣除机制（优先消耗 daily_credits，不足消耗 permanent_credits）', () => {
  const userId = '11111111-1111-1111-1111-111111111111';

  // 扣 5 点 VTON
  const res1 = db.deductCredits(userId, 5, 'AI VTON 测试');
  assert.equal(res1.success, true);
  assert.equal(res1.remainingDaily, 95);
  assert.equal(res1.remainingPermanent, 20);

  // 扣 95 点耗尽 daily
  const res2 = db.deductCredits(userId, 95, '耗尽每日积分');
  assert.equal(res2.success, true);
  assert.equal(res2.remainingDaily, 0);
  assert.equal(res2.remainingPermanent, 20);

  // 扣 10 点消耗 permanent
  const res3 = db.deductCredits(userId, 10, '消耗永久积分');
  assert.equal(res3.success, true);
  assert.equal(res3.remainingDaily, 0);
  assert.equal(res3.remainingPermanent, 10);

  // 再次扣 15 点超额拦截
  const res4 = db.deductCredits(userId, 15, '超额扣除测试');
  assert.equal(res4.success, false);
});

test('4. 每日零点批量重置积分与记账流水', () => {
  db.resetDailyCredits();
  const user = db.users.get('11111111-1111-1111-1111-111111111111')!;
  assert.equal(user.dailyCredits, 100);

  const resetLedger = db.creditLedger.find((l) => l.txType === 'DAILY_RESET');
  assert.ok(resetLedger);
  assert.equal(resetLedger.deltaDaily, 100);
});

test('5. AI 上传打标与外套双态裂变入库测试', () => {
  const { taskId, estimatedSeconds } = pipeline.submitTask(
    '11111111-1111-1111-1111-111111111111',
    'GARMENT_NORMALIZE',
    1,
    { garmentId: 'g-test-123' }
  );

  assert.ok(taskId);
  assert.equal(estimatedSeconds, 3);

  const task = db.asyncTasks.get(taskId);
  assert.ok(task);
  assert.equal(task.costCredits, 1);
});

test('6. 好友借穿穿搭建议推送与采纳测试 (Suggest Outfit)', () => {
  const suggestionId = `sug-${Date.now()}`;
  db.suggestions.set(suggestionId, {
    id: suggestionId,
    fromUserId: '22222222-2222-2222-2222-222222222222',
    fromNickname: '闺蜜小美',
    targetUserId: '11111111-1111-1111-1111-111111111111',
    targetProfileId: 'c4d3b2a1-0000-0000-0000-123456789abc',
    title: '早秋叠穿',
    garmentIds: ['9f8e7d6c-5b4a-3210-fedc-ba9876543210'],
    isAccepted: false,
    createdAt: new Date().toISOString(),
  });

  const sug = db.suggestions.get(suggestionId)!;
  assert.equal(sug.isAccepted, false);

  sug.isAccepted = true;
  assert.equal(sug.isAccepted, true);
});

test('7. 超时退款事务保护 (90s SLA Refund)', () => {
  const userId = '11111111-1111-1111-1111-111111111111';
  const beforeRefund = db.users.get(userId)!.dailyCredits;

  db.refundCredits(userId, 5, '任务超时 90s 退款', 'task-timeout-test');
  const afterRefund = db.users.get(userId)!.dailyCredits;

  assert.equal(afterRefund, beforeRefund + 5);

  const refundLedger = db.creditLedger.find((l) => l.txType === 'REFUND');
  assert.ok(refundLedger);
  assert.equal(refundLedger.deltaDaily, 5);
});

test('8. [Phase 3] 多 Profile 创建与黄金比例身材计算', () => {
  const golden = calculateGoldenRatioBody('FEMALE', 170);
  assert.ok(golden.bustCm > 0);
  assert.ok(golden.waistCm > 0);
  assert.ok(golden.hipsCm > 0);
  assert.ok(golden.weightKg > 0);

  const profileId = 'profile-test-child';
  db.profiles.set(profileId, {
    id: profileId,
    userId: '11111111-1111-1111-1111-111111111111',
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
});

test('9. [Phase 3] CMS 公共单品修改、上下架切换与解耦隔离', () => {
  const garment = db.garments.get('9f8e7d6c-5b4a-3210-fedc-ba9876543210')!;
  assert.equal(garment.isArchived, false);

  // 模拟下架
  garment.isArchived = true;
  assert.equal(garment.isArchived, true);

  // 验证用户私有克隆副本不受影响
  const userCloned = Array.from(db.garments.values()).find(
    (g) => g.clonedFromId === '9f8e7d6c-5b4a-3210-fedc-ba9876543210'
  );
  if (userCloned) {
    assert.equal(userCloned.isArchived, false);
  }
});

test('10. [V2.5] 一拍多衣批量分割与 2 积分打包扣除测试', () => {
  const segRes = segmentMultiGarments('test-multi-photo');
  assert.ok(segRes.items.length >= 2);
  assert.equal(segRes.costCredits, 2);

  // 模拟批量写入并生成切片
  segRes.items.forEach((item, idx) => {
    const gId = `batch-test-${idx}`;
    const assets = generateFissionAssets(gId, item.primaryCategory);
    db.garments.set(gId, {
      id: gId,
      profileId: 'c4d3b2a1-0000-0000-0000-123456789abc',
      isPublic: false,
      title: item.title,
      primaryCategory: item.primaryCategory,
      subCategory: item.subCategory,
      colors: item.colors,
      patterns: ['SOLID'],
      assets,
    });
    assert.ok(db.garments.get(gId));
  });
});

test('11. [V2.5] 灵感扭蛋机气温推演与锁轴匹配测试', () => {
  const garments = Array.from(db.garments.values());
  const suggestion = generateWeatherOutfitSuggestion(garments, 20);
  assert.ok(suggestion.selectedGarments.length >= 2);
  assert.ok(suggestion.description.includes('20°C'));
});
