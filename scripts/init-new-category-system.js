import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 新的分类体系数据
const newCategories = [
  {
    name: '个人成长',
    children: [
      {
        name: '技能学习',
        children: []
      },
      {
        name: '灵感源泉',
        children: []
      },
      {
        name: '深度思考',
        children: []
      },
      {
        name: '身体锻炼',
        children: []
      }
    ]
  },
  {
    name: '工作',
    children: [
      {
        name: '学术任务',
        children: []
      },
      {
        name: '开发任务',
        children: []
      }
    ]
  },
  {
    name: '娱乐',
    children: [
      {
        name: '游戏',
        children: []
      },
      {
        name: '影视',
        children: []
      },
      {
        name: '漫画/网文',
        children: []
      },
      {
        name: '冲浪',
        children: []
      }
    ]
  },
  {
    name: '时间黑洞',
    children: [
      {
        name: '日常琐事',
        children: []
      },
      {
        name: '工程琐事',
        children: []
      },
      {
        name: '被动事务',
        children: []
      }
    ]
  }
];

// 示例事务项
const sampleInstanceTags = [
  '#个人门户',
  '#修Bug',
  '#论文写作',
  '#研究现状',
  '#Docker',
  '#React',
  '#前端',
  '#漫画',
  '#一人之下',
  '#周计划',
  '#环境配置',
  '#日语N1',
  '#反派家族反对独立'
];

async function initNewCategorySystem() {
  try {
    console.log('开始初始化新的分类体系...');

    // 1. 清除现有的分类数据
    console.log('清除现有分类数据...');
    await prisma.logCategory.deleteMany({});
    
    // 2. 创建新的分类体系
    console.log('创建新的分类体系...');
    for (const topCategory of newCategories) {
      const createdTopCategory = await prisma.logCategory.create({
        data: {
          name: topCategory.name,
          children: {
            create: topCategory.children.map(midCategory => ({
              name: midCategory.name,
              children: {
                create: midCategory.children.map(subCategory => ({
                  name: subCategory.name
                }))
              }
            }))
          }
        }
      });
      console.log(`创建顶级分类: ${createdTopCategory.name}`);
    }

    // 3. 创建示例事务项
    console.log('创建示例事务项...');
    const userId = 'user-1'; // 使用默认用户ID
    
    for (const tagName of sampleInstanceTags) {
      try {
        await prisma.instanceTag.create({
          data: {
            name: tagName,
            userId: userId
          }
        });
        console.log(`创建事务项: ${tagName}`);
      } catch (error) {
        if (error.code === 'P2002') {
          console.log(`事务项已存在: ${tagName}`);
        } else {
          console.error(`创建事务项失败: ${tagName}`, error);
        }
      }
    }

    console.log('新分类体系初始化完成！');
    
    // 4. 验证创建结果
    const categories = await prisma.logCategory.findMany({
      include: {
        children: {
          include: {
            children: true
          }
        }
      }
    });
    
    console.log('\n创建的分类体系:');
    categories.forEach(topCategory => {
      console.log(`- ${topCategory.name}`);
      topCategory.children.forEach(midCategory => {
        console.log(`  - ${midCategory.name}`);
        midCategory.children.forEach(subCategory => {
          console.log(`    - ${subCategory.name}`);
        });
      });
    });

    const instanceTags = await prisma.instanceTag.findMany({
      where: { userId: userId }
    });
    
    console.log('\n创建的事务项:');
    instanceTags.forEach(tag => {
      console.log(`- ${tag.name}`);
    });

  } catch (error) {
    console.error('初始化失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

initNewCategorySystem();
