// ==UserScript==
// @name         Google Labs Flow 360° 自动化助手
// @namespace    http://smart-wardrobe.local/
// @version      1.2.0
// @description  与智能衣橱本地服务端联动，专为 flow.google.com 打造的 360° 视频生成与物理闭环自愈重试助手
// @author       SmartWardrobe
// @match        https://flow.google.com/*
// @match        https://*.flow.google.com/*
// @match        https://labs.google/*
// @match        https://*.labs.google/*
// @match        https://*.google.com/*
// @connect      localhost
// @connect      127.0.0.1
// @grant        GM_xmlhttpRequest
// @noframes
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  // 严格守卫：只在顶级主窗口中运行，严禁注入到隐藏 iframe (如 reCAPTCHA)
  if (window.top !== window.self) {
    return;
  }

  console.log('%c[SmartWardrobe Flow 助手 v1.3.0]%c 注入 flow.google.com 主窗口成功！', 'background:#eab308;color:#000;font-weight:bold;padding:3px 8px;border-radius:4px;', '');

  const POLL_URL = 'http://localhost:3001/v1/flow/poll';
  const UPLOAD_URL = 'http://localhost:3001/v1/flow/upload-video';
  const WS_URL = 'ws://localhost:3001/v1/ws/flow-bridge';

  let currentTask = null;
  let keepAliveAudio = null;
  let isConnected = false;
  let lastHandledTaskId = '';
  let badgeEl = null;

  // 1. 创建右下角高定磨砂徽标 (动态单例 + 保证永远排在 DOM 树最末端置顶)
  function ensureBadge() {
    const targetParent = document.body || document.documentElement;
    if (!targetParent) return;

    let badge = document.getElementById('smart-wardrobe-flow-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'smart-wardrobe-flow-badge';
      badge.style.cssText = `
        position: fixed !important;
        bottom: 30px !important;
        right: 30px !important;
        z-index: 2147483647 !important;
        display: flex !important;
        align-items: center !important;
        gap: 10px !important;
        padding: 10px 18px !important;
        background: rgba(18, 18, 18, 0.94) !important;
        backdrop-filter: blur(16px) !important;
        -webkit-backdrop-filter: blur(16px) !important;
        border: 1.5px solid rgba(234, 179, 8, 0.6) !important;
        border-radius: 9999px !important;
        color: #ffffff !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        font-size: 13px !important;
        font-weight: 700 !important;
        letter-spacing: 0.3px !important;
        box-shadow: 0 10px 35px rgba(0, 0, 0, 0.7), 0 0 18px rgba(234, 179, 8, 0.3) !important;
        cursor: pointer !important;
        user-select: none !important;
        pointer-events: auto !important;
        opacity: 1 !important;
        visibility: visible !important;
      `;
      badge.innerHTML = `
        <span id="sw-status-dot" style="width:10px;height:10px;border-radius:50%;background:#eab308;display:inline-block;box-shadow:0 0 12px #eab308;transition:all 0.3s ease;"></span>
        <span id="sw-status-text" style="color:#ffffff !important;">360° 助手已启动 (连接中...)</span>
      `;
      badge.addEventListener('click', () => {
        alert(`【智能衣橱 360° 自动化助手 v1.3.0】\n\n项目地址: ${location.href}\n连接状态: ${isConnected ? '🟢 已成功连接本地服务端 (3001)' : '🟡 正在探测本地服务...'}\n\n助手正实时监听来自智能衣橱的 360° 视频生成与 5 重物理闭环质检重试指令。`);
      });
      targetParent.appendChild(badge);
    } else {
      if (badge.parentElement !== targetParent || targetParent.lastElementChild !== badge) {
        targetParent.appendChild(badge);
      }
    }
  }

  function updateStatus(status, text, color) {
    ensureBadge();
    const dot = document.getElementById('sw-status-dot');
    const label = document.getElementById('sw-status-text');
    if (dot) {
      dot.style.background = color;
      dot.style.boxShadow = `0 0 12px ${color}`;
    }
    if (label) {
      label.innerText = text;
    }
  }

  // 2. MutationObserver 秒级守护：一旦被移出立即自动插回
  const observer = new MutationObserver(() => {
    ensureBadge();
  });
  if (document.documentElement) {
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  // 双保险定时器
  setInterval(ensureBadge, 1500);
  ensureBadge();

  // 3. 页面后台防休眠静音保活 (Web Audio API)
  function initKeepAlive() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      keepAliveAudio = ctx;
      console.log('🔊 [SmartWardrobe] 后台静音保活已激活，切换标签页绝不降频休眠');
    } catch (e) {}
  }
  window.addEventListener('click', () => {
    if (!keepAliveAudio) initKeepAlive();
  }, { once: true });

  // 4. GM_xmlhttpRequest 跨域发送 (无视 Google Flow 任何 CSP 限制)
  function gmRequest(options) {
    return new Promise((resolve, reject) => {
      if (typeof GM_xmlhttpRequest !== 'undefined') {
        GM_xmlhttpRequest({
          ...options,
          onload: (res) => resolve(res),
          onerror: (err) => reject(err),
          ontimeout: () => reject(new Error('请求超时')),
        });
      } else {
        fetch(options.url, {
          method: options.method || 'GET',
          headers: options.headers,
          body: options.data,
        })
          .then(async (r) => ({
            status: r.status,
            responseText: await r.text(),
          }))
          .then(resolve)
          .catch(reject);
      }
    });
  }

  // 5. 双通道通信：GM_xmlhttpRequest 轮询通道 (每 1.5 秒心跳保活并拉取任务)
  async function pollLoop() {
    try {
      const res = await gmRequest({
        method: 'POST',
        url: POLL_URL,
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({
          url: location.href,
          lastHandledTaskId,
          timestamp: Date.now(),
        }),
        timeout: 4000,
      });

      if (res.status === 200) {
        if (!isConnected) {
          isConnected = true;
          console.log('✅ [SmartWardrobe] 成功连通本地服务端 (HTTP 穿透通道)');
        }
        const data = JSON.parse(res.responseText);
        if (!currentTask) {
          updateStatus('READY', '360° 助手已连通 (待命就绪)', '#10b981');
        }

        if (data.command && data.command.taskId !== lastHandledTaskId) {
          handleServerCommand(data.command);
        }
      } else {
        isConnected = false;
        updateStatus('DISCONNECTED', '本地服务异常 (' + res.status + ')', '#ef4444');
      }
    } catch (err) {
      isConnected = false;
      updateStatus('CONNECTING', '连接本地 3001 服务中...', '#eab308');
    }

    setTimeout(pollLoop, 1500);
  }

  // 6. 尝试建立 WebSocket 通道
  function tryWebSocket() {
    try {
      const ws = new WebSocket(WS_URL);
      ws.onopen = () => {
        console.log('🚀 [SmartWardrobe] WebSocket 双工通道成功建立！');
        isConnected = true;
        updateStatus('CONNECTED', '360° 助手已就绪 (WS直连)', '#10b981');
      };
      ws.onmessage = (event) => {
        try {
          const cmd = JSON.parse(event.data);
          handleServerCommand(cmd);
        } catch (e) {}
      };
    } catch (e) {}
  }

  // 7. 处理服务端下发的生成与自愈重试指令
  async function handleServerCommand(cmd) {
    if (!cmd || !cmd.taskId) return;
    lastHandledTaskId = cmd.taskId;
    currentTask = cmd;

    console.log('📩 [SmartWardrobe] 收到执行指令:', cmd);

    if (cmd.type === 'DISPATCH_GENERATION') {
      updateStatus('GENERATING', `第 ${cmd.attempt || 1} 次生成自动执行中...`, '#3b82f6');
      await executeGeneration(cmd.prompt, cmd.taskId);
    } else if (cmd.type === 'RETRY_GENERATION') {
      updateStatus('RETRYING', `🚨 未闭环: 自动第 ${cmd.attempt} 次重试中...`, '#f97316');
      console.warn(`[SmartWardrobe] 质检拦截原因: ${cmd.rejectReason}，正在自动重新点击生成...`);
      await executeGeneration(cmd.prompt, cmd.taskId);
    } else if (cmd.type === 'TASK_COMPLETED') {
      updateStatus('SUCCESS', '🎉 360° 展台切片已交付！', '#10b981');
      currentTask = null;
    }
  }

  // 8. 自动填入提示词并点击生成 (适配 Flow 的节点与输入框)
  async function executeGeneration(promptText, taskId) {
    let inputEl = document.querySelector('textarea') ||
                  document.querySelector('div[contenteditable="true"]') ||
                  document.querySelector('input[type="text"]');

    if (!inputEl) {
      console.warn('正在等待页面输入框渲染...');
      await new Promise(r => setTimeout(r, 1500));
      inputEl = document.querySelector('textarea') || document.querySelector('div[contenteditable="true"]');
    }

    if (!inputEl) {
      reportError(taskId, '页面上未找到有效的提示词输入框');
      return;
    }

    inputEl.focus();
    if (inputEl.tagName.toLowerCase() === 'textarea' || inputEl.tagName.toLowerCase() === 'input') {
      inputEl.value = promptText;
      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      inputEl.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      inputEl.innerText = promptText;
      inputEl.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: promptText }));
    }

    await new Promise(r => setTimeout(r, 600));

    const buttons = Array.from(document.querySelectorAll('button'));
    const submitBtn = buttons.find(b => {
      const txt = (b.innerText || b.getAttribute('aria-label') || '').toLowerCase();
      return txt.includes('generate') || txt.includes('create') || txt.includes('run') || txt.includes('生成') || txt.includes('发送');
    }) || buttons.find(b => b.querySelector('svg') && !b.disabled);

    if (submitBtn) {
      submitBtn.click();
      console.log('🔘 [SmartWardrobe] 已自动点击生成按钮');
      listenForVideoCompletion(taskId);
    } else {
      inputEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
      listenForVideoCompletion(taskId);
    }
  }

  // 9. 监听生成的视频出现并回传
  function listenForVideoCompletion(taskId) {
    const startTime = Date.now();
    let handled = false;

    const interval = setInterval(async () => {
      if (handled) return;

      const videos = Array.from(document.querySelectorAll('video'));
      for (const v of videos) {
        if (v.src && (v.duration > 2 || v.readyState >= 2)) {
          handled = true;
          clearInterval(interval);
          console.log(`🎥 [SmartWardrobe] 捕获到视频 (${v.src})，开始拉取二进制流...`);
          updateStatus('DOWNLOADING', '正在回传视频至 5 重质检门禁...', '#8b5cf6');
          await downloadAndUploadVideo(v.src, taskId);
          break;
        }
      }

      if (Date.now() - startTime > 300000) {
        clearInterval(interval);
        reportError(taskId, '视频生成超时 (5分钟未检测到成片)');
      }
    }, 1500);
  }

  // 10. 抓取 Blob 并推回本地服务端 (使用 GM_xmlhttpRequest 避免跨域阻断)
  async function downloadAndUploadVideo(videoUrl, taskId) {
    try {
      const blobResp = await fetch(videoUrl);
      const arrayBuffer = await blobResp.arrayBuffer();

      console.log(`📤 [SmartWardrobe] 正在上传视频至本地 (${(arrayBuffer.byteLength / 1024 / 1024).toFixed(2)} MB)...`);

      if (typeof GM_xmlhttpRequest !== 'undefined') {
        GM_xmlhttpRequest({
          method: 'POST',
          url: `${UPLOAD_URL}?taskId=${encodeURIComponent(taskId)}`,
          headers: { 'Content-Type': 'application/octet-stream' },
          data: arrayBuffer,
          binary: true,
          onload: (res) => {
            console.log('✅ [SmartWardrobe] 视频已成功交接给本地 5 重质检门禁:', res.responseText);
          },
          onerror: (err) => {
            reportError(taskId, `回传视频失败: ${err.error || '网络错误'}`);
          }
        });
      } else {
        await fetch(`${UPLOAD_URL}?taskId=${encodeURIComponent(taskId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: arrayBuffer,
        });
      }
    } catch (err) {
      console.error('上传视频发生异常:', err);
      reportError(taskId, `回传视频失败: ${err.message}`);
    }
  }

  function reportError(taskId, errorMsg) {
    updateStatus('ERROR', `错误: ${errorMsg}`, '#ef4444');
  }

  // 立即执行并挂载
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureBadge);
  } else {
    ensureBadge();
  }

  pollLoop();
  tryWebSocket();
})();
