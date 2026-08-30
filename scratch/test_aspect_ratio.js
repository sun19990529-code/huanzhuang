const AI_BASE_URL = 'http://127.0.0.1:48045/v1';
const AI_API_KEY = 'sk-62702cd208dc42b09fddaf43b3731d23';

async function test(sizeParam, label) {
  console.log(`\n=== Testing [${label}] with size: ${sizeParam} ===`);
  const res = await fetch(AI_BASE_URL + '/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + AI_API_KEY },
    body: JSON.stringify({
      model: 'gemini-3.1-flash-image',
      size: sizeParam,
      extra_body: { size: sizeParam },
      messages: [{ role: 'user', content: 'Minimalist red dress on white background' }]
    })
  });
  console.log('HTTP Status:', res.status);
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    const content = data.choices?.[0]?.message?.content || '';
    const match = content.match(/data:image\/[a-zA-Z]+;base64,([A-Za-z0-9+/=]+)/);
    if (match) {
      const buf = Buffer.from(match[1], 'base64');
      if (buf[0] === 0xFF && buf[1] === 0xD8) {
        let offset = 2;
        while (offset < buf.length - 8) {
          if (buf[offset] === 0xFF && (buf[offset+1] === 0xC0 || buf[offset+1] === 0xC2)) {
            const h = buf.readUInt16BE(offset + 5);
            const w = buf.readUInt16BE(offset + 7);
            console.log(`✅ [${label}] JPEG Dimensions: ${w} x ${h} (Aspect ratio: ${(w/h).toFixed(3)})`);
            break;
          }
          offset++;
        }
      } else if (buf.slice(0, 8).toString('hex') === '89504e470d0a1a0a') {
        const w = buf.readUInt32BE(16);
        const h = buf.readUInt32BE(20);
        console.log(`✅ [${label}] PNG Dimensions: ${w} x ${h} (Aspect ratio: ${(w/h).toFixed(3)})`);
      }
    } else {
      console.log('Content slice:', content.slice(0, 200));
    }
  } catch (e) {
    console.log('Raw text:', text.slice(0, 200));
  }
}

async function main() {
  await test('896x1216', '3:4 Portrait (896x1216)');
}
main().catch(console.error);
