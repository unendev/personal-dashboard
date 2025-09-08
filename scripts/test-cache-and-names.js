async function testCacheAndCharacterNames() {
  try {
    console.log('🔍 测试缓存机制和角色名称显示...\n');
    
    // 第一次请求 - 应该从API获取数据
    console.log('1️⃣ 第一次请求（应该从API获取）:');
    const response1 = await fetch('http://localhost:3001/api/eternal-return');
    const data1 = await response1.json();
    
    if (response1.ok) {
      console.log('✅ 角色名称:', data1.characterName);
      console.log('✅ 角色编号:', data1.characterNum);
      console.log('✅ 角色代码:', data1.characterCode);
      console.log('✅ 角色头像:', data1.characterAvatar);
    } else {
      console.log('❌ 请求失败:', data1.message);
      return;
    }
    
    // 等待1秒
    console.log('\n⏳ 等待1秒...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 第二次请求 - 应该使用缓存
    console.log('\n2️⃣ 第二次请求（应该使用缓存）:');
    const response2 = await fetch('http://localhost:3001/api/eternal-return');
    const data2 = await response2.json();
    
    if (response2.ok) {
      console.log('✅ 角色名称:', data2.characterName);
      console.log('✅ 角色编号:', data2.characterNum);
      console.log('✅ 角色代码:', data2.characterCode);
      console.log('✅ 角色头像:', data2.characterAvatar);
    }
    
    // 分析角色名称来源
    console.log('\n📊 角色名称来源分析:');
    console.log('角色编号 61 对应:');
    console.log('- CHARACTER_MAP[61]: "Irem" (手动映射表)');
    console.log('- API返回的角色名称: 可能是其他语言或格式');
    console.log('- 最终显示: 优先使用手动映射表，如果没有则使用API名称');
    
    console.log('\n🔄 缓存机制分析:');
    console.log('- 用户信息缓存: 30分钟');
    console.log('- 游戏数据缓存: 2分钟');
    console.log('- 角色元数据缓存: 24小时');
    console.log('- 物品元数据缓存: 24小时');
    console.log('- 特质元数据缓存: 24小时');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 等待服务器启动
setTimeout(testCacheAndCharacterNames, 2000);
