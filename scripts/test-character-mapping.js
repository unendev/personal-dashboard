/**
 * 测试永恒轮回角色ID与中文名称映射功能
 * 这个脚本验证新的API组合方案是否正确工作
 */

const ER_API_KEY = process.env.ER_API_KEY || '2nrZ0MisoZ1UlOQ0Fr3Gm2pWQ4SlCqOw9JO46ZNW';
const ER_API_BASE_URL = 'https://open-api.bser.io';

/**
 * 获取角色ID与中文名称的映射表
 * 使用官方API组合方案：角色数据 + 中文语言包
 */
async function fetchCharacterMap() {
  try {
    console.log('🚀 开始获取角色映射数据...');
    
    // 同时发起两个API请求，效率更高
    const [characterResponse, l10nResponse] = await Promise.all([
      fetch(`${ER_API_BASE_URL}/v2/data/Character`, {
        headers: { 'x-api-key': ER_API_KEY }
      }),
      fetch(`${ER_API_BASE_URL}/v1/l10n/ChineseSimplified`, {
        headers: { 'x-api-key': ER_API_KEY }
      })
    ]);

    if (!characterResponse.ok || !l10nResponse.ok) {
      throw new Error(`API请求失败: Character=${characterResponse.status}, L10n=${l10nResponse.status}`);
    }

    const [characterData, l10nData] = await Promise.all([
      characterResponse.json(),
      l10nResponse.json()
    ]);

    const characters = characterData.data || [];
    const translations = l10nData.data || {};

    console.log(`📊 获取到 ${characters.length} 个角色数据`);
    console.log(`📚 获取到 ${Object.keys(translations).length} 条翻译数据`);

    const characterMap = {};
    const missingTranslations = [];

    // 遍历角色列表并组合数据
    for (const character of characters) {
      const characterId = character.code;
      const translationKey = `Character/Name/${characterId}`;
      
      // 在翻译词典中查找对应的中文名
      const chineseName = translations[translationKey];
      
      if (characterId && character.name) {
        characterMap[characterId] = {
          id: characterId,
          englishName: character.name,
          chineseName: chineseName || character.name,
          hasChineseTranslation: !!chineseName
        };
        
        if (!chineseName) {
          missingTranslations.push({
            id: characterId,
            englishName: character.name,
            translationKey
          });
        }
      }
    }

    console.log(`✅ 成功生成角色映射表，共 ${Object.keys(characterMap).length} 个角色`);
    
    if (missingTranslations.length > 0) {
      console.log(`⚠️  有 ${missingTranslations.length} 个角色缺少中文翻译:`);
      missingTranslations.forEach(char => {
        console.log(`   - ID: ${char.id}, 英文名: ${char.englishName}, 翻译键: ${char.translationKey}`);
      });
    }

    // 显示前10个角色的映射结果
    console.log('\n📋 前10个角色映射示例:');
    const sampleCharacters = Object.values(characterMap).slice(0, 10);
    sampleCharacters.forEach(char => {
      const status = char.hasChineseTranslation ? '✅' : '❌';
      console.log(`   ${status} ID: ${char.id} | 英文: ${char.englishName} | 中文: ${char.chineseName}`);
    });

    return characterMap;

  } catch (error) {
    console.error('❌ 生成角色映射表时出错:', error);
    return null;
  }
}

/**
 * 测试特定角色的映射
 */
async function testSpecificCharacters(characterMap) {
  console.log('\n🎯 测试特定角色映射:');
  
  const testIds = [1, 2, 3, 10, 20, 30, 40, 50]; // 测试一些常见的角色ID
  
  testIds.forEach(id => {
    const char = characterMap[id];
    if (char) {
      console.log(`   ID ${id}: ${char.englishName} -> ${char.chineseName} ${char.hasChineseTranslation ? '✅' : '❌'}`);
    } else {
      console.log(`   ID ${id}: 未找到角色数据 ❌`);
    }
  });
}

/**
 * 生成静态映射文件（可选）
 */
function generateStaticMapping(characterMap) {
  console.log('\n💾 生成静态映射文件...');
  
  const staticMapping = {};
  Object.values(characterMap).forEach(char => {
    staticMapping[char.id] = {
      name: char.chineseName,
      englishName: char.englishName,
      avatar: `/characters/${char.englishName.toLowerCase()}.png`
    };
  });
  
  console.log('📄 静态映射文件内容预览 (前5个):');
  const sampleEntries = Object.entries(staticMapping).slice(0, 5);
  sampleEntries.forEach(([id, data]) => {
    console.log(`   ${id}: { name: '${data.name}', englishName: '${data.englishName}', avatar: '${data.avatar}' }`);
  });
  
  return staticMapping;
}

// 主函数
async function main() {
  console.log('🎮 永恒轮回角色映射测试开始\n');
  
  const characterMap = await fetchCharacterMap();
  
  if (characterMap) {
    await testSpecificCharacters(characterMap);
    const staticMapping = generateStaticMapping(characterMap);
    
    console.log('\n🎉 测试完成！');
    console.log(`📈 统计信息:`);
    console.log(`   - 总角色数: ${Object.keys(characterMap).length}`);
    console.log(`   - 有中文翻译: ${Object.values(characterMap).filter(c => c.hasChineseTranslation).length}`);
    console.log(`   - 缺少翻译: ${Object.values(characterMap).filter(c => !c.hasChineseTranslation).length}`);
    
    // 可以在这里保存到文件
    // const fs = require('fs');
    // fs.writeFileSync('character-mapping.json', JSON.stringify(staticMapping, null, 2));
    // console.log('💾 映射文件已保存到 character-mapping.json');
  } else {
    console.log('❌ 测试失败，无法获取角色映射数据');
  }
}

// 运行测试
main().catch(console.error);

export { fetchCharacterMap, testSpecificCharacters, generateStaticMapping };
