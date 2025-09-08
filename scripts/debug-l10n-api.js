/**
 * 调试永恒轮回中文语言包API
 * 检查API响应结构和数据内容
 */

const ER_API_KEY = process.env.ER_API_KEY || '2nrZ0MisoZ1UlOQ0Fr3Gm2pWQ4SlCqOw9JO46ZNW';
const ER_API_BASE_URL = 'https://open-api.bser.io';

async function debugL10nAPI() {
  try {
    console.log('🔍 调试中文语言包API...');
    
    const response = await fetch(`${ER_API_BASE_URL}/v1/l10n/ChineseSimplified`, {
      headers: { 'x-api-key': ER_API_KEY }
    });

    console.log(`📡 API响应状态: ${response.status}`);
    console.log(`📡 API响应头:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('📊 API响应结构:');
    console.log(`   - code: ${data.code}`);
    console.log(`   - message: ${data.message}`);
    console.log(`   - data类型: ${typeof data.data}`);
    console.log(`   - data是否为数组: ${Array.isArray(data.data)}`);
    
    if (data.data && typeof data.data === 'object') {
      const keys = Object.keys(data.data);
      console.log(`   - data键数量: ${keys.length}`);
      
      if (keys.length > 0) {
        console.log('📋 前10个键:');
        keys.slice(0, 10).forEach(key => {
          console.log(`     - ${key}: ${data.data[key]}`);
        });
        
        // 查找角色相关的键
        const characterKeys = keys.filter(key => key.includes('Character'));
        console.log(`\n🎭 角色相关键数量: ${characterKeys.length}`);
        
        if (characterKeys.length > 0) {
          console.log('📋 前10个角色键:');
          characterKeys.slice(0, 10).forEach(key => {
            console.log(`     - ${key}: ${data.data[key]}`);
          });
        }
      }
    }
    
    return data;
    
  } catch (error) {
    console.error('❌ 调试API时出错:', error);
    return null;
  }
}

async function testDifferentLanguages() {
  console.log('\n🌍 测试不同语言包...');
  
  const languages = ['ChineseSimplified', 'ChineseTraditional', 'English', 'Korean', 'Japanese'];
  
  for (const lang of languages) {
    try {
      console.log(`\n🔍 测试语言: ${lang}`);
      const response = await fetch(`${ER_API_BASE_URL}/v1/l10n/${lang}`, {
        headers: { 'x-api-key': ER_API_KEY }
      });
      
      if (response.ok) {
        const data = await response.json();
        const keys = Object.keys(data.data || {});
        console.log(`   ✅ 成功获取 ${keys.length} 条翻译`);
        
        // 查找角色相关的键
        const characterKeys = keys.filter(key => key.includes('Character'));
        console.log(`   🎭 角色相关键: ${characterKeys.length} 条`);
        
        if (characterKeys.length > 0) {
          console.log(`   📋 示例角色键: ${characterKeys.slice(0, 3).join(', ')}`);
        }
      } else {
        console.log(`   ❌ 请求失败: ${response.status}`);
      }
    } catch (error) {
      console.log(`   ❌ 错误: ${error.message}`);
    }
  }
}

// 运行调试
debugL10nAPI()
  .then(() => testDifferentLanguages())
  .catch(console.error);

