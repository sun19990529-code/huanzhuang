const fs = require('fs');
const path = require('path');

const imgPath = 'C:/Users/sunqiming/.gemini/antigravity/brain/ce53a329-5182-4ee5-acae-9c6fefbd88cd/.user_uploaded/media_1787735714396.jpg';

async function testGeneration() {
  const base64Data = fs.readFileSync(imgPath).toString('base64');
  const dataUrl = `data:image/jpeg;base64,${base64Data}`;

  console.log('1. 测试 Vision 模型识别图片中的衣服与人物特征...');
  try {
    const visionRes = await fetch('http://127.0.0.1:48045/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer sk-62702cd208dc42b09fddaf43b3731d23',
      },
      body: JSON.stringify({
        model: 'gemini-3.7-flash-high',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: '请分析这张图片中的人物容貌特征以及衣服单品。请以 JSON 格式返回：1. 人物面貌发型身材特征描述 avatar_prompt；2. 服装单品列表 garments: [{title, primaryCategory, subCategory, colors, description}]。请只返回 JSON。',
              },
              {
                type: 'image_url',
                image_url: { url: dataUrl },
              },
            ],
          },
        ],
      }),
    });

    console.log('Vision Status:', visionRes.status);
    const visionText = await visionRes.text();
    console.log('Vision Output:', visionText.slice(0, 500));
  } catch (err) {
    console.error('Vision Error:', err);
  }

  console.log('\n2. 测试生图模型生成 A-Pose 标准模特素体...');
  try {
    const imgRes = await fetch('http://127.0.0.1:48045/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer sk-62702cd208dc42b09fddaf43b3731d23',
      },
      body: JSON.stringify({
        model: 'gemini-3-pro-image',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Generate a full-body fashion model mannequin avatar with the same face, purple hair, and fair skin tone as the provided character. Standing centered in a standard A-pose with arms slightly open, clean solid white background, wearing tight neutral minimal beige underwear (tank top and shorts). Studio lighting, 8k photographic fashion mannequin.',
              },
              {
                type: 'image_url',
                image_url: { url: dataUrl },
              },
            ],
          },
        ],
      }),
    });

    console.log('Avatar Gen Status:', imgRes.status);
    const imgText = await imgRes.text();
    console.log('Avatar Gen Output length:', imgText.length);
    fs.writeFileSync('server/tests/avatar_gen_raw.json', imgText);
    console.log('Avatar Gen preview:', imgText.slice(0, 300));
  } catch (err) {
    console.error('Avatar Gen Error:', err);
  }
}

testGeneration();
