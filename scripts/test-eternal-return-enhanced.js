async function testEternalReturnAPI() {
  try {
    console.log('🧪 测试 Eternal Return API...');
    
    const response = await fetch('http://localhost:3000/api/eternal-return');
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ API 请求失败:', data);
      return;
    }
    
    console.log('✅ API 请求成功!');
    console.log('📊 返回的数据结构:');
    console.log(JSON.stringify(data, null, 2));
    
    // 验证关键字段
    const requiredFields = [
      'characterName', 'characterLevel', 'gameRank', 
      'playerKill', 'playerDeaths', 'playerAssistant',
      'damageToPlayer', 'mmrAfter', 'mmrGain',
      'playTimeFormatted', 'timeAgo', 'equipment', 'traits'
    ];
    
    console.log('\n🔍 验证关键字段:');
    requiredFields.forEach(field => {
      if (data[field] !== undefined) {
        console.log(`✅ ${field}: ${JSON.stringify(data[field])}`);
      } else {
        console.log(`❌ ${field}: 缺失`);
      }
    });
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 等待服务器启动
setTimeout(testEternalReturnAPI, 5000);
