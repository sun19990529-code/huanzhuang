const fetch = globalThis.fetch;

async function testVtonRobust() {
  const AI_BASE_URL = 'http://127.0.0.1:48045/v1';
  const AI_API_KEY = 'sk-62702cd208dc42b09fddaf43b3731d23';

  // 读取现有生成的 3:4 模特
  const generatedAssets = require('../server/dist/generatedAssets.js');
  const avatarUrl = generatedAssets.GENERATED_ASSETS.avatarUrl;

  console.log('--- 测试: 优化后的 3D VTON 调用方案 ---');
  const prompt = `[CRITICAL MANDATE: 8K COMMERCIAL FASHION STUDIO PHOTOGRAPH & VTON]
A high-end editorial commercial fashion studio photograph of a 20-year-old East Asian female model (natural makeup, elegant hair bun) wearing an exquisite crimson translucent ancient Chinese robe (红色雅致薄纱古风开衫缝袍) with intricate gold dragon embroidery on the lapels and flowing sheer sleeves, worn over silk undergarments.
- Full length 3:4 vertical shot from head to toe.
- Standing gracefully in a clean minimalist photography studio, soft diffuse 3-point lighting.
- Hasselblad 35mm lens, realistic silk cloth drapery and natural shadows.
- Absolutely NO cropped feet, NO cartoon, NO low quality.`;

  // 1 张高质量模特图作为 reference
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
  console.log(`耗时: ${elapsed}s, 状态:`, res.status);
  const choice = data.choices?.[0];
  const content = choice?.message?.content || '';
  console.log('content 长度:', content.length);
  if (content.length > 0) {
    console.log('✅ 成功返回大片图像！前 80 字符:', content.substring(0, 80));
  } else {
    console.log('⚠️ content 为空，检查 reasoning_content:', choice?.message?.reasoning_content?.substring(0, 200));
  }
}

testVtonRobust().catch(console.error);
