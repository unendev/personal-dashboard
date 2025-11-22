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
      }),
      prisma.treasure.create({
        data: {
          title: 'React Server Components 学习',
          content: 'RSC 真的是一个范式转变。通过在服务器端渲染组件，我们可以：\n- 直接访问数据库，无需额外的 API 层\n- 减少客户端 JS 包大小\n- 提升首屏加载性能\n- 保持组件树的序列化能力\n\n但需要注意客户端和服务端组件的边界，这需要新的思维方式。',
          type: 'TEXT',
          tags: ['React', '学习笔记', '前端开发', 'Next.js'],
          userId: demoUser.id,
          theme: 'blue'
        }
      }),
      prisma.treasure.create({
        data: {
          title: 'TypeScript 类型体操心得',
          content: '深入学习了 TypeScript 的高级类型，收获很大：\n\n```typescript\ntype DeepReadonly<T> = {\n  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P]\n}\n```\n\n通过映射类型和条件类型的组合，可以实现很多强大的类型工具。类型系统不仅能帮助我们避免错误，还能作为文档帮助理解代码。',
          type: 'TEXT',
          tags: ['TypeScript', '学习笔记', '编程'],
          userId: demoUser.id,
          theme: 'purple'
        }
      }),
      prisma.treasure.create({
        data: {
          title: '性能优化实战',
          content: '今天优化了列表渲染性能，从 FPS 30 提升到 60：\n\n1. 使用虚拟滚动 (react-virtual)\n2. React.memo 包裹列表项\n3. useCallback 缓存事件处理函数\n4. 分离不变的配置到组件外部\n5. 懒加载图片资源\n\n关键是要先分析性能瓶颈，不要过早优化。Chrome DevTools 的 Performance 面板是好帮手！',
          type: 'TEXT',
          tags: ['性能优化', '前端开发', 'React', '最佳实践'],
          userId: demoUser.id,
          theme: 'orange'
        }
      }),
      prisma.treasure.create({
        data: {
          title: '数据库索引优化',
          content: '这周优化了慢查询，学到了索引的重要性：\n\n- 为经常查询的字段添加索引\n- 联合索引要注意最左匹配原则\n- 避免在索引字段上使用函数\n- 定期分析 EXPLAIN 结果\n\n一个好的索引策略能让查询速度提升 100 倍！但也要注意索引会占用存储空间，写入时也有额外开销。',
          type: 'TEXT',
          tags: ['数据库', '性能优化', '后端开发', 'SQL'],
          userId: demoUser.id,
          theme: 'green'
        }
      }),
      prisma.treasure.create({
        data: {
          title: 'Git 工作流最佳实践',
          content: '团队协作中总结的 Git 规范：\n\n**分支管理**\n- main: 生产环境\n- develop: 开发主分支\n- feature/*: 功能分支\n- hotfix/*: 紧急修复\n\n**提交规范**\n- feat: 新功能\n- fix: 修复 bug\n- docs: 文档更新\n- refactor: 重构\n- test: 测试相关\n\n清晰的提交历史就是最好的文档！',
          type: 'TEXT',
          tags: ['Git', '团队协作', '最佳实践', '工作'],
          userId: demoUser.id,
          theme: 'red'
        }
      }),
      prisma.treasure.create({
        data: {
          title: 'CSS 布局技巧',
          content: '现代 CSS 布局的几个强大工具：\n\n1. **Flexbox**: 一维布局的完美选择\n2. **Grid**: 二维布局首选\n3. **Container Queries**: 组件级响应式设计\n4. **Subgrid**: 跨层级的网格对齐\n\n特别推荐使用 Grid 的 grid-template-areas，可以让布局代码非常直观易读。',
          type: 'TEXT',
          tags: ['CSS', '前端开发', '学习笔记', '布局'],
          userId: demoUser.id,
          theme: 'pink'
        }
      }),
      prisma.treasure.create({
        data: {
          title: '阅读《代码整洁之道》',
          content: '重读了这本经典，有了新的理解：\n\n"代码的可读性比聪明更重要"\n\n- 函数要短小，只做一件事\n- 变量命名要有意义，避免缩写\n- 注释应该解释"为什么"，而不是"是什么"\n- 错误处理要优雅，不要吞掉异常\n\n写代码不仅是给机器看的，更是给人看的。',
          type: 'TEXT',
          tags: ['阅读', '编程思想', '最佳实践', '学习'],
          userId: demoUser.id,
          theme: 'yellow'
        }
      }),
      prisma.treasure.create({
        data: {
          title: '健康作息的重要性',
          content: '最近调整了作息，感觉整个人都不一样了：\n\n早睡早起 + 规律运动 = 高效工作\n\n具体做法：\n- 23:00 前睡觉，7:00 起床\n- 早上跑步 30 分钟\n- 番茄工作法，工作 25 分钟休息 5 分钟\n- 下午 4 点来杯咖啡\n- 晚上不看手机\n\n身体是革命的本钱，要好好照顾自己！',
          type: 'TEXT',
          tags: ['生活', '健康', '习惯养成', '自我提升'],
          userId: demoUser.id,
          theme: 'green'
        }
      }),
      prisma.treasure.create({
        data: {
          title: '学会说"不"',
          content: '今天拒绝了一个不合理的需求，虽然有压力但感觉很好。\n\n作为开发者，要学会：\n- 评估需求的合理性和优先级\n- 说明技术限制和风险\n- 提供替代方案\n- 坚持原则，不妥协质量\n\n说"不"不是拒绝合作，而是对项目负责。专业的态度需要勇气和智慧。',
          type: 'TEXT',
          tags: ['工作', '职场', '思考', '成长'],
          userId: demoUser.id,
          theme: 'orange'
        }
      }),
      prisma.treasure.create({
        data: {
          title: '持续学习的方法',
          content: '分享我的学习方法论：\n\n**1. 主动学习**\n- 设定具体目标\n- 动手实践项目\n- 写技术博客总结\n\n**2. 建立知识体系**\n- 使用思维导图\n- 定期复习笔记\n- 关联新旧知识\n\n**3. 保持好奇心**\n- 关注技术动态\n- 参与开源项目\n- 和同行交流\n\n学习是终身的事业！',
          type: 'TEXT',
          tags: ['学习', '方法论', '自我提升', '成长'],
          userId: demoUser.id,
          theme: 'blue'
        }
      }),
      prisma.treasure.create({
        data: {
          title: 'Prisma ORM 使用心得',
          content: 'Prisma 真的太好用了！相比传统 ORM：\n\n**优点**\n- 类型安全的查询\n- 直观的 Schema 定义\n- 强大的迁移工具\n- 优秀的开发体验\n\n**最佳实践**\n```typescript\nconst user = await prisma.user.findUnique({\n  where: { email },\n  include: { posts: true }\n})\n```\n\n自动补全 + 类型检查 = 开发效率飙升！',
          type: 'TEXT',
          tags: ['Prisma', '数据库', 'ORM', '后端开发'],
          userId: demoUser.id,
          theme: 'purple'
        }
      }),
      prisma.treasure.create({
        data: {
          title: '时间管理的艺术',
          content: '这个月尝试了 GTD (Getting Things Done) 方法：\n\n**核心原则**\n1. 收集：记录所有待办\n2. 处理：分类整理\n3. 组织：安排优先级\n4. 回顾：定期检查\n5. 执行：专注完成\n\n配合工具：\n- Notion 管理任务\n- Calendar 安排日程\n- Pomodoro 专注工作\n\n时间是最宝贵的资源！',
          type: 'TEXT',
          tags: ['时间管理', 'GTD', '效率', '方法论'],
          userId: demoUser.id,
          theme: 'blue'
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

