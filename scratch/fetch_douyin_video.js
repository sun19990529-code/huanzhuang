import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import WebSocket from '../server/node_modules/ws/index.js';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9444;

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
  throw new Error('无法连接 CDP');
}

async function inspectUrl(url, screenshotName) {
  console.log(`🔍 正在打开并解析: ${url}`);
  const chromeProcess = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--disable-gpu',
      `--remote-debugging-port=${PORT}`,
      '--window-size=1280,800',
      '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      url,
    ],
    { stdio: 'ignore' }
  );

  await sleep(4000);
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
  await sleep(3000);

  // 提取页面所有文本、标题和描述
  const evalRes = await send('Runtime.evaluate', {
    expression: `
      ({
        title: document.title,
        h1: Array.from(document.querySelectorAll('h1')).map(h => h.innerText),
        descriptions: Array.from(document.querySelectorAll('[class*="desc"], [class*="title"], [class*="text"], span, p'))
          .map(e => e.innerText.trim())
          .filter(t => t.length > 5 && t.length < 300)
          .slice(0, 50)
      })
    `,
    returnByValue: true,
  });

  console.log('--- 页面元数据 ---');
  console.log('Title:', evalRes.result?.value?.title);
  console.log('Descriptions:', evalRes.result?.value?.descriptions?.slice(0, 15));

  // 截图
  const shotRes = await send('Page.captureScreenshot', { format: 'png' });
  if (shotRes?.result?.data) {
    const buf = Buffer.from(shotRes.result.data, 'base64');
    fs.writeFileSync(path.join('d:\\项目\\换装', screenshotName), buf);
    console.log(`📸 已保存截图: ${screenshotName}`);
  }

  ws.close();
  chromeProcess.kill();
}

async function main() {
  const url1 = 'https://www.douyin.com/search/woo%E8%A1%A3%E6%A9%B1?aid=3e3b56d4-2056-4065-b590-53420fae7c08&modal_id=7663795599515088357&type=general';
  const url2 = 'https://www.douyin.com/search/woo%E8%A1%A3%E6%A9%B1?aid=3e3b56d4-2056-4065-b590-53420fae7c08&modal_id=7676462011556278938&type=general';

  await inspectUrl(url1, 'douyin_video_1.png');
  await sleep(2000);
  await inspectUrl(url2, 'douyin_video_2.png');
}

main().catch(console.error);
