import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// 分类结构数据
const categoriesData = [
  {
    name: "价值投资",
    children: [
      {
        name: "信息获取",
        children: [
          { name: "工作情报" }
        ]
      },
      {
        name: "核心工作",
        children: [
          { name: "开发任务" },
          { name: "学术任务" },
          { name: "深度思考" }
        ]
      },
      {
        name: "灵感源泉",
        children: [
          { name: "游戏" },
          { name: "网文" },
          { name: "音乐" },
          { name: "漫画" }
        ]
      }
    ]
  },
  {
    name: "精力补充",
    children: [
      {
        name: "纯粹娱乐",
        children: [
          { name: "影视" },
          { name: "游戏" },
          { name: "冲浪" },
          { name: "网文" }
        ]
      },
      {
        name: "身体锻炼",
        children: [
          { name: "游戏化运动" },
          { name: "涩涩" }
        ]
      }
    ]
  },
  {
    name: "时间黑洞",
    children: [
      {
        name: "杂事",
        children: [
          { name: "工程琐事" },
          { name: "日常杂项" },
          { name: "前置" }
        ]
      }
    ]
  }
];

async function createCategories() {
  try {
    console.log('开始创建分类结构...');
    
    // 先清空现有分类
    await prisma.logCategory.deleteMany({});
    console.log('已清空现有分类');
    
    // 创建分类映射
    const categoryMap = new Map();
    
    // 第一遍：创建所有分类
    for (const topCategory of categoriesData) {
      const topCategoryRecord = await prisma.logCategory.create({
        data: {
          name: topCategory.name,
          parentId: null
        }
      });
      categoryMap.set(topCategory.name, topCategoryRecord.id);
      console.log(`创建顶级分类: ${topCategory.name}`);
      
      if (topCategory.children) {
        for (const midCategory of topCategory.children) {
          const midCategoryRecord = await prisma.logCategory.create({
            data: {
              name: midCategory.name,
              parentId: topCategoryRecord.id
            }
          });
          categoryMap.set(`${topCategory.name}/${midCategory.name}`, midCategoryRecord.id);
          console.log(`创建中类分类: ${topCategory.name}/${midCategory.name}`);
          
          if (midCategory.children) {
            for (const subCategory of midCategory.children) {
              const subCategoryRecord = await prisma.logCategory.create({
                data: {
                  name: subCategory.name,
                  parentId: midCategoryRecord.id
                }
              });
              categoryMap.set(`${topCategory.name}/${midCategory.name}/${subCategory.name}`, subCategoryRecord.id);
              console.log(`创建子类分类: ${topCategory.name}/${midCategory.name}/${subCategory.name}`);
            }
          }
        }
      }
    }
    
    console.log('分类结构创建完成！');
    console.log('总共创建了', categoryMap.size, '个分类');
    
  } catch (error) {
    console.error('创建分类失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createCategories();
