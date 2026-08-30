const fs = require('fs');
const readline = require('readline');

async function findModelAt1900() {
  const p = 'C:/Users/sunqiming/.gemini/antigravity/brain/ce53a329-5182-4ee5-acae-9c6fefbd88cd/.system_generated/logs/transcript.jsonl';
  const fileStream = fs.createReadStream(p);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let step = 0;
  for await (const line of rl) {
    step++;
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      if (step >= 1850 && step <= 1980) {
        const str = JSON.stringify(obj);
        if (str.includes('IMAGE_GENERATION_MODEL') || str.includes('model: ') || str.includes('renderVtonWithAI') || str.includes('callImageGeneration')) {
          console.log(`\n[Step ${step}]`, str.substring(0, 400));
        }
      }
    } catch (e) {}
  }
}

findModelAt1900().catch(console.error);
