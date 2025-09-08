/**
 * 调试永恒轮回中文语言包API - 处理外部文件链接
 * 检查API返回的l10Path链接并下载实际翻译数据
 */

const ER_API_KEY = process.env.ER_API_KEY || '2nrZ0MisoZ1UlOQ0Fr3Gm2pWQ4SlCqOw9JO46ZNW';
const ER_API_BASE_URL = 'https://open-api.bser.io';

async function debugL10nAPIWithFile() {
  try {
    console.log('🔍 调试中文语言包API（包含文件下载）...');
    
    // 第一步：获取语言包链接
    const response = await fetch(`${ER_API_BASE_URL}/v1/l10n/ChineseSimplified`, {
      headers: { 'x-api-key': ER_API_KEY }
    });

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`);
    }

    const data = await response.json();
    console.log('📊 API响应结构:');
    console.log(`   - code: ${data.code}`);
    console.log(`   - message: ${data.message}`);
    console.log(`   - l10Path: ${data.data.l10Path}`);
    
    // 第二步：从l10Path下载实际翻译文件
    const fileUrl = data.data.l10Path;
    console.log(`\n📥 从外部链接下载翻译文件: ${fileUrl}`);
    
    const fileResponse = await fetch(fileUrl);
    
    if (!fileResponse.ok) {
      throw new Error(`文件下载失败: ${fileResponse.status}`);
    }
    
    const fileContent = await fileResponse.text();
    console.log(`📄 文件内容长度: ${fileContent.length} 字符`);
    
    // 尝试解析文件内容
    try {
      const translations = JSON.parse(fileContent);
      const keys = Object.keys(translations);
      console.log(`📚 解析成功！翻译条目数量: ${keys.length}`);
      
      // 查找角色相关的键
      const characterKeys = keys.filter(key => key.includes('Character'));
      console.log(`🎭 角色相关键数量: ${characterKeys.length}`);
      
      if (characterKeys.length > 0) {
        console.log('📋 前10个角色键:');
        characterKeys.slice(0, 10).forEach(key => {
          console.log(`     - ${key}: ${translations[key]}`);
        });
        
        // 测试特定角色的翻译
        console.log('\n🎯 测试特定角色翻译:');
        const testIds = [1, 2, 3, 10, 20, 30];
        testIds.forEach(id => {
          const key = `Character/Name/${id}`;
          const translation = translations[key];
          console.log(`   ID ${id}: ${key} -> ${translation || '未找到'}`);
        });
      }
      
      return translations;
      
    } catch (parseError) {
      console.log('❌ JSON解析失败，尝试其他格式...');
      console.log('📄 文件内容预览（前500字符）:');
      console.log(fileContent.substring(0, 500));
      
      // 可能是其他格式，比如键值对格式
      const lines = fileContent.split('\n').filter(line => line.trim());
      console.log(`📄 文件行数: ${lines.length}`);
      
      if (lines.length > 0) {
        console.log('📋 前10行内容:');
        lines.slice(0, 10).forEach((line, index) => {
          console.log(`     ${index + 1}: ${line}`);
        });
      }
      
      return null;
    }
    
  } catch (error) {
    console.error('❌ 调试API时出错:', error);
    return null;
  }
}

async function testCharacterMappingWithFile() {
  console.log('\n🎮 测试完整的角色映射流程...');
  
  try {
    // 获取角色数据
    const characterResponse = await fetch(`${ER_API_BASE_URL}/v2/data/Character`, {
      headers: { 'x-api-key': ER_API_KEY }
    });
    
    if (!characterResponse.ok) {
      throw new Error(`角色API请求失败: ${characterResponse.status}`);
    }
    
    const characterData = await characterResponse.json();
    const characters = characterData.data || [];
    console.log(`📊 获取到 ${characters.length} 个角色`);
    
    // 获取翻译数据
    const translations = await debugL10nAPIWithFile();
    
    if (translations) {
      // 组合数据
      const characterMap = {};
      let successCount = 0;
      
      for (const character of characters) {
        const characterId = character.code;
        const translationKey = `Character/Name/${characterId}`;
        const chineseName = translations[translationKey];
        
        if (characterId && character.name) {
          characterMap[characterId] = {
            id: characterId,
            englishName: character.name,
            chineseName: chineseName || character.name,
            hasChineseTranslation: !!chineseName
          };
          
          if (chineseName) {
            successCount++;
          }
        }
      }
      
      console.log(`\n🎉 角色映射完成！`);
      console.log(`📈 统计信息:`);
      console.log(`   - 总角色数: ${Object.keys(characterMap).length}`);
      console.log(`   - 有中文翻译: ${successCount}`);
      console.log(`   - 缺少翻译: ${Object.keys(characterMap).length - successCount}`);
      
      // 显示一些成功的映射
      const successfulMappings = Object.values(characterMap).filter(c => c.hasChineseTranslation);
      if (successfulMappings.length > 0) {
        console.log('\n✅ 成功映射的角色示例:');
        successfulMappings.slice(0, 10).forEach(char => {
          console.log(`   ID ${char.id}: ${char.englishName} -> ${char.chineseName}`);
        });
      }
      
      return characterMap;
    }
    
  } catch (error) {
    console.error('❌ 测试角色映射时出错:', error);
    return null;
  }
}

// 运行调试
testCharacterMappingWithFile().catch(console.error);

