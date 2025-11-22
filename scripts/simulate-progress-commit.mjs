import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 模拟LLM生成commit message的逻辑
function generateCommitMessage(stats) {
  const { totalTime, categories, topTasks, wastedTime, productiveTime } = stats
  
  const hours = Math.floor(totalTime / 3600)
  const productiveHours = Math.floor(productiveTime / 3600)
  const wasteHours = Math.floor(wastedTime / 3600)
  
  // 找出最大的分类
  const topCategory = Object.entries(categories)
    .sort((a, b) => b[1] - a[1])[0]
  
  const topCategoryHours = Math.floor(topCategory[1] / 3600)
  
  let message = `本周投入${hours}小时，高效时间${productiveHours}h`
  
  if (topCategoryHours > 5) {
    message += `。主要专注于${topCategory[0]}(${topCategoryHours}h)`
  }
  
  if (wasteHours > 0) {
    const wastePercent = Math.round(wasteHours / hours * 100)
    if (wastePercent > 30) {
      message += `，但时间黑洞较多(${wasteHours}h, ${wastePercent}%)，需注意`
    } else if (wastePercent < 20) {
      message += `，时间黑洞控制良好(${wasteHours}h, ${wastePercent}%)`
    }
  }
  
  return message
}

// 评估长期目标进度
function evaluateGoal(allTimeStats, goal) {
  const achieved = {}
  const gaps = []
  
  Object.entries(goal.targets).forEach(([category, targetHours]) => {
    const actualHours = Math.floor((allTimeStats.categories[category] || 0) / 3600)
    const progress = Math.round(actualHours / targetHours * 100)
    achieved[category] = { actualHours, targetHours, progress }
    
    if (progress < 50) {
      gaps.push(`${category}: ${actualHours}h/${targetHours}h (${progress}%)`)
    }
  })
  
  const totalProgress = Object.values(achieved).reduce((sum, v) => sum + v.progress, 0) / Object.keys(goal.targets).length
  
  return { totalProgress: Math.round(totalProgress), achieved, gaps }
}

async function simulateUsage() {
  try {
    console.log('🎯 进度Commit系统 - 使用效果模拟\n')
    console.log('=' .repeat(60))
    
    // 加载数据
    const allTasks = await prisma.timerTask.findMany({
      orderBy: { date: 'desc' }
    })
    
    // ========================================
    // 场景1: 每周自动生成的Commit
    // ========================================
    console.log('\n【场景1：每周日晚上23:00自动生成】\n')
    
    const weeks = [
      { start: '2025-09-23', end: '2025-09-29' },
      { start: '2025-09-30', end: '2025-10-06' }
    ]
    
    weeks.forEach((week, i) => {
      const weekTasks = allTasks.filter(t => t.date >= week.start && t.date <= week.end)
      
      if (weekTasks.length === 0) return
      
      const categories = {}
      let totalTime = 0
      let productiveTime = 0
      let wastedTime = 0
      
      weekTasks.forEach(task => {
        totalTime += task.elapsedTime
        
        if (!categories[task.categoryPath]) {
          categories[task.categoryPath] = 0
        }
        categories[task.categoryPath] += task.elapsedTime
        
        // 识别高效时间
        if (task.categoryPath.includes('个人成长') || task.categoryPath.includes('工作')) {
          productiveTime += task.elapsedTime
        }
        
        // 识别时间黑洞
        if (task.categoryPath.includes('时间黑洞')) {
          wastedTime += task.elapsedTime
        }
      })
      
      const topTasks = weekTasks
        .sort((a, b) => b.elapsedTime - a.elapsedTime)
        .slice(0, 3)
        .map(t => ({ name: t.name, hours: Math.floor(t.elapsedTime / 3600) }))
      
      const message = generateCommitMessage({ 
        totalTime, 
        categories, 
        topTasks, 
        wastedTime, 
        productiveTime 
      })
      
      console.log(`📅 Week ${i + 1} (${week.start} ~ ${week.end})`)
      console.log(`   Commit: "${message}"`)
      console.log(`   任务数: ${weekTasks.length}`)
      console.log(`   活跃天数: ${new Set(weekTasks.map(t => t.date)).size}天`)
      
      // 显示你可能补充的内容
      if (i === 0) {
        console.log(`   👤 [你补充]: "这周状态不错，深度工作时间多"`)
      } else {
        console.log(`   👤 [你补充]: "周末放松过度，下周控制娱乐时间"`)
      }
      console.log()
    })
    
    // ========================================
    // 场景2: 分类进度追踪
    // ========================================
    console.log('\n' + '='.repeat(60))
    console.log('\n【场景2：查看"个人成长"路径的累积进度】\n')
    
    const growthCategories = {}
    allTasks.forEach(task => {
      if (task.categoryPath.includes('个人成长')) {
        if (!growthCategories[task.categoryPath]) {
          growthCategories[task.categoryPath] = { time: 0, count: 0 }
        }
        growthCategories[task.categoryPath].time += task.elapsedTime
        growthCategories[task.categoryPath].count++
      }
    })
    
    Object.entries(growthCategories)
      .sort((a, b) => b[1].time - a[1].time)
      .forEach(([category, stats]) => {
        const hours = Math.floor(stats.time / 3600)
        let level = '入门'
        let nextMilestone = 10
        
        if (hours >= 50) {
          level = '精通'
          nextMilestone = 100
        } else if (hours >= 20) {
          level = '熟练'
          nextMilestone = 50
        } else if (hours >= 10) {
          level = '进阶'
          nextMilestone = 20
        }
        
        const progress = Math.round(hours / nextMilestone * 100)
        const remaining = nextMilestone - hours
        
        console.log(`🎯 ${category}`)
        console.log(`   等级: ${level} (${hours}小时)`)
        console.log(`   进度: ${'█'.repeat(Math.floor(progress/10))}${'░'.repeat(10-Math.floor(progress/10))} ${progress}%`)
        console.log(`   距离下一里程碑: 还需${remaining}小时`)
        console.log()
      })
    
    // ========================================
    // 场景3: 长期目标评估
    // ========================================
    console.log('\n' + '='.repeat(60))
    console.log('\n【场景3：评估"成为独立开发者"目标】\n')
    
    // 模拟一个目标
    const goal = {
      name: "成为独立开发者",
      targets: {
        "工作/折腾": 100,
        "个人成长/灵感源泉": 50,
        "个人成长/情报摄入": 30
      },
      maxWaste: 50
    }
    
    const allTimeCategories = {}
    allTasks.forEach(task => {
      if (!allTimeCategories[task.categoryPath]) {
        allTimeCategories[task.categoryPath] = 0
      }
      allTimeCategories[task.categoryPath] += task.elapsedTime
    })
    
    const evaluation = evaluateGoal({ categories: allTimeCategories }, goal)
    
    console.log(`📊 目标: ${goal.name}`)
    console.log(`   总体进度: ${evaluation.totalProgress}%`)
    console.log()
    
    Object.entries(goal.targets).forEach(([category, targetHours]) => {
      const actual = evaluation.achieved[category]
      const bar = '█'.repeat(Math.floor(actual.progress/5)) + '░'.repeat(20-Math.floor(actual.progress/5))
      const status = actual.progress >= 100 ? '✅' : actual.progress >= 50 ? '🟡' : '🔴'
      
      console.log(`${status} ${category}`)
      console.log(`   ${bar} ${actual.progress}%`)
      console.log(`   实际: ${actual.actualHours}h / 目标: ${targetHours}h`)
      console.log()
    })
    
    // 时间黑洞检查
    const wasteTotal = Math.floor((allTimeCategories['时间黑洞/日常琐事'] || 0 + allTimeCategories['时间黑洞/工程琐事'] || 0 + allTimeCategories['时间黑洞/学术工作'] || 0) / 3600)
    console.log(`⚠️  时间黑洞总计: ${wasteTotal}h / ${goal.maxWaste}h`)
    if (wasteTotal > goal.maxWaste) {
      console.log(`   ⚠️ 超出预期${wasteTotal - goal.maxWaste}小时，建议优化`)
    } else {
      console.log(`   ✅ 控制良好`)
    }
    
    // AI建议
    console.log(`\n💡 AI建议:`)
    if (evaluation.totalProgress > 80) {
      console.log(`   你已完成${evaluation.totalProgress}%，继续保持节奏即可达成目标`)
    } else if (evaluation.totalProgress > 50) {
      console.log(`   进度良好，建议加强以下领域：`)
      evaluation.gaps.forEach(gap => console.log(`   - ${gap}`))
    } else {
      console.log(`   进度较慢(${evaluation.totalProgress}%)，建议：`)
      console.log(`   1. 增加每日高效时间投入`)
      console.log(`   2. 减少时间黑洞类活动`)
      console.log(`   3. 重新评估目标可行性`)
    }
    
    // ========================================
    // 场景4: 趋势对比
    // ========================================
    console.log('\n\n' + '='.repeat(60))
    console.log('\n【场景4：本周 vs 上周对比】\n')
    
    const thisWeek = allTasks.filter(t => t.date >= '2025-09-30')
    const lastWeek = allTasks.filter(t => t.date >= '2025-09-23' && t.date < '2025-09-30')
    
    const thisWeekTime = thisWeek.reduce((sum, t) => sum + t.elapsedTime, 0)
    const lastWeekTime = lastWeek.reduce((sum, t) => sum + t.elapsedTime, 0)
    
    const thisWeekProductive = thisWeek.filter(t => 
      t.categoryPath.includes('个人成长') || t.categoryPath.includes('工作')
    ).reduce((sum, t) => sum + t.elapsedTime, 0)
    
    const lastWeekProductive = lastWeek.filter(t => 
      t.categoryPath.includes('个人成长') || t.categoryPath.includes('工作')
    ).reduce((sum, t) => sum + t.elapsedTime, 0)
    
    const timeDiff = thisWeekTime - lastWeekTime
    const productiveDiff = thisWeekProductive - lastWeekProductive
    
    console.log(`⏱️  总时长: ${Math.floor(thisWeekTime/3600)}h ${timeDiff > 0 ? '↑' : '↓'} ${Math.abs(Math.floor(timeDiff/3600))}h`)
    console.log(`✅ 高效时间: ${Math.floor(thisWeekProductive/3600)}h ${productiveDiff > 0 ? '↑' : '↓'} ${Math.abs(Math.floor(productiveDiff/3600))}h`)
    console.log(`📊 高效占比: ${Math.round(thisWeekProductive/thisWeekTime*100)}% vs ${Math.round(lastWeekProductive/lastWeekTime*100)}%`)
    
    if (productiveDiff > 0) {
      console.log(`\n🎉 本周高效时间增加了${Math.floor(productiveDiff/3600)}小时，保持下去！`)
    } else {
      console.log(`\n⚠️  本周高效时间减少了${Math.abs(Math.floor(productiveDiff/3600))}小时，需要调整`)
    }
    
    console.log('\n' + '='.repeat(60))
    console.log('\n✅ 模拟完成\n')
    
  } catch (error) {
    console.error('❌ 模拟失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

simulateUsage()

