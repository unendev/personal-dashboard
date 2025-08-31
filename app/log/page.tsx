import LogCategorySelector from '../components/LogCategorySelector';
import LogDisplayTable from '../components/LogDisplayTable'; // 引入 LogDisplayTable

// MVP版本：硬编码用户ID
const MOCK_USER_ID = 'user-1'

export default async function LogPage() {
  // 移除日志查询，因为 LogDisplayTable 会自己处理
  // const logs = await prisma.log.findMany({ /* ... */ });

  // 移除任务查询，因为这里不需要了
  // const activeQuests = await prisma.quest.findMany({ /* ... */ });

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
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">记录新日志</h2>
            <LogCategorySelector />
          </div>
        </div>

        {/* 日志列表区域 */}
        <div className="lg:col-span-3 mt-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">日志历史</h2>

            <LogDisplayTable /> {/* 替换为 LogDisplayTable */}
          </div>
        </div>
      </div>
    </div>
    </>
  )
}