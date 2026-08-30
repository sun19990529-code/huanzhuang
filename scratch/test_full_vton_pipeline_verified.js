const fs = require('fs');
const path = require('path');

const AI_BASE_URL = 'http://127.0.0.1:48045/v1';
const AI_API_KEY = 'sk-62702cd208dc42b09fddaf43b3731d23';

const { GENERATED_ASSETS } = require('d:/项目/换装/server/dist/generatedAssets.js');

async function testFullVton() {
  console.log('=== 测试精准多模态 VTON 全链路 ===');
  const prompt = `[CRITICAL MANDATE: HIGH-FIDELITY VIRTUAL TRY-ON & 3D FASHION EDITORIAL PHOTOGRAPH]
Generate a high-end commercial fashion studio portrait of the young East Asian female model shown in Image 1 realistically and seamlessly WEARING the exact coordinated outfit shown in the reference garment images:
  - Item 1 (OUTERWEAR): 红色薄纱古风开衫缝袍, Colors: #D63031 / #FFD700, Fabric: 轻盈红纱与金丝刺绣

[FIDELITY & 3D PHYSICS MANDATES]:
- Image 1 is the TARGET MODEL. Strictly preserve her face, hair, and body physique.
- Image 2 is the EXACT GARMENT. Strictly preserve its original red sheer color, golden embroidery, silhouette, and texture.
- The clothing pieces must be physically tailored and draped onto the 3D body with authentic cloth physics, natural fabric drapery, organic folds, and realistic studio shadows.
- Full-length full-body shot in vertical 3:4 orientation from head to toe, centered framing, neutral luxury studio background, 8k resolution.`;

  const userContent = [
    { type: 'text', text: prompt },
    { type: 'image_url', image_url: { url: GENERATED_ASSETS.avatarUrl } },
    { type: 'image_url', image_url: { url: GENERATED_ASSETS.dressCutoutUrl } },
  ];

  console.log('正在向 gemini-3.1-flash-image 发起多模态 VTON 请求...');
  const start = Date.now();
  const res = await fetch(`${AI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gemini-3.1-flash-image',
      size: '896x1216',
      extra_body: { size: '896x1216' },
      messages: [{ role: 'user', content: userContent }],
    }),
  });

  const dur = ((Date.now() - start) / 1000).toFixed(2);
  console.log(`收到响应，耗时: ${dur}s, 状态: ${res.status}`);
  const data = await res.json();
  const choice = data.choices?.[0];
  const content = choice?.message?.content || '';
  console.log('Content 长度:', content.length);
  const base64Match = content.match(/data:image\/[a-zA-Z]+;base64,[A-Za-z0-9+/=]+/);
  if (base64Match) {
    console.log('✅ 成功提取到 Base64 3D 试穿大片！大小:', (base64Match[0].length / 1024).toFixed(2), 'KB');
    const outPath = path.join(__dirname, 'verified_vton_result.jpg');
    fs.writeFileSync(outPath, Buffer.from(base64Match[0].replace(/^data:image\/\w+;base64,/, ''), 'base64'));
    console.log('✅ 已保存到:', outPath);
  } else {
    console.log('❌ 失败，未返回图像');
  }
}

testFullVton().catch(console.error);
