const fs = require('fs');
const readline = require('readline');

async function readFullSteps() {
  const p = 'C:/Users/sunqiming/.gemini/antigravity/brain/ce53a329-5182-4ee5-acae-9c6fefbd88cd/.system_generated/logs/transcript_full.jsonl';
  const fileStream = fs.createReadStream(p);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let step = 0;
  for await (const line of rl) {
    step++;
    if (!line.trim()) continue;
    if (step >= 1914 && step <= 1946) {
      const obj = JSON.parse(line);
      console.log(`\n================ STEP ${step} ================`);
      if (obj.tool_calls) {
        console.log('Tool calls:', JSON.stringify(obj.tool_calls, null, 2));
      }
      if (obj.content) {
        console.log('Content:', obj.content);
      }
    }
  }
}

readFullSteps().catch(console.error);
