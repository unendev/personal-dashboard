import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkData() {
  try {
    console.log('====================================')
    console.log('📊 数据库数据检查')
    console.log('====================================\n')

    // 1. 检查TimerTask数据
    console.log('【计时器任务 - TimerTask】')
    const timerTasks = await prisma.timerTask.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        instanceTags: {
          include: {
            instanceTag: true
          }
        }
      }
    })
    
    console.log(`总数: ${await prisma.timerTask.count()}`)
    console.log('\n最近10条记录:')
    timerTasks.forEach((task, i) => {
      console.log(`\n${i + 1}. ${task.name}`)
      console.log(`   分类: ${task.categoryPath}`)
      console.log(`   时长: ${Math.floor(task.elapsedTime / 60)}分${task.elapsedTime % 60}秒 (${task.elapsedTime}秒)`)
      console.log(`   日期: ${task.date}`)
      console.log(`   状态: ${task.isRunning ? '运行中' : '已停止'}`)
      console.log(`   标签: ${task.instanceTags.map(t => t.instanceTag.name).join(', ') || '无'}`)
      console.log(`   创建: ${task.createdAt.toLocaleString('zh-CN')}`)
    })

    // 2. 按日期聚合统计
    console.log('\n\n【按日期统计】')
    const tasksByDate = await prisma.timerTask.groupBy({
      by: ['date'],
      _sum: {
        elapsedTime: true
      },
      _count: true,
      orderBy: {
        date: 'desc'
      },
      take: 10
    })
    
    tasksByDate.forEach(stat => {
      const hours = Math.floor((stat._sum.elapsedTime || 0) / 3600)
      const minutes = Math.floor(((stat._sum.elapsedTime || 0) % 3600) / 60)
      console.log(`${stat.date}: ${stat._count}个任务, 总时长 ${hours}h ${minutes}m (${stat._sum.elapsedTime}秒)`)
    })

    // 3. 按分类聚合统计
    console.log('\n\n【按分类统计 - 最近30天】')
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const dateStr = thirtyDaysAgo.toISOString().split('T')[0]
    
    const tasksByCategory = await prisma.timerTask.groupBy({
      by: ['categoryPath'],
      where: {
        date: {
          gte: dateStr
        }
      },
      _sum: {
        elapsedTime: true
      },
      _count: true,
      orderBy: {
        _sum: {
          elapsedTime: 'desc'
        }
      },
      take: 10
    })
    
    tasksByCategory.forEach(stat => {
      const hours = Math.floor((stat._sum.elapsedTime || 0) / 3600)
      const minutes = Math.floor(((stat._sum.elapsedTime || 0) % 3600) / 60)
      console.log(`${stat.categoryPath}: ${stat._count}个任务, 总时长 ${hours}h ${minutes}m`)
    })

    // 4. 检查AI总结数据
    console.log('\n\n【AI总结 - AISummary】')
    const aiSummaries = await prisma.aISummary.findMany({
      take: 5,
      orderBy: { date: 'desc' }
    })
    
    console.log(`总数: ${await prisma.aISummary.count()}`)
    if (aiSummaries.length > 0) {
      console.log('\n最近5条:')
      aiSummaries.forEach((summary, i) => {
        console.log(`\n${i + 1}. ${summary.date}`)
        console.log(`   总时长: ${Math.floor(summary.totalTime / 3600)}h ${Math.floor((summary.totalTime % 3600) / 60)}m`)
        console.log(`   任务数: ${summary.taskCount}`)
        console.log(`   摘要: ${summary.summary.substring(0, 100)}...`)
      })
    } else {
      console.log('暂无AI总结数据')
    }

    // 5. 检查操作记录
    console.log('\n\n【操作记录 - OperationRecord】')
    const operations = await prisma.operationRecord.findMany({
      take: 10,
      orderBy: { timestamp: 'desc' }
    })
    
    console.log(`总数: ${await prisma.operationRecord.count()}`)
    if (operations.length > 0) {
      console.log('\n最近10条:')
      operations.forEach((op, i) => {
        console.log(`${i + 1}. [${op.action}] ${op.taskName} - ${op.timestamp.toLocaleString('zh-CN')}`)
        if (op.details) console.log(`   详情: ${op.details}`)
      })
    } else {
      console.log('暂无操作记录')
    }

    // 6. 检查事务项标签
    console.log('\n\n【事务项标签 - InstanceTag】')
    const instanceTags = await prisma.instanceTag.findMany({
      include: {
        _count: {
          select: { timerTasks: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })
    
    console.log(`总数: ${await prisma.instanceTag.count()}`)
    if (instanceTags.length > 0) {
      console.log('\n标签列表:')
      instanceTags.forEach((tag, i) => {
        console.log(`${i + 1}. ${tag.name} - 使用${tag._count.timerTasks}次`)
      })
    } else {
      console.log('暂无事务项标签')
    }

    // 7. 整体统计
    console.log('\n\n【整体数据概览】')
    const totalTasks = await prisma.timerTask.count()
    const totalTime = await prisma.timerTask.aggregate({
      _sum: {
        elapsedTime: true
      }
    })
    const totalHours = Math.floor((totalTime._sum.elapsedTime || 0) / 3600)
    const totalMinutes = Math.floor(((totalTime._sum.elapsedTime || 0) % 3600) / 60)
    
    console.log(`📌 总任务数: ${totalTasks}`)
    console.log(`⏱️  总时长: ${totalHours}小时 ${totalMinutes}分钟`)
    console.log(`📅 记录天数: ${tasksByDate.length}`)
    console.log(`🏷️  分类数: ${tasksByCategory.length}`)
    console.log(`💡 AI总结数: ${await prisma.aISummary.count()}`)
    console.log(`📝 操作记录数: ${await prisma.operationRecord.count()}`)
    
    console.log('\n====================================')
    console.log('✅ 数据检查完成')
    console.log('====================================\n')

  } catch (error) {
    console.error('❌ 数据检查失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkData()

