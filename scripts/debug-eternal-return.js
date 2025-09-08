async function debugEternalReturnAPI() {
  try {
    console.log('🔍 调试 Eternal Return API...');
    
    // 测试用户信息获取
    console.log('\n1️⃣ 测试用户信息获取...');
    const userResponse = await fetch('https://open-api.bser.io/v1/user/nickname?query=Geerea', {
      headers: {
        'x-api-key': '2nrZ0MisoZ1UlOQ0Fr3Gm2pWQ4SlCqOw9JO46ZNW',
        'Content-Type': 'application/json',
      },
    });
    
    if (userResponse.ok) {
      const userData = await userResponse.json();
      console.log('✅ 用户信息:', JSON.stringify(userData, null, 2));
      
      if (userData.user) {
        const userNum = userData.user.userNum;
        console.log(`\n2️⃣ 测试用户游戏列表 (userNum: ${userNum})...`);
        
        const gamesResponse = await fetch(`https://open-api.bser.io/v1/user/games/${userNum}`, {
          headers: {
            'x-api-key': '2nrZ0MisoZ1UlOQ0Fr3Gm2pWQ4SlCqOw9JO46ZNW',
            'Content-Type': 'application/json',
          },
        });
        
        if (gamesResponse.ok) {
          const gamesData = await gamesResponse.json();
          console.log('✅ 游戏列表:', JSON.stringify(gamesData, null, 2));
          
          if (gamesData.userGames && gamesData.userGames.length > 0) {
            const latestGameId = gamesData.userGames[0].gameId;
            console.log(`\n3️⃣ 测试游戏详情 (gameId: ${latestGameId})...`);
            
            const gameDetailResponse = await fetch(`https://open-api.bser.io/v1/games/${latestGameId}`, {
              headers: {
                'x-api-key': '2nrZ0MisoZ1UlOQ0Fr3Gm2pWQ4SlCqOw9JO46ZNW',
                'Content-Type': 'application/json',
              },
            });
            
            if (gameDetailResponse.ok) {
              const gameDetailData = await gameDetailResponse.json();
              console.log('✅ 游戏详情:', JSON.stringify(gameDetailData, null, 2));
              
              // 检查用户游戏数据
              if (gameDetailData.userGames) {
                const userGameData = gameDetailData.userGames.find(game => game.userNum === userNum);
                if (userGameData) {
                  console.log('\n✅ 找到用户游戏数据:', JSON.stringify(userGameData, null, 2));
                } else {
                  console.log('\n❌ 未找到用户游戏数据');
                  console.log('可用的用户游戏数据:', gameDetailData.userGames.map(g => ({ userNum: g.userNum, characterNum: g.characterNum })));
                }
              }
            } else {
              console.log('❌ 游戏详情请求失败:', gameDetailResponse.status);
            }
          } else {
            console.log('❌ 没有游戏记录');
          }
        } else {
          console.log('❌ 游戏列表请求失败:', gamesResponse.status);
        }
      } else {
        console.log('❌ 未找到用户');
      }
    } else {
      console.log('❌ 用户信息请求失败:', userResponse.status);
    }
    
  } catch (error) {
    console.error('❌ 调试失败:', error.message);
  }
}

// 等待服务器启动
setTimeout(debugEternalReturnAPI, 2000);
