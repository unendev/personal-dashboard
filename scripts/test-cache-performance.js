// 测试 Eternal Return API 缓存功能
const testCachePerformance = async () => {
  console.log('=== Eternal Return API 缓存性能测试 ===\n');
  
  const testTimes = 3;
  const results = [];
  
  for (let i = 1; i <= testTimes; i++) {
    console.log(`第 ${i} 次测试:`);
    const startTime = Date.now();
    
    try {
      const response = await fetch('http://localhost:3000/api/eternal-return');
      const data = await response.json();
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      results.push(duration);
      
      console.log(`  响应时间: ${duration}ms`);
      console.log(`  状态: ${response.ok ? '成功' : '失败'}`);
      
      if (response.ok) {
        console.log(`  角色: ${data.characterName}`);
        console.log(`  排名: ${data.gameRank}`);
        console.log(`  击杀/助攻: ${data.playerKill}/${data.playerAssistant}`);
      } else {
        console.log(`  错误: ${data.message}`);
      }
      
    } catch (error) {
      console.error(`  错误: ${error.message}`);
      results.push(null);
    }
    
    console.log('');
    
    // 等待1秒再进行下一次测试
    if (i < testTimes) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // 分析结果
  console.log('=== 性能分析 ===');
  const validResults = results.filter(r => r !== null);
  
  if (validResults.length > 0) {
    const avgTime = validResults.reduce((a, b) => a + b, 0) / validResults.length;
    const minTime = Math.min(...validResults);
    const maxTime = Math.max(...validResults);
    
    console.log(`平均响应时间: ${avgTime.toFixed(2)}ms`);
    console.log(`最快响应时间: ${minTime}ms`);
    console.log(`最慢响应时间: ${maxTime}ms`);
    
    // 检查缓存效果
    if (validResults.length >= 2) {
      const firstRequest = validResults[0];
      const subsequentRequests = validResults.slice(1);
      const avgSubsequent = subsequentRequests.reduce((a, b) => a + b, 0) / subsequentRequests.length;
      
      console.log(`\n缓存效果分析:`);
      console.log(`首次请求: ${firstRequest}ms`);
      console.log(`后续请求平均: ${avgSubsequent.toFixed(2)}ms`);
      
      if (avgSubsequent < firstRequest * 0.8) {
        console.log('✅ 缓存效果明显，后续请求明显更快');
      } else if (avgSubsequent < firstRequest) {
        console.log('⚠️ 缓存效果一般，后续请求稍快');
      } else {
        console.log('❌ 缓存效果不明显，可能需要检查缓存实现');
      }
    }
  } else {
    console.log('❌ 没有成功的测试结果');
  }
  
  console.log('\n=== 测试完成 ===');
};

// 运行测试
testCachePerformance().catch(console.error);
