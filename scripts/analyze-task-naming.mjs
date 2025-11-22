import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 分析任务名的语义化程度
function analyzeTaskName(name) {
  // 动词列表（高语义化标志）
  const actionVerbs = [
    '学习', '实现', '完成', '修复', '优化', '重构', '理解', '掌握',
    '设计', '开发', '调试', '测试', '部署', '编写', '阅读', '研究',
    '分析', '解决', '整理', '梳理', '探索', '尝试'
  ]
  
  // 抽象词（低语义化标志）
  const abstractWords = [
    '灵感', '琐事', '杂事', '日常', '摸鱼', '放松', '休息',
    '娱乐', '游戏', '网文', '闲逛'
  ]
  
  const hasActionVerb = actionVerbs.some(verb => name.includes(verb))
  const hasAbstractWord = abstractWords.some(word => name.includes(word))
  const hasDetail = name.length > 5 // 简单判断是否有细节
  
  let semanticLevel = 'low'
  let suggestion = ''
  
  if (hasActionVerb && hasDetail) {
    semanticLevel = 'high'
    suggestion = '✅ 语义清晰，可直接作为commit'
  } else if (hasActionVerb) {
    semanticLevel = 'medium'
    suggestion = '🟡 有动词但缺少细节，可补充"学习什么"'
  } else if (hasAbstractWord) {
    semanticLevel = 'low'
    suggestion = '❌ 太抽象，无法提取技能'
  } else if (name.length <= 4) {
    semanticLevel = 'low'
    suggestion = '❌ 太简短，无法理解具体做了什么'
  } else {
    semanticLevel = 'medium'
    suggestion = '🟡 可理解但建议添加动词'
  }
  
  return { semanticLevel, suggestion }
}

// 转换为commit格式
function convertToCommit(task) {
  const { name, categoryPath, elapsedTime } = task
  const minutes = Math.floor(elapsedTime / 60)
  
  // 尝试识别commit类型
  let type = 'chore'
  let scope = ''
  let message = name
  
  if (name.includes('实现') || name.includes('开发') || name.includes('完成')) {
    type = 'feat'
  } else if (name.includes('修复') || name.includes('解决')) {
    type = 'fix'
  } else if (name.includes('重构') || name.includes('优化')) {
    type = 'refactor'
  } else if (name.includes('学习') || name.includes('阅读') || name.includes('理解')) {
    type = 'learn'
  } else if (name.includes('测试')) {
    type = 'test'
  } else if (name.includes('文档') || name.includes('注释')) {
    type = 'docs'
  }
  
  // 从分类提取scope
  if (categoryPath && categoryPath !== '未分类') {
    const parts = categoryPath.split('/')
    scope = parts[parts.length - 1]
  }
  
  const commitMsg = scope ? `${type}(${scope}): ${message}` : `${type}: ${message}`
  
  return { commitMsg, type, scope, minutes }
}

async function analyzeNaming() {
  try {
    console.log('📊 任务命名语义化分析\n')
    console.log('='.repeat(70))
    
    const allTasks = await prisma.timerTask.findMany({
      orderBy: { date: 'desc' },
      take: 50
    })
    
    const analysis = {
      high: [],
      medium: [],
      low: []
    }
    
    console.log('\n【最近50个任务的命名分析】\n')
    
    allTasks.forEach((task, i) => {
      const { semanticLevel, suggestion } = analyzeTaskName(task.name)
      const { commitMsg } = convertToCommit(task)
      
      analysis[semanticLevel].push(task)
      
      if (i < 15) { // 只显示前15个
        console.log(`${i + 1}. "${task.name}"`)
        console.log(`   ${suggestion}`)
        console.log(`   转换为commit: ${commitMsg}`)
        console.log(`   分类: ${task.categoryPath} | 时长: ${Math.floor(task.elapsedTime/60)}分钟`)
        console.log()
      }
    })
    
    console.log('='.repeat(70))
    console.log('\n【统计结果】\n')
    console.log(`✅ 高语义化（可直接作为commit）: ${analysis.high.length}个 (${Math.round(analysis.high.length/allTasks.length*100)}%)`)
    console.log(`🟡 中等语义化（需补充细节）: ${analysis.medium.length}个 (${Math.round(analysis.medium.length/allTasks.length*100)}%)`)
    console.log(`❌ 低语义化（无法提取技能）: ${analysis.low.length}个 (${Math.round(analysis.low.length/allTasks.length*100)}%)`)
    
    console.log('\n【高语义化示例】\n')
    if (analysis.high.length > 0) {
      analysis.high.slice(0, 3).forEach(task => {
        const { commitMsg } = convertToCommit(task)
        console.log(`✅ ${task.name}`)
        console.log(`   → ${commitMsg}\n`)
      })
    } else {
      console.log('暂无高语义化任务\n')
    }
    
    console.log('【改进建议】\n')
    console.log('当前命名 → 建议改为：')
    console.log()
    
    const improvements = [
      { current: '灵感源泉', better: '梳理个人网站信息架构设计' },
      { current: 'bos直聘', better: '更新简历并投递5份前端岗位' },
      { current: '时间简史', better: '阅读《时间简史》第3章-黑洞理论' },
      { current: '工程琐事', better: '配置ESLint和Prettier代码规范' },
      { current: '丝之歌', better: '通关《空洞骑士-丝之歌》第2关卡' },
      { current: '重构', better: '重构藏宝阁组件，分离业务逻辑' },
    ]
    
    improvements.forEach(({ current, better }) => {
      const currentAnalysis = analyzeTaskName(current)
      const betterAnalysis = analyzeTaskName(better)
      
      console.log(`❌ "${current}"`)
      console.log(`   ${currentAnalysis.suggestion}`)
      console.log()
      console.log(`✅ "${better}"`)
      console.log(`   ${betterAnalysis.suggestion}`)
      console.log(`   commit: ${convertToCommit({ name: better, categoryPath: '个人成长', elapsedTime: 3600 }).commitMsg}`)
      console.log()
      console.log('-'.repeat(70))
      console.log()
    })
    
    console.log('\n【实施方案】\n')
    console.log('1. 创建任务时的命名模板：')
    console.log('   格式: [动词] + [具体内容] + [可选：关键细节]')
    console.log('   示例: "实现用户登录功能（JWT+RefreshToken）"')
    console.log()
    console.log('2. 输入框智能提示：')
    console.log('   检测到抽象词 → 提示"请补充具体做什么"')
    console.log('   检测到动词 → 提示"很好，继续添加细节"')
    console.log()
    console.log('3. AI辅助命名：')
    console.log('   输入: "灵感"')
    console.log('   AI建议: "是在思考项目架构吗？试试这些命名："')
    console.log('     - 设计xxx系统的技术架构')
    console.log('     - 梳理xxx功能的业务流程')
    console.log('     - 规划xxx模块的开发计划')
    console.log()
    console.log('4. 快速命名模板：')
    console.log('   [学] 学习xxx技术/概念')
    console.log('   [做] 实现xxx功能')
    console.log('   [修] 修复xxx问题')
    console.log('   [想] 思考xxx设计方案')
    console.log()
    
    console.log('='.repeat(70))
    console.log()
    
  } catch (error) {
    console.error('分析失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

analyzeNaming()

