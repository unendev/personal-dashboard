import { prisma } from '@/lib/prisma'
import CreateQuestForm from '@/app/components/CreateQuestForm'
import QuestCard from '@/app/components/QuestCard'
import type { Quest } from '@prisma/client'
import Link from 'next/link'

// MVP版本：硬编码用户ID
const MOCK_USER_ID = 'user-1'

export default async function QuestsPage() {
  // 查询当前用户的所有任务，并按状态分组
  const quests = await prisma.quest.findMany({
    where: { userId: MOCK_USER_ID },
    include: {
      skill: true, // 包含关联的技能信息
    },
    orderBy: { createdAt: 'desc' }
  })

  // 按状态分组任务
  const groupedQuests = {
    planning: quests.filter(q => q.status === 'PLANNING'),
    inProgress: quests.filter(q => q.status === 'IN_PROGRESS'),
    completed: quests.filter(q => q.status === 'COMPLETED'),
  }

  return (
    <>
      {/* 返回主页按钮 */}
      <div className="fixed top-4 left-4 z-40">
        <Link
          href="/"
          className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
        >
          <span className="text-white font-bold text-xl">←</span>
        </Link>
      </div>

      {/* 页面导航 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex space-x-6">
          <a href="/dashboard" className="text-gray-600 hover:text-gray-800 font-medium pb-2">🏆 技能树</a>
          <a href="/quests" className="text-blue-600 font-medium border-b-2 border-blue-600 pb-2">📋 任务清单</a>
          <a href="/log" className="text-gray-600 hover:text-gray-800 font-medium pb-2">📝 每日日志</a>
          <a href="/timer" className="text-gray-600 hover:text-gray-800 font-medium pb-2">⏱️ 计时器</a>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">任务清单</h1>
          <p className="text-gray-600">管理你的任务和目标</p>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 计划中 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <div className="w-3 h-3 bg-yellow-400 rounded-full mr-2"></div>
            计划中 ({groupedQuests.planning.length})
          </h2>
          <div className="space-y-3">
            {groupedQuests.planning.length === 0 ? (
              <p className="text-gray-500 text-sm">暂无计划中的任务</p>
            ) : (
              groupedQuests.planning.map((quest: Quest) => (
                <QuestCard key={quest.id} quest={quest} />
              ))
            )}
          </div>
        </div>

        {/* 进行中 */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
            进行中 ({groupedQuests.inProgress.length})
          </h2>
          <div className="space-y-3">
            {groupedQuests.inProgress.length === 0 ? (
              <p className="text-gray-500 text-sm">暂无进行中的任务</p>
            ) : (
              groupedQuests.inProgress.map((quest: Quest) => (
                <QuestCard key={quest.id} quest={quest} />
              ))
            )}
          </div>
        </div>

        {/* 已完成 */}
        <div className="bg-green-50 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            已完成 ({groupedQuests.completed.length})
          </h2>
          <div className="space-y-3">
            {groupedQuests.completed.length === 0 ? (
              <p className="text-gray-500 text-sm">暂无已完成的任务</p>
            ) : (
              groupedQuests.completed.map((quest: Quest) => (
                <QuestCard key={quest.id} quest={quest} />
              ))
            )}
          </div>
        </div>
      </div>

        <div className="mt-8">
          <CreateQuestForm />
        </div>
      </div>
    </>
  )
}