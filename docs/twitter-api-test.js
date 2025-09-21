// 浏览器控制台测试脚本
// 在浏览器控制台中运行以下代码来测试Twitter API

const testTwitterAPI = async () => {
  console.log('🔍 开始测试Twitter API...');
  
  try {
    // 测试1: 获取用户信息
    console.log('📱 测试1: 获取用户信息...');
    const userResponse = await fetch('/api/twitter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username: 'elonmusk' }),
    });

    console.log('用户API状态:', userResponse.status);
    
    if (!userResponse.ok) {
      const errorData = await userResponse.json();
      console.error('❌ 用户API失败:', errorData);
      return;
    }

    const userData = await userResponse.json();
    console.log('✅ 用户信息获取成功:', userData);

    // 测试2: 获取推文
    console.log('🐦 测试2: 获取推文...');
    const tweetsResponse = await fetch(`/api/twitter?userId=${userData.user.id}&maxResults=3`);
    
    console.log('推文API状态:', tweetsResponse.status);
    
    if (!tweetsResponse.ok) {
      const errorData = await tweetsResponse.json();
      console.error('❌ 推文API失败:', errorData);
      return;
    }

    const tweetsData = await tweetsResponse.json();
    console.log('✅ 推文获取成功:', tweetsData);
    console.log(`📊 共获取 ${tweetsData.data?.length || 0} 条推文`);

    // 显示第一条推文内容
    if (tweetsData.data && tweetsData.data.length > 0) {
      console.log('📝 最新推文:', tweetsData.data[0].text);
    }

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
};

// 运行测试
testTwitterAPI();

// 也可以单独测试用户API
const testUserAPI = async (username = 'elonmusk') => {
  console.log(`🔍 测试用户API: ${username}`);
  
  const response = await fetch('/api/twitter', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username }),
  });

  const data = await response.json();
  console.log('响应:', data);
  return data;
};

// 也可以单独测试推文API
const testTweetsAPI = async (userId = '2244994945') => {
  console.log(`🐦 测试推文API: ${userId}`);
  
  const response = await fetch(`/api/twitter?userId=${userId}&maxResults=3`);
  const data = await response.json();
  console.log('响应:', data);
  return data;
};

console.log('💡 使用方法:');
console.log('- testTwitterAPI() - 完整测试');
console.log('- testUserAPI("username") - 测试用户API');
console.log('- testTweetsAPI("userId") - 测试推文API');
