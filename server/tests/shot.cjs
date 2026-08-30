const http = require('http');
const { execSync } = require('child_process');

console.log('Capturing verified studio screenshot...');
try {
  execSync('"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --headless=new --disable-gpu --window-size=1440,900 --screenshot=d:\\项目\\换装\\verified_live_studio.png http://localhost:5173');
  console.log('Screenshot captured successfully.');
} catch (e) {
  console.error('Screenshot error:', e.message);
}
