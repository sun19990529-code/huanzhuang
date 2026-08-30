const { execSync } = require('child_process');

console.log('Testing live fitting studio with puppeteer...');
try {
  // 简易打开并截屏
  execSync('"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --headless=new --disable-gpu --window-size=1440,900 --screenshot=d:\\项目\\换装\\verified_transparent_fitting.png http://localhost:5173');
  console.log('Screenshot taken.');
} catch (e) {
  console.error(e.message);
}
