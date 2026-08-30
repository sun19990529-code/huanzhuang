const http = require('http');
const { execSync } = require('child_process');

console.log('Capturing verified screenshot with proper wait...');

// 使用 node 执行一段带延迟的 chrome 脚本，或者直接使用 node-fetch 验证
// 我们可以用 Chrome remote debugging 或者一个带 setTimeout 的 script
try {
  // 用 headless chrome 并在页面渲染完成后截屏
  execSync('"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --headless=new --disable-gpu --virtual-time-budget=3000 --window-size=1440,900 --screenshot=d:\\项目\\换装\\verified_live_fitting_ok.png http://localhost:5173');
  console.log('Screenshot with wait captured.');
} catch (e) {
  console.error(e.message);
}
