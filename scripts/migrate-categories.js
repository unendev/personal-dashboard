import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function migrateCategories() {
  try {
    console.log('开始迁移分类数据...');
    
    // 读取现有的 JSON 文件
    const jsonPath = path.join(__dirname, '..', 'data', 'log-categories.json');
    const fileContents = await fs.readFile(jsonPath, 'utf8');
    const categories = JSON.parse(fileContents);
    
    console.log('读取到的分类数据:', categories);
    
    // 清空现有数据
    await prisma.logCategory.deleteMany({});
    console.log('已清空现有分类数据');
    
    // 迁移数据
    for (const topCategory of categories) {
      // 创建顶级分类
      const topCategoryRecord = await prisma.logCategory.create({
        data: {
          name: topCategory.name,
          parentId: null
        }
      });
      
      console.log(`创建顶级分类: ${topCategory.name}`);
      
      if (topCategory.children) {
        for (const midCategory of topCategory.children) {
          // 创建中级分类
          const midCategoryRecord = await prisma.logCategory.create({
            data: {
              name: midCategory.name,
              parentId: topCategoryRecord.id
            }
          });
          
          console.log(`创建中级分类: ${midCategory.name} (父级: ${topCategory.name})`);
          
          if (midCategory.children) {
            for (const subCategory of midCategory.children) {
              // 创建子分类
              await prisma.logCategory.create({
                data: {
                  name: subCategory.name,
                  parentId: midCategoryRecord.id
                }
              });
              
              console.log(`创建子分类: ${subCategory.name} (父级: ${midCategory.name})`);
            }
          }
        }
      }
    }
    
    console.log('分类数据迁移完成！');
    
    // 验证迁移结果
    const allCategories = await prisma.logCategory.findMany({
      include: {
        children: {
          include: {
            children: true
          }
        }
      },
      where: {
        parentId: null
      }
    });
    
    console.log('迁移后的分类结构:', JSON.stringify(allCategories, null, 2));
    
  } catch (error) {
    console.error('迁移失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateCategories();
