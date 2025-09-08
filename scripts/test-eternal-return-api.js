// 测试 Eternal Return API 端点
const testERAPI = async () => {
  try {
    console.log('测试 Eternal Return API...');
    
    const response = await fetch('http://localhost:3000/api/eternal-return');
    const data = await response.json();
    
    console.log('响应状态:', response.status);
    console.log('响应数据:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('✅ API 测试成功!');
      console.log('角色:', data.characterName);
      console.log('排名:', data.gameRank);
      console.log('击杀/助攻:', `${data.playerKill}/${data.playerAssistant}`);
    } else {
      console.log('❌ API 测试失败:', data.message);
    }
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error);
  }
};

// 运行测试
testERAPI();
