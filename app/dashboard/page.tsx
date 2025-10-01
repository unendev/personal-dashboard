import { prisma } from '@/lib/prisma'
import SkillCard from '@/app/components/SkillCard'
import CreateSkillForm from '@/app/components/CreateSkillForm'
import InstanceStatsView from '@/app/components/InstanceStatsView'
import { levelUpSkill } from '@/app/actions'
import type { Skill } from '@prisma/client'
import Link from 'next/link'
import DashboardLayoutManager from '@/app/components/DashboardLayoutManager'

// MVP版本：硬编码用户ID
const MOCK_USER_ID = 'user-1'

export default async function DashboardPage() {
  // 在构建时不执行数据库查询，避免连接错误
  let skills: Skill[] = []
  
  try {
    // 查询当前用户的所有技能
    skills = await prisma.skill.findMany({
      where: { userId: MOCK_USER_ID },
      orderBy: { createdAt: 'desc' }
    })
  } catch (error) {
    console.log('数据库连接失败，使用空技能列表:', error)
    // 构建时数据库不可用，使用空数组
    skills = []
  }

  async function handleLevelUp(skillId: string) {
    'use server'
    try {
      await levelUpSkill(skillId)
    } catch (error) {
      console.error('升级技能失败:', error)
      // 可以在这里添加错误处理UI反馈
    }
  }

  return (
    <DashboardLayoutManager>
      {/* 返回主页按钮 */}
      <div key="home-button" className="fixed top-4 left-4 z-40">
        <Link
          href="/"
          className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
        >
          <span className="text-white font-bold text-xl">←</span>
        </Link>
      </div>

      {/* 页面导航 */}
      <div key="page-nav" className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex space-x-6">
          <Link href="/dashboard" className="text-green-600 font-medium border-b-2 border-green-600 pb-2">🏆 技能树</Link>
          <Link href="/tools" className="text-gray-600 hover:text-gray-800 font-medium pb-2">📋 任务清单</Link>
          <Link href="/log" className="text-gray-600 hover:text-gray-800 font-medium pb-2">📝 每日日志</Link>
          <Link href="/timer" className="text-gray-600 hover:text-gray-800 font-medium pb-2">⏱️ 计时器</Link>
        </div>
      </div>

      <div key="dashboard-content" className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">技能树</h1>
          <p className="text-gray-600">追踪你的技能成长和经验积累</p>
        </div>

        {/* 实例统计视图 */}
        <div key="instance-stats" className="mb-8">
          <InstanceStatsView />
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {skills.length === 0 ? (
          <div key="no-skills" className="col-span-full text-center py-12">
            <p className="text-gray-500 text-lg">还没有技能，开始创建你的第一个技能吧！</p>
          </div>
        ) : (
          skills.map((skill: Skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              onLevelUp={handleLevelUp}
            />
          ))
        )}
      </div>

        <div key="create-skill-form" className="mt-8">
          <CreateSkillForm />
        </div>
      </div>
    </DashboardLayoutManager>
  )
}