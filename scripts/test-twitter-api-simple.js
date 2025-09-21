// 简单的Twitter API测试
const testTwitterAPI = async () => {
  console.log('开始测试Twitter API...');
  
  try {
    // 测试获取用户信息
    console.log('1. 测试获取用户信息...');
    const userResponse = await fetch('http://localhost:3000/api/twitter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username: 'elonmusk' }),
    });

    console.log('用户API响应状态:', userResponse.status);
    
    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error('用户API错误:', errorText);
      return;
    }

    const userData = await userResponse.json();
    console.log('用户数据:', userData);

    if (!userData.user || !userData.user.id) {
      console.error('用户数据无效');
      return;
    }

    // 测试获取推文
    console.log('2. 测试获取推文...');
    const tweetsResponse = await fetch(`http://localhost:3000/api/twitter?userId=${userData.user.id}&maxResults=3`);
    
    console.log('推文API响应状态:', tweetsResponse.status);
    
    if (!tweetsResponse.ok) {
      const errorText = await tweetsResponse.text();
      console.error('推文API错误:', errorText);
      return;
    }

    const tweetsData = await tweetsResponse.json();
    console.log('推文数据:', tweetsData);

    console.log('✅ Twitter API测试成功！');
    console.log(`找到 ${tweetsData.data?.length || 0} 条推文`);
    
  } catch (error) {
    console.error('❌ Twitter API测试失败:', error);
  }
};

// 如果是在浏览器环境中运行
if (typeof window !== 'undefined') {
  // 等待页面加载完成
  window.addEventListener('load', () => {
    setTimeout(testTwitterAPI, 1000);
  });
}

module.exports = { testTwitterAPI };
