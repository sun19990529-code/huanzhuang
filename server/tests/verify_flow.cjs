const fs = require('fs');
const http = require('http');

async function testApiFlow() {
  console.log('Testing V3.0 real multi-user & AI endpoints...');

  // 1. 测试登录 Coco
  const loginCocoRes = await fetch('http://localhost:3001/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'coco@wardrobe.com' }),
  });
  const cocoData = await loginCocoRes.json();
  console.log('✅ Coco 登录成功:', cocoData.data.nickname, '积分:', cocoData.data.dailyCredits);

  // 2. 测试获取 Coco 的私有 Profiles
  const profilesRes = await fetch('http://localhost:3001/v1/profiles', {
    headers: { 'x-user-id': cocoData.data.id },
  });
  const profiles = await profilesRes.json();
  console.log('✅ Coco 拥有档案数:', profiles.data.length, profiles.data.map((p) => p.name));

  // 3. 测试 Coco 获取小美的公开衣橱 (好友借穿)
  const meimeiUserId = '22222222-2222-2222-2222-222222222222';
  const meimeiProfId = 'm1m1m1m1-0000-0000-0000-123456789abc';
  const friendGarmentsRes = await fetch(
    `http://localhost:3001/v1/friends/${meimeiUserId}/profiles/${meimeiProfId}/garments`,
    {
      headers: { 'x-user-id': cocoData.data.id },
    }
  );
  const friendGarments = await friendGarmentsRes.json();
  console.log('✅ Coco 成功读取闺蜜小美衣橱:', friendGarments.data.length, '件');

  // 4. 测试 Coco 为小美推送穿搭建议
  const suggestRes = await fetch(
    `http://localhost:3001/v1/friends/${meimeiUserId}/profiles/${meimeiProfId}/suggest-outfit`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': cocoData.data.id,
      },
      body: JSON.stringify({
        title: '小红书爆款早秋法式碎花+牛仔混搭',
        garmentIds: friendGarments.data.map((g) => g.id),
      }),
    }
  );
  const suggestData = await suggestRes.json();
  console.log('✅ 穿搭建议推送成功:', suggestData.data.title);

  // 5. 切换到小美登录并查询收件箱
  const meimeiSuggestionsRes = await fetch('http://localhost:3001/v1/suggestions', {
    headers: { 'x-user-id': meimeiUserId },
  });
  const meimeiSuggestions = await meimeiSuggestionsRes.json();
  console.log('✅ 小美收件箱接收到建议数:', meimeiSuggestions.data.length, meimeiSuggestions.data.map((s) => s.title));

  // 6. 小美采纳建议
  const acceptRes = await fetch(
    `http://localhost:3001/v1/suggestions/${meimeiSuggestions.data[0].id}/accept`,
    {
      method: 'POST',
      headers: { 'x-user-id': meimeiUserId },
    }
  );
  const acceptData = await acceptRes.json();
  console.log('✅ 小美成功采纳建议并存入套装库:', acceptData.data.title);

  console.log('\n🎉 全链路多用户协同与闭环测试 100% 成功！');
}

testApiFlow().catch(console.error);
