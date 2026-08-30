const { AIService } = require('../server/dist/aiService.js');

async function testAIService() {
  console.log('=== 测试 AIService.renderVtonWithAI ===');
  const result = await AIService.renderVtonWithAI(
    '我的身材档案',
    'FEMALE',
    '红色薄纱古风开衫缝袍',
    { heightCm: 168, bustCm: 84, waistCm: 62, hipsCm: 89 },
    '标准中国籍20岁女性',
    [],
    [
      {
        title: '红色薄纱古风开衫缝袍',
        category: 'OUTERWEAR',
        subCategory: 'Robe',
        colors: ['#D63031', '#FFD700'],
        material: '轻盈红纱与金丝刺绣',
        appliedState: 'CLOSED'
      }
    ]
  );

  console.log('结果 URL 是否存在:', !!result);
  console.log('结果前 80 字符:', result.substring(0, 80));
}

testAIService().catch(console.error);
