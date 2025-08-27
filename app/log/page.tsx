import { prisma } from '@/lib/prisma'
import CreateLogForm from '@/app/components/CreateLogForm'
import LogCard from '@/app/components/LogCard'

// MVP版本：硬编码用户ID
const MOCK_USER_ID = 'user-1'

export default async function LogPage() {
  // 查询当前用户的所有日志，按创建时间倒序排列
  const logs = await prisma.log.findMany({
    where: { userId: MOCK_USER_ID },
    include: {
      quest: true, // 包含关联的任务信息
    },
    orderBy: { createdAt: 'desc' }
  })

  // 查询正在进行中的任务，用于日志表单的下拉菜单
  const activeQuests = await prisma.quest.findMany({
    where: {
      userId: MOCK_USER_ID,
      status: 'IN_PROGRESS'
    },
    select: {
      id: true,
      title: true,
    },
    orderBy: { title: 'asc' }
  })

  return (
    <>
      {/* 返回主页按钮 */}
      <div className="fixed top-4 left-4 z-40">
        <a
          href="/"
          className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
        >
          <span className="text-white font-bold text-xl">←</span>
        </a>
      </div>

      {/* 页面导航 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex space-x-6">
          <a href="/dashboard" className="text-gray-600 hover:text-gray-800 font-medium pb-2">🏆 技能树</a>
          <a href="/quests" className="text-gray-600 hover:text-gray-800 font-medium pb-2">📋 任务清单</a>
          <a href="/log" className="text-yellow-600 font-medium border-b-2 border-yellow-600 pb-2">📝 每日日志</a>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">每日日志</h1>
          <p className="text-gray-600">记录你的日常活动和进步</p>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 日志输入区域 */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">记录新日志</h2>
            <CreateLogForm activeQuests={activeQuests} />
          </div>
        </div>

        {/* 日志列表区域 */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">日志历史</h2>

            {logs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">还没有日志记录，开始记录你的第一条日志吧！</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {logs.map((log: any) => (
                  <LogCard key={log.id} log={log} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  )
}