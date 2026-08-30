const fs = require('fs');
const readline = require('readline');

async function findUserLiked() {
  const p = 'C:/Users/sunqiming/.gemini/antigravity/brain/ce53a329-5182-4ee5-acae-9c6fefbd88cd/.system_generated/logs/transcript.jsonl';
  const fileStream = fs.createReadStream(p);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let step = 0;
  for await (const line of rl) {
    step++;
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      if (step >= 1970 && step <= 2020) {
        if (obj.tool_calls) {
          console.log(`\n[Step ${step}] Tool Call:`, JSON.stringify(obj.tool_calls, null, 2).substring(0, 1000));
        }
        if (obj.content && typeof obj.content === 'string' && obj.content.length > 0) {
          console.log(`\n[Step ${step}] Content:`, obj.content.substring(0, 1000));
        }
      }
    } catch (e) {}
  }
}

findUserLiked().catch(console.error);
