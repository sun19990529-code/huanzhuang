const fetch = globalThis.fetch;

async function testTextOnlyGemini() {
  const AI_BASE_URL = 'http://127.0.0.1:48045/v1';
  const AI_API_KEY = 'sk-62702cd208dc42b09fddaf43b3731d23';

  console.log('--- 测试: 纯文本 Prompt 调用 gemini-3.1-flash-image ---');
  const prompt = `A full-length 8k fashion studio photograph of a 20-year-old Chinese female model with black hair tied back in a neat bun, wearing an elegant crimson translucent ancient Chinese robe (红色薄纱古风开衫缝袍) with intricate gold dragon embroidery along the lapels and sleeves, paired with silk undergarments. Standing gracefully in a clean minimalist photo studio, soft diffuse lighting, full body shot, 3:4 vertical aspect ratio, Hasselblad photography.`;

  const payload = {
    model: 'gemini-3.1-flash-image',
    size: '896x1216',
    extra_body: { size: '896x1216' },
    messages: [
      {
        role: 'user',
        content: prompt
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

testTextOnlyGemini().catch(console.error);
