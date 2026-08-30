const fs = require('fs');
const path = require('path');

const AI_BASE_URL = 'http://127.0.0.1:48045/v1';
const AI_API_KEY = 'sk-62702cd208dc42b09fddaf43b3731d23';

async function testLiveVton() {
  console.log('--- 正在测试真实的 Multi-modal VTON (模特底图 + 单品切片图) ---');
  const { GENERATED_ASSETS } = require('d:/项目/换装/server/dist/generatedAssets.js');

  const prompt = `[CRITICAL MANDATE: HIGH-FIDELITY VIRTUAL TRY-ON & 3D FASHION EDITORIAL PHOTOGRAPH]
A high-end commercial fashion studio photograph of the gorgeous young East Asian female model shown in Reference Image 1 (identical face, physique, skin tone, and hairstyle) realistically, seamlessly, and naturally WEARING the exact garment shown in Reference Image 2.

[CRITICAL FIDELITY MANDATES]:
- Reference Image 1 is the TARGET MODEL. Preserve her exact face, hair, and body proportions.
- Reference Image 2 is the EXACT GARMENT. You MUST strictly preserve its original color, embroidery, sheer fabric texture, silhouette, and design details. Do NOT invent unrelated clothes.
- The garment must be physically tailored and draped onto her body with authentic 3D cloth physics, natural fabric draping, soft folds, and realistic studio shadows.

[COMPOSITION & FRAMING]:
- Full-length full-body shot in vertical 3:4 orientation from head to toe. The entire figure is completely visible from hair down to feet.
- Setting: Luxury minimalist fashion photography studio, clean neutral soft gray-white seamless background, soft 3-point diffused lighting.
- Hasselblad 35mm lens clarity, master quality, 8k resolution photograph.
- Negative constraints: flat 2d sticker, collage seams, ugly, deformed anatomy, extra limbs, bad hands, mutated fingers, blurry, low resolution, cartoon.`;

  const userContent = [
    { type: 'text', text: prompt },
    { type: 'image_url', image_url: { url: GENERATED_ASSETS.avatarUrl } },
    { type: 'image_url', image_url: { url: GENERATED_ASSETS.dressCutoutUrl } },
  ];

  console.log(`发送请求至 gemini-3.1-flash-image (附带 2 张参考图: 模特图 + 衣服切片图)...`);
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

  console.log(`收到响应，耗时: ${((Date.now() - start) / 1000).toFixed(2)}s, HTTP状态: ${res.status}`);
  const data = await res.json();
  const choice = data.choices?.[0];
  const content = choice?.message?.content || '';
  console.log('Content 长度:', content.length);
  if (choice?.message?.reasoning_content) {
    console.log('Reasoning 长度:', choice.message.reasoning_content.length);
    console.log('Reasoning 摘要:', choice.message.reasoning_content.substring(0, 200));
  }

  const base64Match = content.match(/data:image\/[a-zA-Z]+;base64,[A-Za-z0-9+/=]+/);
  if (base64Match) {
    console.log('✅ 成功提取到 Base64 图像数据！');
    const outPath = path.join(__dirname, 'live_multimodal_vton_result.jpg');
    const bData = base64Match[0].replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(outPath, Buffer.from(bData, 'base64'));
    console.log('✅ 真实试穿大片已保存至:', outPath);
  } else {
    console.log('❌ 未在 content 中提取到图片。Content 预览:', content.substring(0, 300));
  }
}

testLiveVton().catch(console.error);
