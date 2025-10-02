import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DEMO_USER_EMAIL = 'demo@example.com'

async function seedDemoData() {
  try {
    // 获取示例用户
    const demoUser = await prisma.user.findUnique({
      where: { email: DEMO_USER_EMAIL }
    })

    if (!demoUser) {
      console.log('❌ 示例用户不存在，请先运行: npm run ensure-demo')
      process.exit(1)
    }

    console.log('✅ 找到示例用户:', demoUser.email)

    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    // 1. 创建待办事项
    console.log('📝 创建待办事项...')
    const now = Math.floor(Date.now() / 1000) // 转换为秒级时间戳
    const todos = await Promise.all([
      prisma.todo.create({
        data: {
          text: '完成项目演示文档',
          completed: true,
          createdAtUnix: now - 7200, // 2小时前
          priority: 'high',
          category: '工作',
          userId: demoUser.id,
          date: today,
          order: 0
        }
      }),
      prisma.todo.create({
        data: {
          text: '准备周会分享',
          completed: false,
          createdAtUnix: now - 3600, // 1小时前
          priority: 'medium',
          category: '工作',
          userId: demoUser.id,
          date: today,
          order: 1
        }
      }),
      prisma.todo.create({
        data: {
          text: '阅读《代码整洁之道》第3章',
          completed: false,
          createdAtUnix: now - 1800, // 30分钟前
          priority: 'low',
          category: '学习',
          userId: demoUser.id,
          date: today,
          order: 2
        }
      })
    ])
    console.log(`  ✓ 创建了 ${todos.length} 个待办事项`)

    // 2. 创建计时任务
    console.log('⏱️  创建计时任务...')
    const timerTasks = await Promise.all([
      prisma.timerTask.create({
        data: {
          name: '编写项目文档',
          categoryPath: '工作 > 文档',
          elapsedTime: 3600,
          initialTime: 0,
          isRunning: false,
          date: today,
          userId: demoUser.id,
          order: 0
        }
      }),
      prisma.timerTask.create({
        data: {
          name: '代码审查',
          categoryPath: '工作 > 开发',
          elapsedTime: 1800,
          initialTime: 0,
          isRunning: false,
          date: today,
          userId: demoUser.id,
          order: 1
        }
      }),
      prisma.timerTask.create({
        data: {
          name: '学习React新特性',
          categoryPath: '学习 > 前端开发',
          elapsedTime: 2400,
          initialTime: 0,
          isRunning: false,
          date: yesterday,
          userId: demoUser.id,
          order: 0
        }
      })
    ])
    console.log(`  ✓ 创建了 ${timerTasks.length} 个计时任务`)

    // 3. 创建宝藏
    console.log('💎 创建宝藏...')
    const treasures = await Promise.all([
      prisma.treasure.create({
        data: {
          title: '编程感悟',
          content: '今天突然理解了闭包的本质：它不仅仅是函数和词法环境的组合，更是一种优雅的状态封装方式。通过闭包，我们可以创建私有变量，实现数据隐藏，这是函数式编程的魅力所在。',
          type: 'TEXT',
          tags: ['编程', '学习笔记', 'JavaScript'],
          userId: demoUser.id,
          theme: 'purple'
        }
      }),
      prisma.treasure.create({
        data: {
          title: '生活随想',
          content: '工作和生活的平衡就像是走钢丝，需要不断调整重心。今天决定每周至少空出两个晚上陪家人，周末留给自己充电学习。效率不在于时间长短，而在于专注度。',
          type: 'TEXT',
          tags: ['生活', '感悟', '时间管理'],
          userId: demoUser.id,
          theme: 'blue'
        }
      }),
      prisma.treasure.create({
        data: {
          title: '项目复盘',
          content: '这次重构项目的经验：\n1. 先写测试用例，确保核心逻辑不变\n2. 小步快跑，每次只重构一个模块\n3. Code Review很重要，团队的眼睛能发现盲点\n4. 文档要同步更新，未来的自己会感谢现在的你',
          type: 'TEXT',
          tags: ['工作', '复盘', '项目管理'],
          userId: demoUser.id,
          theme: 'green'
        }
      })
    ])
    console.log(`  ✓ 创建了 ${treasures.length} 个宝藏`)

    // 4. 为宝藏添加点赞
    console.log('❤️  添加点赞...')
    await prisma.treasureLike.create({
      data: {
        treasureId: treasures[0].id,
        userId: demoUser.id
      }
    })
    
    // 更新点赞数
    await prisma.treasure.update({
      where: { id: treasures[0].id },
      data: { likesCount: 1 }
    })
    console.log('  ✓ 添加了点赞')

    // 5. 创建操作记录
    console.log('📊 创建操作记录...')
    const operations = await Promise.all([
      prisma.operationRecord.create({
        data: {
          action: '创建任务',
          taskName: '编写项目文档',
          details: '分类: 工作 > 文档',
          userId: demoUser.id,
          timestamp: new Date(Date.now() - 7200000)
        }
      }),
      prisma.operationRecord.create({
        data: {
          action: '完成任务',
          taskName: '编写项目文档',
          details: '用时: 1小时',
          userId: demoUser.id,
          timestamp: new Date(Date.now() - 3600000)
        }
      }),
      prisma.operationRecord.create({
        data: {
          action: '创建宝藏',
          taskName: '编程感悟',
          details: '类型: 文字',
          userId: demoUser.id,
          timestamp: new Date(Date.now() - 1800000)
        }
      })
    ])
    console.log(`  ✓ 创建了 ${operations.length} 条操作记录`)

    console.log('\n✨ 演示数据创建成功！')
    console.log('📈 数据统计:')
    console.log(`  - 待办事项: ${todos.length}`)
    console.log(`  - 计时任务: ${timerTasks.length}`)
    console.log(`  - 宝藏: ${treasures.length}`)
    console.log(`  - 操作记录: ${operations.length}`)

  } catch (error) {
    console.error('❌ 创建演示数据失败:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

seedDemoData()

