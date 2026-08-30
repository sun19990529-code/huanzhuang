import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import WebSocket from '../server/node_modules/ws/index.js';

const ARTIFACT_DIR = 'C:\\Users\\sunqiming\\.gemini\\antigravity\\brain\\ce53a329-5182-4ee5-acae-9c6fefbd88cd';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9333;

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
    await sleep(400);
  }
  throw new Error('无法连接 CDP 端口');
}

async function main() {
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

  await sleep(1500);
  const wsUrl = await fetchWsUrl();
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
  await sleep(2000);

  const capture = async (filename) => {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(res.result.data, 'base64');
    fs.writeFileSync(path.join(ARTIFACT_DIR, filename), buf);
    fs.writeFileSync(path.join('d:\\项目\\换装', filename), buf);
    console.log(`📸 截图保存成功: ${filename}`);
  };

  // 1. 衣橱大厅 (Wardrobe)
  await capture('view_wardrobe.png');

  // 2. 模拟点击穿上一套搭配（西装、T恤、牛仔裤、板鞋、帽子）
  await send('Runtime.evaluate', {
    expression: `
      const buttons = Array.from(document.querySelectorAll('button'));
      const wearButtons = buttons.filter(b => b.textContent.includes('穿上试衣'));
      wearButtons.forEach(b => b.click());
    `,
  });
  await sleep(500);

  // 3. 切换到试衣间 (Studio)
  await send('Runtime.evaluate', {
    expression: `
      const tabs = Array.from(document.querySelectorAll('nav button'));
      const studioTab = tabs.find(t => t.textContent.includes('试衣间'));
      if (studioTab) studioTab.click();
    `,
  });
  await sleep(1000);
  await capture('view_studio.png');

  // 4. 切换到 OOTD 穿搭日历与海报工坊 (OOTD)
  await send('Runtime.evaluate', {
    expression: `
      const tabs = Array.from(document.querySelectorAll('nav button'));
      const ootdTab = tabs.find(t => t.textContent.includes('OOTD'));
      if (ootdTab) ootdTab.click();
    `,
  });
  await sleep(1000);
  await capture('view_ootd.png');

  // 5. 切换到 闺蜜借穿广场 (Friends)
  await send('Runtime.evaluate', {
    expression: `
      const tabs = Array.from(document.querySelectorAll('nav button'));
      const friendTab = tabs.find(t => t.textContent.includes('闺蜜借穿'));
      if (friendTab) friendTab.click();
    `,
  });
  await sleep(1000);
  await capture('view_friends.png');

  // 6. 切换到 官方 CMS (CMS)
  await send('Runtime.evaluate', {
    expression: `
      const tabs = Array.from(document.querySelectorAll('nav button'));
      const cmsTab = tabs.find(t => t.textContent.includes('官方 CMS'));
      if (cmsTab) cmsTab.click();
    `,
  });
  await sleep(1000);
  await capture('view_cms.png');

  ws.close();
  chromeProcess.kill();
  console.log('🎉 6 大独立页面全景截图捕获完成！');
}

main().catch(console.error);
