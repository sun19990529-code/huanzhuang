const fetch = globalThis.fetch;

async function testSingleImage() {
  const AI_BASE_URL = 'http://127.0.0.1:48045/v1';
  const AI_API_KEY = 'sk-62702cd208dc42b09fddaf43b3731d23';

  // 读取现有的标准模特 base64
  const generatedAssets = require('../server/dist/generatedAssets.js');
  const avatarUrl = generatedAssets.GENERATED_ASSETS.avatarUrl;

  console.log('--- 测试: 发送 1 张单图 (模特底图) + 提示词 ---');
  const prompt = `A studio fashion photograph of this 20-year-old Chinese female model wearing an elegant crimson translucent ancient Chinese robe (红色薄纱古风开衫缝袍) with intricate gold dragon embroidery. Full body shot, 3:4 vertical aspect ratio, Hasselblad photography, solid studio backdrop.`;

  const payload = {
    model: 'gemini-3.1-flash-image',
    size: '896x1216',
    extra_body: { size: '896x1216' },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: avatarUrl } }
        ]
      }
    ]
  };

  const start = Date.now();
  const res = await fetch(`${AI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AI_API_KEY}`
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`耗时: ${elapsed}s, 响应状态:`, res.status);
  const choice = data.choices?.[0];
  console.log('content 长度:', choice?.message?.content?.length || 0);
  console.log('content 前 100 字符:', choice?.message?.content?.substring(0, 100));
  console.log('reasoning_content 存在:', !!choice?.message?.reasoning_content);
  console.log('finish_reason:', choice?.finish_reason);
}

testSingleImage().catch(console.error);
