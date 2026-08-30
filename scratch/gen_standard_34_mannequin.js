const fs = require('fs');
const path = require('path');

const AI_BASE_URL = 'http://127.0.0.1:48045/v1';
const AI_API_KEY = 'sk-62702cd208dc42b09fddaf43b3731d23';

async function generate34Mannequin() {
  console.log('Generating official 3:4 Chinese female standard A-Pose mannequin...');
  const prompt = `[CRITICAL MANDATE: ULTRA-HIGH DEFINITION 3:4 STANDARDIZED A-POSE HUMAN MODEL SILHOUETTE]
Full-length full-body studio photograph of an authentic, naturally beautiful 20-year-old young Chinese female model (East Asian facial features, clear glowing porcelain skin, neutral light makeup, tidy elegant updo/ponytail hair) standing in a standard fashion design A-Pose posture (arms relaxed slightly apart from the body at roughly 25 degrees, palms facing inward/forward, feet placed shoulder-width apart firmly on the floor, looking directly forward at the camera with a confident, neutral, elegant expression).
Wearing simple minimalist neutral flesh-toned / light beige form-fitting seamless two-piece base-layer underwear / workout shorts and sports crop top that clearly exhibits natural anatomical body contours, neck, collarbones, waistline, hips, and legs.
Isolated on a seamless pure solid white background (#FFFFFF) with soft natural studio floor contact shadow.
Full-body head-to-toe framing in 3:4 vertical aspect ratio, generous margins at top and bottom. Crisp sharp silhouette edges, professional Hasselblad studio lighting, 8k resolution master photograph.
Negative constraints: half-body, cropped feet, cropped head, deformed hands, ugly, blurry, 2d illustration, non-Asian, cluttered background.`;

  const res = await fetch(AI_BASE_URL + '/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + AI_API_KEY },
    body: JSON.stringify({
      model: 'gemini-3.1-flash-image',
      size: '896x1216',
      extra_body: { size: '896x1216' },
      messages: [{ role: 'user', content: prompt }]
    })
  });

  console.log('Status:', res.status);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '';
  const match = content.match(/data:image\/[a-zA-Z]+;base64,([A-Za-z0-9+/=]+)/);
  if (match) {
    const fullDataUrl = match[0];
    const buf = Buffer.from(match[1], 'base64');
    let offset = 2;
    while (offset < buf.length - 8) {
      if (buf[offset] === 0xFF && (buf[offset+1] === 0xC0 || buf[offset+1] === 0xC2)) {
        const h = buf.readUInt16BE(offset + 5);
        const w = buf.readUInt16BE(offset + 7);
        console.log(`✅ Standard 3:4 Mannequin generated! Size: ${w} x ${h} (Aspect: ${(w/h).toFixed(3)})`);
        break;
      }
      offset++;
    }

    // Save to server/src/generatedAssets.ts
    const genAssetsPath = path.join(__dirname, '../server/src/generatedAssets.ts');
    let existing = fs.readFileSync(genAssetsPath, 'utf-8');
    // Replace avatarUrl and avatarFemaleUrl
    const updated = existing
      .replace(/"avatarUrl":\s*"[^"]+"/, `"avatarUrl": "${fullDataUrl}"`)
      .replace(/"avatarFemaleUrl":\s*"[^"]+"/, `"avatarFemaleUrl": "${fullDataUrl}"`);
    fs.writeFileSync(genAssetsPath, updated, 'utf-8');
    console.log('✅ Updated server/src/generatedAssets.ts with fresh 3:4 mannequin asset!');
  } else {
    console.error('No image returned:', content.slice(0, 300));
  }
}

generate34Mannequin().catch(console.error);
