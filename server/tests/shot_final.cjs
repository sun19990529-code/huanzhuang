const { execSync } = require('child_process');

console.log('Capturing verified live web studio screenshot...');
try {
  execSync('"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --headless=new --disable-gpu --window-size=1440,900 --screenshot=d:\\项目\\换装\\verified_studio_final.png http://localhost:5173');
  console.log('Done.');
} catch (e) {
  console.error(e.message);
}
