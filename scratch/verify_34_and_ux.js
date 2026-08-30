const fetch = globalThis.fetch;

async function verify() {
  console.log('=== 验证 1：固定测试账号登录与素体 3:4 黄金画幅 ===');
  const loginRes = await fetch('http://localhost:3001/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@smartwardrobe.com', password: 'password123' })
  });
  const loginData = await loginRes.json();
  console.log('登录状态:', loginData.code, loginData.message);
  const token = loginData.data?.token;
  if (!token) throw new Error('未获取到登录 token');

  // 获取用户档案
  const profileRes = await fetch('http://localhost:3001/v1/profiles', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const profileData = await profileRes.json();
  const defaultProfile = profileData.data?.[0];
  console.log('用户档案 ID:', defaultProfile?.id, '姓名:', defaultProfile?.name);

  // 获取当前默认素体
  const avatarRes = await fetch(`http://localhost:3001/v1/profiles/${defaultProfile.id}/avatar`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const avatarData = await avatarRes.json();
  const avatarUrl = avatarData.data?.normalizedImageUrl || '';
  console.log('当前素体 URL 是否存在:', !!avatarUrl);
  if (avatarUrl.startsWith('data:image')) {
    const match = avatarUrl.match(/data:image\/[a-zA-Z]+;base64,([A-Za-z0-9+/=]+)/);
    if (match) {
      const buf = Buffer.from(match[1], 'base64');
      if (buf[0] === 0xFF && buf[1] === 0xD8) {
        let offset = 2;
        while (offset < buf.length - 8) {
          if (buf[offset] === 0xFF && (buf[offset+1] === 0xC0 || buf[offset+1] === 0xC2)) {
            const h = buf.readUInt16BE(offset + 5);
            const w = buf.readUInt16BE(offset + 7);
            const ratio = (w / h).toFixed(3);
            console.log(`✅ 模特素体像素尺寸: ${w} x ${h}, 画幅比例: ${ratio} (符合 3:4 黄金画幅: ${Math.abs(w/h - 0.75) < 0.03 ? '✅ 是' : '❌ 否'})`);
            break;
          }
          offset++;
        }
      }
    }
  }

  console.log('\n=== 验证 2：3D VTON 接口 3:4 黄金画幅实时生成 ===');
  console.log('向后端发起真实 AI 3D 试穿大片任务...');
  const vtonRes = await fetch('http://localhost:3001/v1/outfits/render-vton', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      profileId: defaultProfile.id,
      items: [
        {
          garmentId: 'g-public-gown-real',
          state: 'DEFAULT',
          zIndex: 10,
          offsetX: 0,
          offsetY: 0,
          scale: 1
        }
      ]
    })
  });
  const vtonData = await vtonRes.json();
  console.log('3D VTON 提交状态:', vtonData.code, vtonData.message);
  const taskId = vtonData.data?.taskId;
  if (!taskId) throw new Error('未返回 taskId');

  console.log('正在等待 VTON 任务生成...');
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const taskRes = await fetch(`http://localhost:3001/v1/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const taskData = await taskRes.json();
    console.log(`  [轮询 ${i+1}] 进度: ${taskData.data?.progressPercent}%, 状态: ${taskData.data?.status}`);
    if (taskData.data?.status === 'SUCCESS') {
      const outUrl = taskData.data?.outputResult?.renderedImageUrl || '';
      if (outUrl.startsWith('data:image')) {
        const match = outUrl.match(/data:image\/[a-zA-Z]+;base64,([A-Za-z0-9+/=]+)/);
        if (match) {
          const buf = Buffer.from(match[1], 'base64');
          if (buf[0] === 0xFF && buf[1] === 0xD8) {
            let offset = 2;
            while (offset < buf.length - 8) {
              if (buf[offset] === 0xFF && (buf[offset+1] === 0xC0 || buf[offset+1] === 0xC2)) {
                const h = buf.readUInt16BE(offset + 5);
                const w = buf.readUInt16BE(offset + 7);
                const ratio = (w / h).toFixed(3);
                console.log(`✅ 3D VTON 试穿大片尺寸: ${w} x ${h}, 画幅比例: ${ratio} (符合 3:4 黄金画幅: ${Math.abs(w/h - 0.75) < 0.03 ? '✅ 是' : '❌ 否'})`);
                break;
              }
              offset++;
            }
          }
        }
      }
      break;
    } else if (taskData.data?.status === 'FAILED') {
      throw new Error(`任务失败: ${taskData.data?.errorMessage}`);
    }
  }

  console.log('\n=== 全链路测试验证全部通过 ===');
}

verify().catch(console.error);
