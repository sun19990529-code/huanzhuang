// ==UserScript==
// @name         Google Labs Flow 360° 自动化助手
// @namespace    http://smart-wardrobe.local/
// @version      1.0.0
// @description  与智能衣橱本地服务端联动，自动化执行 Google Labs 视频生成、Blob回传与物理闭环自愈重试
// @author       SmartWardrobe
// @match        https://labs.google/*
// @match        https://*.google.com/*
// @grant        GM_xmlhttpRequest
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  console.log('🚀 [SmartWardrobe] Google Labs Flow 360° 自动化助手已注入！');

  const WS_URL = 'ws://localhost:3001/v1/ws/flow-bridge';
  const UPLOAD_URL = 'http://localhost:3001/v1/flow/upload-video';

  let ws = null;
  let currentTask = null;
  let keepAliveAudio = null;

  // 1. 创建右下角高定毛玻璃悬浮状态徽标
  const badge = document.createElement('div');
  badge.id = 'smart-wardrobe-flow-badge';
  badge.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 999999;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: rgba(18, 18, 18, 0.88);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 9999px;
    color: #fff;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 12px;
    font-weight: 600;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    cursor: default;
    transition: all 0.3s ease;
    user-select: none;
  `;
  badge.innerHTML = `
    <span id="sw-status-dot" style="width:8px;height:8px;border-radius:50%;background:#eab308;display:inline-block;box-shadow:0 0 8px #eab308;"></span>
    <span id="sw-status-text">连接本地服务中...</span>
  `;
  document.body.appendChild(badge);

  function updateStatus(status, text, color) {
    const dot = document.getElementById('sw-status-dot');
    const label = document.getElementById('sw-status-text');
    if (dot) {
      dot.style.background = color;
      dot.style.boxShadow = `0 0 10px ${color}`;
    }
    if (label) {
      label.innerText = text;
    }
  }

  // 2. 页面后台防休眠静音保活机制 (Web Audio API)
  function initKeepAlive() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      // 创建极微弱静音振荡器，保持音频管线常开，彻底阻止 Chrome 节流当前标签页
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      keepAliveAudio = ctx;
      console.log('🔊 [SmartWardrobe] 后台静音保活机制已启动，标签页后台不休眠');
    } catch (e) {
      console.warn('保活初始化提示:', e);
    }
  }
  document.addEventListener('click', () => {
    if (!keepAliveAudio) initKeepAlive();
  }, { once: true });

  // 3. 建立与本地服务端的 WebSocket 双向通信
  function connectWebSocket() {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      updateStatus('CONNECTED', '360° 助手就绪 (已连服务端)', '#10b981');
      console.log('✅ [SmartWardrobe] 已连接本地 FlowBridge 服务');
      // 发送就绪通知
      ws.send(JSON.stringify({ type: 'HELPER_READY', url: location.href }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleServerCommand(data);
      } catch (err) {
        console.error('指令解析异常:', err);
      }
    };

    ws.onclose = () => {
      updateStatus('DISCONNECTED', '本地服务已断开 (重连中...)', '#ef4444');
      setTimeout(connectWebSocket, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }

  // 4. 处理服务端下发的生成与自愈重试指令
  async function handleServerCommand(cmd) {
    console.log('📩 [SmartWardrobe] 收到服务端信令:', cmd);

    if (cmd.type === 'DISPATCH_GENERATION') {
      currentTask = cmd;
      updateStatus('GENERATING', `第 ${cmd.attempt || 1} 次生成执行中...`, '#3b82f6');
      await executeGeneration(cmd.prompt, cmd.taskId);
    } else if (cmd.type === 'RETRY_GENERATION') {
      currentTask = cmd;
      updateStatus('RETRYING', `🚨 未闭环: 自动第 ${cmd.attempt} 次重试中...`, '#f97316');
      console.warn(`[SmartWardrobe] 质检拦截原因: ${cmd.rejectReason}，正在自动重新点击生成...`);
      await executeGeneration(cmd.prompt, cmd.taskId);
    } else if (cmd.type === 'TASK_COMPLETED') {
      updateStatus('SUCCESS', '🎉 360° 完美闭环重采样交付成功！', '#10b981');
      currentTask = null;
    }
  }

  // 5. 模拟在 Flow 页面中输入 Prompt 并点击 Generate
  async function executeGeneration(promptText, taskId) {
    // 寻找输入框 (自适应 textarea, contenteditable, input)
    let inputEl = document.querySelector('textarea') ||
                  document.querySelector('div[contenteditable="true"]') ||
                  document.querySelector('input[type="text"]');

    if (!inputEl) {
      console.warn('未找到标准输入框，等待 1 秒再次重试...');
      await new Promise(r => setTimeout(r, 1000));
      inputEl = document.querySelector('textarea') || document.querySelector('div[contenteditable="true"]');
    }

    if (!inputEl) {
      reportError(taskId, '页面上未找到有效的提示词输入框');
      return;
    }

    // 填入提示词并分发标准事件
    inputEl.focus();
    if (inputEl.tagName.toLowerCase() === 'textarea' || inputEl.tagName.toLowerCase() === 'input') {
      inputEl.value = promptText;
      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      inputEl.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      inputEl.innerText = promptText;
      inputEl.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: promptText }));
    }

    await new Promise(r => setTimeout(r, 500));

    // 寻找生成按钮
    const buttons = Array.from(document.querySelectorAll('button'));
    const submitBtn = buttons.find(b => {
      const txt = (b.innerText || b.getAttribute('aria-label') || '').toLowerCase();
      return txt.includes('generate') || txt.includes('create') || txt.includes('run') || txt.includes('生成') || txt.includes('发送');
    }) || buttons.find(b => b.querySelector('svg') && !b.disabled);

    if (submitBtn) {
      submitBtn.click();
      console.log('🔘 [SmartWardrobe] 已自动点击生成按钮');
      // 启动视频渲染监听器
      listenForVideoCompletion(taskId);
    } else {
      // 尝试回车触发
      inputEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
      listenForVideoCompletion(taskId);
    }
  }

  // 6. 监听生成的视频出现并回传
  function listenForVideoCompletion(taskId) {
    const startTime = Date.now();
    let handled = false;

    const interval = setInterval(async () => {
      if (handled) return;

      // 寻找页面中的所有 video
      const videos = Array.from(document.querySelectorAll('video'));
      for (const v of videos) {
        if (v.src && (v.duration > 2 || v.readyState >= 2)) {
          handled = true;
          clearInterval(interval);
          console.log(`🎥 [SmartWardrobe] 捕获到生成的视频元素 (${v.src})，开始拉取二进制流...`);
          updateStatus('DOWNLOADING', '正在抓取视频并回传质检...', '#8b5cf6');
          await downloadAndUploadVideo(v.src, taskId);
          break;
        }
      }

      // 超时保护 (5分钟未渲染出结果)
      if (Date.now() - startTime > 300000) {
        clearInterval(interval);
        reportError(taskId, '视频生成超时 (5分钟未检测到成片)');
      }
    }, 1500);
  }

  // 7. 抓取 Blob 并推回本地服务端
  async function downloadAndUploadVideo(videoUrl, taskId) {
    try {
      const resp = await fetch(videoUrl);
      const arrayBuffer = await resp.arrayBuffer();

      console.log(`📤 [SmartWardrobe] 正在上传视频至本地 (${(arrayBuffer.byteLength / 1024 / 1024).toFixed(2)} MB)...`);

      const uploadResp = await fetch(`${UPLOAD_URL}?taskId=${encodeURIComponent(taskId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        body: arrayBuffer,
      });

      const resJson = await uploadResp.json();
      console.log('✅ [SmartWardrobe] 视频已成功交接给本地 5 重质检门禁:', resJson);
    } catch (err) {
      console.error('上传视频发生异常:', err);
      reportError(taskId, `回传视频失败: ${err.message}`);
    }
  }

  function reportError(taskId, errorMsg) {
    updateStatus('ERROR', `错误: ${errorMsg}`, '#ef4444');
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'GENERATION_ERROR',
        taskId,
        error: errorMsg,
      }));
    }
  }

  // 启动
  connectWebSocket();
})();
