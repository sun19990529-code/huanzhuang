import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import test from 'node:test';
import assert from 'node:assert/strict';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVER_BASE = 'http://localhost:3001';
const UNDERSHOOT_VIDEO = path.resolve(__dirname, '../../web/public/experiments/orbit_undershoot_test.mp4');
const PERFECT_VIDEO = path.resolve(__dirname, '../../web/public/experiments/orbit_perfect_180.mp4');

test('Google Labs Flow 网页助手与 5 重质检自愈重试全链路端到端验收 (E2E Pipeline Test)', async (t) => {
  assert.ok(fs.existsSync(UNDERSHOOT_VIDEO), '测试样本 orbit_undershoot_test.mp4 必须存在');
  assert.ok(fs.existsSync(PERFECT_VIDEO), '测试样本 orbit_perfect_180.mp4 必须存在');

  let currentTaskId = '';

  await t.test('1. 网页助手心跳保活与状态连通性验证', async () => {
    const pollResp = await fetch(`${SERVER_BASE}/v1/flow/poll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://flow.google.com/project/test', timestamp: Date.now() }),
    });
    assert.equal(pollResp.status, 200, '轮询接口必须正常响应 200');

    const statusResp = await fetch(`${SERVER_BASE}/v1/flow/status`);
    const statusJson = await statusResp.json();
    assert.equal(statusJson.code, 200);
    assert.equal(statusJson.isHelperConnected, true, '助手应当被服务端识别为已在线');
  });

  await t.test('2. 业务发起 360° 生成任务并由助手成功认领', async () => {
    const dispatchResp = await fetch(`${SERVER_BASE}/v1/flow/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Camera orbiting frozen subject, 360 degree studio rotation, overshoot by 1.25 circles, ultra-smooth',
        maxRetries: 3,
      }),
    });
    const dispatchJson = await dispatchResp.json();
    assert.equal(dispatchJson.code, 200);
    assert.ok(dispatchJson.taskId, '应返回有效 taskId');
    currentTaskId = dispatchJson.taskId;

    // 模拟助手通过 /v1/flow/poll 拉取待执行任务
    const pollResp = await fetch(`${SERVER_BASE}/v1/flow/poll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://flow.google.com/project/test' }),
    });
    const pollJson = await pollResp.json();
    assert.ok(pollJson.command, '助手应收到服务端派发的任务指令');
    assert.equal(pollJson.command.type, 'DISPATCH_GENERATION');
    assert.equal(pollJson.command.taskId, currentTaskId);
    assert.equal(pollJson.command.attempt, 1);
  });

  await t.test('3. 第 1 次生成注入欠转缺角视频 -> 触发 5 重质检拦截与自动重试', async () => {
    // 模拟助手上传有缺陷的半圈视频 (只有 180°，欠转缺角)
    const badVideoBuffer = fs.readFileSync(UNDERSHOOT_VIDEO);
    const uploadResp = await fetch(`${SERVER_BASE}/v1/flow/upload-video?taskId=${encodeURIComponent(currentTaskId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: badVideoBuffer,
    });
    const uploadJson = await uploadResp.json();
    assert.equal(uploadJson.code, 200);

    // 等待服务端后台执行 FFmpeg 抽帧与 5 重质检门禁
    console.log('⏳ 正在等待服务端执行 5 重硬核质检门禁...');
    await new Promise(r => setTimeout(r, 4500));

    // 模拟助手下一次轮询，验证是否收到 RETRY 指令
    const pollResp = await fetch(`${SERVER_BASE}/v1/flow/poll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://flow.google.com/project/test' }),
    });
    const pollJson = await pollResp.json();
    assert.ok(pollJson.command, '质检不合格时，助手必须收到指令');
    assert.equal(pollJson.command.type, 'RETRY_GENERATION', '必须触发 RETRY_GENERATION 自动重试！');
    assert.equal(pollJson.command.attempt, 2, '重试次数必须自增为 2');
    assert.ok(pollJson.command.rejectReason.includes('未达到 358°'), '质检原因必须准确指出未达 358° 物理闭环标准');
    console.log(`✅ [自愈验证成功] 服务端坚决拦截瑕疵视频，并下发重试指令: ${pollJson.command.rejectReason}`);
  });

  await t.test('4. 第 2 次生成注入完美 360° 视频 -> 质检通过并自动完成 180 帧等角切片交付', async () => {
    // 模拟助手响应重试，上传完美闭环视频
    const goodVideoBuffer = fs.readFileSync(PERFECT_VIDEO);
    const uploadResp = await fetch(`${SERVER_BASE}/v1/flow/upload-video?taskId=${encodeURIComponent(currentTaskId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: goodVideoBuffer,
    });
    const uploadJson = await uploadResp.json();
    assert.equal(uploadJson.code, 200);

    // 等待服务端执行抽帧、质检通过、精准 360° 截断与 180 帧等角重采样
    console.log('⏳ 正在等待服务端执行 180 帧等角物理重采样...');
    await new Promise(r => setTimeout(r, 7000));

    // 检查最终任务状态
    const statusResp = await fetch(`${SERVER_BASE}/v1/flow/status`);
    const statusJson = await statusResp.json();
    const task = statusJson.activeTasks.find((t: any) => t.taskId === currentTaskId);
    assert.ok(task, '任务必须存在');
    assert.equal(task.status, 'SUCCESS', '全流程最终状态必须为 SUCCESS！');
    assert.equal(task.history.length, 2, '历史记录必须包含完整的 2 次尝试 (第1次被拒，第2次通过)');
    assert.equal(task.history[0].gateResult.passed, false, '第 1 次质检记录必须为失败');
    assert.equal(task.history[1].gateResult.passed, true, '第 2 次质检记录必须为通过');

    // 验证输出切片资产完整性
    const outputDir = path.resolve(__dirname, '../../web/public/experiments/frames_v4_180fps');
    const frames = fs.readdirSync(outputDir).filter(f => f.endsWith('.jpg'));
    assert.equal(frames.length, 180, '输出切片必须严格为 180 帧！');
    console.log(`🎉 [全流程验证成功] 任务完成！最终输出: ${frames.length} 帧标准等角切片`);
  });
});
