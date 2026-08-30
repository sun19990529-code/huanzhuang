const fs = require('fs');
const readline = require('readline');

async function searchHistory() {
  const paths = [
    'C:/Users/sunqiming/Downloads/transcript.jsonl',
    'C:/Users/sunqiming/.gemini/antigravity/brain/ce53a329-5182-4ee5-acae-9c6fefbd88cd/.system_generated/logs/transcript.jsonl'
  ];

  for (const p of paths) {
    if (!fs.existsSync(p)) continue;
    console.log(`\n=== 正在检索 ${p} ===`);
    const fileStream = fs.createReadStream(p);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let step = 0;
    for await (const line of rl) {
      step++;
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line);
        const text = typeof obj.content === 'string' ? obj.content : JSON.stringify(obj.content || '');
        if (
          text.includes('vton') ||
          text.includes('试穿') ||
          text.includes('生图') ||
          text.includes('gemini-3.1-flash-image') ||
          text.includes('gemini-3-pro-image') ||
          text.includes('48045') ||
          text.includes('canvasSnapshot') ||
          text.includes('切片')
        ) {
          if (obj.type === 'USER_INPUT') {
            console.log(`\n[Step ${step}] [USER]: ${text.substring(0, 300)}`);
          }
        }
      } catch (e) {}
    }
  }
}

searchHistory().catch(console.error);
