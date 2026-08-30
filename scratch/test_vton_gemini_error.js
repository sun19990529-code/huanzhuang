const fetch = globalThis.fetch;

async function testGeminiImage() {
  const AI_BASE_URL = 'http://127.0.0.1:48045/v1';
  const AI_API_KEY = 'sk-62702cd208dc42b09fddaf43b3731d23';

  console.log('--- 测试 1: 发送带 referenceImages 的试穿 prompt ---');
  // 模拟一张小图片（1x1 红色 png base64）
  const samplePng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

  const userContent = [
    { type: 'text', text: 'A studio photo of a 20-year-old Chinese female model wearing this red robe, full body 3:4 aspect ratio.' },
    { type: 'image_url', image_url: { url: samplePng } }
  ];

  const payload = {
    model: 'gemini-3.1-flash-image',
    size: '896x1216',
    extra_body: { size: '896x1216' },
    messages: [{ role: 'user', content: userContent }]
  };

  const res = await fetch(`${AI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AI_API_KEY}`
    },
    body: JSON.stringify(payload)
  });

  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response Raw:\n', text.substring(0, 800));
}

testGeminiImage().catch(console.error);
