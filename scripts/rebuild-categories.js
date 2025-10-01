import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('开始重建分类数据...')

  // 清理现有数据
  await prisma.logCategory.deleteMany()
  console.log('清理现有分类数据')

  // 新的分类结构（基于用户提供的已知分类）
  const newCategories = [
    {
      name: '工作',
      children: ['品牌', '折腾', '资产']
    },
    {
      name: '价值投资',
      children: ['身体锻炼', '灵感源泉', '技能学习', '深度思考']
    },
    {
      name: '时间黑洞',
      children: ['日常琐事', '工程琐事', '学术任务']
    }
  ]

  // 递归插入分类
  for (const topCategory of newCategories) {
    const top = await prisma.logCategory.create({
      data: {
        name: topCategory.name
      }
    })
    console.log(`✓ 创建顶级分类: ${topCategory.name}`)

    // 插入子分类
    for (const childName of topCategory.children) {
      await prisma.logCategory.create({
        data: {
          name: childName,
          parentId: top.id
        }
      })
      console.log(`  ✓ 创建子分类: ${topCategory.name}/${childName}`)
    }
  }

  // 获取数据库中所有已使用的 categoryPath 进行分析
  const tasks = await prisma.timerTask.findMany({
    select: {
      categoryPath: true
    },
    distinct: ['categoryPath']
  })

  console.log('\n📊 数据库中已使用的 categoryPath:')
  const usedPaths = new Set()
  tasks.forEach(task => {
    if (task.categoryPath) {
      usedPaths.add(task.categoryPath)
      console.log(`  - ${task.categoryPath}`)
    }
  })

  // 分析是否有未覆盖的分类
  console.log('\n🔍 分析未覆盖的分类路径...')
  const definedPaths = new Set()
  newCategories.forEach(top => {
    top.children.forEach(child => {
      definedPaths.add(`${top.name}/${child}`)
    })
  })

  const uncoveredPaths = [...usedPaths].filter(path => !definedPaths.has(path))
  if (uncoveredPaths.length > 0) {
    console.log('⚠️  以下路径在新分类中未定义，可能需要手动调整:')
    uncoveredPaths.forEach(path => console.log(`  - ${path}`))
  } else {
    console.log('✅ 所有已使用的路径都已覆盖')
  }

  console.log('\n✅ 分类数据重建完成!')
}

main()
  .catch((e) => {
    console.error('❌ 重建分类数据失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

