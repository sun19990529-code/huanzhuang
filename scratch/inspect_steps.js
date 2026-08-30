const fs = require('fs');
const readline = require('readline');

async function inspectSteps() {
  const p = 'C:/Users/sunqiming/.gemini/antigravity/brain/ce53a329-5182-4ee5-acae-9c6fefbd88cd/.system_generated/logs/transcript.jsonl';
  const fileStream = fs.createReadStream(p);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let step = 0;
  for await (const line of rl) {
    step++;
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      if ((step >= 1860 && step <= 2010) || (step >= 6270 && step <= 6310)) {
        if (obj.type === 'USER_INPUT') {
          console.log(`\n--- Step ${step} [USER] ---:\n`, obj.content);
        } else if (obj.type === 'PLANNER_RESPONSE') {
          const tc = obj.tool_calls ? obj.tool_calls.map(t => t.function?.name || t.name).join(', ') : '';
          const text = obj.content ? obj.content.substring(0, 300) : '';
          console.log(`\n--- Step ${step} [AI] (Tools: ${tc}) ---:\n`, text);
        }
      }
    } catch (e) {}
  }
}

inspectSteps().catch(console.error);
