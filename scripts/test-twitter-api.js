// 测试Twitter API集成
const testTwitterAPI = async () => {
  try {
    console.log('测试Twitter API...');
    
    // 测试获取用户信息
    const userResponse = await fetch('http://localhost:3000/api/twitter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username: 'elonmusk' }),
    });

    if (!userResponse.ok) {
      throw new Error(`用户API请求失败: ${userResponse.status}`);
    }

    const userData = await userResponse.json();
    console.log('用户信息:', userData);

    // 测试获取推文
    const tweetsResponse = await fetch(`http://localhost:3000/api/twitter?userId=${userData.user.id}&maxResults=3`);
    
    if (!tweetsResponse.ok) {
      throw new Error(`推文API请求失败: ${tweetsResponse.status}`);
    }

    const tweetsData = await tweetsResponse.json();
    console.log('推文数据:', tweetsData);

    console.log('✅ Twitter API测试成功！');
    
  } catch (error) {
    console.error('❌ Twitter API测试失败:', error);
  }
};

// 如果是在浏览器环境中运行
if (typeof window !== 'undefined') {
  testTwitterAPI();
}

module.exports = { testTwitterAPI };
