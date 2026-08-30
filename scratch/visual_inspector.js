import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import WebSocket from '../server/node_modules/ws/index.js';

const ARTIFACT_DIR = 'C:\\Users\\sunqiming\\.gemini\\antigravity\\brain\\ce53a329-5182-4ee5-acae-9c6fefbd88cd';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9222;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWsUrl() {
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json`);
      const tabs = await res.json();
      if (tabs && tabs.length > 0 && tabs[0].webSocketDebuggerUrl) {
        return tabs[0].webSocketDebuggerUrl;
      }
    } catch (e) {}
    await sleep(500);
  }
  throw new Error('无法连接到 Chrome CDP 调试端口');
}

async function main() {
  console.log('🚀 启动无头 Chrome 实例进行深度视觉体验走查...');
  const chromeProcess = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--disable-gpu',
      `--remote-debugging-port=${PORT}`,
      '--window-size=1440,900',
      'http://localhost:5173',
    ],
    { stdio: 'ignore' }
  );

  await sleep(2000);
  const wsUrl = await fetchWsUrl();
  console.log('✅ 已连接 Chrome CDP 调试流:', wsUrl);

  const ws = new WebSocket(wsUrl);
  let msgId = 1;
  const callbacks = new Map();

  ws.on('message', (data) => {
    const res = JSON.parse(data.toString());
    if (res.id && callbacks.has(res.id)) {
      callbacks.get(res.id)(res);
      callbacks.delete(res.id);
    }
  });

  const send = (method, params = {}) => {
    const id = msgId++;
    return new Promise((resolve) => {
      callbacks.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  };

  await new Promise((r) => ws.on('open', r));

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 2,
    mobile: false,
  });

  console.log('⏳ 等待页面初始数据加载与渲染...');
  await sleep(2500);

  const takeScreenshot = async (filename, label) => {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(res.result.data, 'base64');
    const filePath = path.join(ARTIFACT_DIR, filename);
    fs.writeFileSync(filePath, buf);
    console.log(`📸 已捕获视觉体验快照: ${label} -> ${filename}`);
  };

  // 1. 初始空试衣间快照
  await takeScreenshot('shot_1_empty_canvas.png', '初始试衣间与微点阵网格');

  // 2. 模拟用户点击穿上一套经典搭配（西装外套 + 条纹T恤 + 牛仔裤）
  console.log('👗 体验官交互: 穿上法式廓形西装、经典条纹T恤、水洗牛仔裤...');
  await send('Runtime.evaluate', {
    expression: `
      const buttons = Array.from(document.querySelectorAll('button'));
      const wearButtons = buttons.filter(b => b.textContent.includes('穿上试衣'));
      wearButtons.slice(0, 3).forEach(b => b.click());
    `,
  });
  await sleep(1000);
  await takeScreenshot('shot_2_dressed_canvas.png', '已穿戴 3 件单品与实时 3D 图层透视');

  // 3. 体验形态切换（合拢西装）
  console.log('🧥 体验官交互: 切换外套为【合拢 (Closed)】...');
  await send('Runtime.evaluate', {
    expression: `
      const buttons = Array.from(document.querySelectorAll('button'));
      const closeBtn = buttons.find(b => b.textContent.includes('合拢'));
      if (closeBtn) closeBtn.click();
    `,
  });
  await sleep(800);
  await takeScreenshot('shot_3_closed_outerwear.png', '外套合拢与塞衣角形态联动');

  // 4. 体验 5 积分 VTON 高清试穿任务触发
  console.log('⚡ 体验官交互: 点击【一键生成 AI 高清试穿照】...');
  await send('Runtime.evaluate', {
    expression: `
      const buttons = Array.from(document.querySelectorAll('button'));
      const vtonBtn = buttons.find(b => b.textContent.includes('生成 AI 高清试穿照'));
      if (vtonBtn) vtonBtn.click();
    `,
  });
  await sleep(1200);
  await takeScreenshot('shot_4_vton_scanning.png', 'Diffusion VTON 激光扫描与阶段流光进度');

  // 等待试穿生成完成 (约 5 秒)
  await sleep(5500);
  await takeScreenshot('shot_5_vton_completed_slider.png', '试穿完成与 Before/After 左右滑动对比器');

  // 5. 打开 Lookbook & OOTD 日历弹窗
  console.log('📅 体验官交互: 打开 OOTD 穿搭日历与 Lookbook 搭配库...');
  await send('Runtime.evaluate', {
    expression: `
      const buttons = Array.from(document.querySelectorAll('button'));
      const ootdBtn = buttons.find(b => b.textContent.includes('OOTD 穿搭日历'));
      if (ootdBtn) ootdBtn.click();
    `,
  });
  await sleep(1000);
  await takeScreenshot('shot_6_ootd_modal.png', 'OOTD 14天月历打卡与天气胶囊');

  // 关闭弹窗并打开好友借穿
  console.log('👥 体验官交互: 打开好友借穿与穿搭建议推送中心...');
  await send('Runtime.evaluate', {
    expression: `
      const buttons = Array.from(document.querySelectorAll('button'));
      const friendBtn = buttons.find(b => b.textContent.includes('好友借穿'));
      if (friendBtn) friendBtn.click();
    `,
  });
  await sleep(1000);
  await takeScreenshot('shot_7_friend_social_modal.png', '好友借穿工作台与穿搭建议采纳');

  // 打开公共衣柜 CMS
  console.log('🛍️ 体验官交互: 打开公共衣柜 CMS 运营后台...');
  await send('Runtime.evaluate', {
    expression: `
      const buttons = Array.from(document.querySelectorAll('button'));
      const adminBtn = buttons.find(b => b.textContent.includes('公共衣柜 CMS'));
      if (adminBtn) adminBtn.click();
    `,
  });
  await sleep(1000);
  await takeScreenshot('shot_8_cms_modal.png', '官方公共衣柜 CMS 运营与电商外链工作台');

  ws.close();
  chromeProcess.kill();
  console.log('🎉 视觉体验走查与 8 张全景高清截图捕获完成！');
}

main().catch(console.error);
