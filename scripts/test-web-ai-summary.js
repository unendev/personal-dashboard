import fetch from 'node-fetch';

async function testWebAISummary() {
  try {
    console.log('开始测试 Web AI 总结功能...');
    
    const baseUrl = 'http://localhost:3000';
    const userId = 'user-1';
    const date = new Date().toISOString().split('T')[0];
    
    // 测试 GET 请求 - 获取AI总结
    console.log('\n1. 测试获取AI总结...');
    const getResponse = await fetch(`${baseUrl}/api/ai-summary?userId=${userId}&date=${date}`);
    
    if (getResponse.ok) {
      const summary = await getResponse.json();
      console.log('✅ GET 请求成功');
      console.log(`总结: ${summary.summary.substring(0, 100)}...`);
      console.log(`是否来自缓存: ${summary.isFromCache}`);
      console.log(`总时间: ${Math.floor(summary.totalTime / 3600)}小时${Math.floor((summary.totalTime % 3600) / 60)}分钟`);
      console.log(`任务数: ${summary.taskCount}个`);
    } else {
      console.log('❌ GET 请求失败:', getResponse.status, getResponse.statusText);
    }
    
    // 测试 POST 请求 - 生成AI总结
    console.log('\n2. 测试生成AI总结...');
    const postResponse = await fetch(`${baseUrl}/api/ai-summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, date }),
    });
    
    if (postResponse.ok) {
      const summary = await postResponse.json();
      console.log('✅ POST 请求成功');
      console.log(`总结: ${summary.summary.substring(0, 100)}...`);
      console.log(`是否来自缓存: ${summary.isFromCache}`);
      console.log(`总时间: ${Math.floor(summary.totalTime / 3600)}小时${Math.floor((summary.totalTime % 3600) / 60)}分钟`);
      console.log(`任务数: ${summary.taskCount}个`);
    } else {
      console.log('❌ POST 请求失败:', postResponse.status, postResponse.statusText);
    }
    
    // 测试日志页面
    console.log('\n3. 测试日志页面...');
    const logPageResponse = await fetch(`${baseUrl}/log`);
    
    if (logPageResponse.ok) {
      console.log('✅ 日志页面访问成功');
      const html = await logPageResponse.text();
      if (html.includes('AISummaryWidget')) {
        console.log('✅ AI总结组件已正确加载');
      } else {
        console.log('⚠️ AI总结组件可能未正确加载');
      }
    } else {
      console.log('❌ 日志页面访问失败:', logPageResponse.status, logPageResponse.statusText);
    }
    
    console.log('\n✅ Web AI 总结功能测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 等待服务器启动
setTimeout(() => {
  testWebAISummary();
}, 3000);
