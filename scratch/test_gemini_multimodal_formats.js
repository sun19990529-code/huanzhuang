const fs = require('fs');
const path = require('path');

const AI_BASE_URL = 'http://127.0.0.1:48045/v1';
const AI_API_KEY = 'sk-62702cd208dc42b09fddaf43b3731d23';

const { GENERATED_ASSETS } = require('d:/项目/换装/server/dist/generatedAssets.js');

async function testFormat(name, payload) {
  console.log(`\n================ Testing ${name} ================`);
  const start = Date.now();
  try {
    const res = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });
    const dur = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`[${name}] Response received in ${dur}s, Status: ${res.status}`);
    const data = await res.json();
    const choice = data.choices?.[0];
    const content = choice?.message?.content || '';
    const reasoning = choice?.message?.reasoning_content || '';
    console.log(`[${name}] Content length: ${content.length}, Reasoning length: ${reasoning.length}`);
    const base64Match = content.match(/data:image\/[a-zA-Z]+;base64,[A-Za-z0-9+/=]+/);
    if (base64Match) {
      console.log(`[${name}] SUCCESS: Image returned!`);
      const outPath = path.join(__dirname, `res_${name}.jpg`);
      fs.writeFileSync(outPath, Buffer.from(base64Match[0].replace(/^data:image\/\w+;base64,/, ''), 'base64'));
      return true;
    } else {
      console.log(`[${name}] FAILED: No image in content.`);
      return false;
    }
  } catch (e) {
    console.error(`[${name}] Error:`, e);
    return false;
  }
}

async function runAll() {
  // 方案 A: 简明多模态试穿指令 (Direct VTON Command with images attached)
  await testFormat('formatA_concise', {
    model: 'gemini-3.1-flash-image',
    extra_body: { size: '896x1216' },
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Virtual try-on photo: Generate a realistic 3:4 studio fashion portrait of the model in Image 1 wearing the exact garment shown in Image 2. Seamless fit, natural cloth drapery, 8k commercial photography.',
          },
          { type: 'image_url', image_url: { url: GENERATED_ASSETS.avatarUrl } },
          { type: 'image_url', image_url: { url: GENERATED_ASSETS.dressCutoutUrl } },
        ],
      },
    ],
  });

  // 方案 B: 图像置前，提示词在后
  await testFormat('formatB_images_first', {
    model: 'gemini-3.1-flash-image',
    extra_body: { size: '896x1216' },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: GENERATED_ASSETS.avatarUrl } },
          { type: 'image_url', image_url: { url: GENERATED_ASSETS.dressCutoutUrl } },
          {
            type: 'text',
            text: 'High-end 3:4 fashion studio photography of the model in the first image wearing the outfit in the second image. High-fidelity VTON.',
          },
        ],
      },
    ],
  });
}

runAll().catch(console.error);
