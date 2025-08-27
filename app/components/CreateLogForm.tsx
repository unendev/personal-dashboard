'use client'

import { useState } from 'react'
import { createLog } from '@/app/actions'

interface Quest {
  id: string
  title: string
}

interface CreateLogFormProps {
  activeQuests: Quest[]
}

const initialDailySummary = {
  investment: {
    coreWork: {
      projectA: '',
      projectB: '',
      managementCommunication: '',
    },
    skillUp: {
      professionalReading: '',
      onlineCourses: '',
      deliberatePractice: '',
    },
    deepThinking: {
      reviewPlanning: '',
      creativeConception: '',
    },
    inspiration: {
      filmTv: '',
      reading: '',
      games: '',
    },
  },
  replenishment: {
    pureFun: {
      filmTv: '',
      reading: '',
      games: '',
    },
    exercise: {
      aerobic: '',
      anaerobic: '',
      gamifiedSports: '',
    },
    social: {
      friends: '',
      family: '',
    },
  },
  maintenance: {
    dailyChores: {
      commute: '',
      housework: '',
    },
    adminWork: {
      emailProcessing: '',
      proceduralTasks: '',
    },
    infoProcessing: {
      newsBrowsing: '',
      communitySurfing: '',
    },
  },
  timeSink: {
    mindlessBrowsing: '',
    procrastination: '',
  },
};

export default function CreateLogForm({ activeQuests }: CreateLogFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [dailySummaryData, setDailySummaryData] = useState(initialDailySummary);

  const handleDailySummaryChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    const path = name.split('.');
    setDailySummaryData(prevData => {
      const newData = { ...prevData };
      let current: any = newData;
      for (let i = 0; i < path.length - 1; i++) {
        current[path[i]] = current[path[i]] || {};
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return newData;
    });
  };

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true)
    try {
      formData.append('dailySummary', JSON.stringify(dailySummaryData));
      await createLog(formData)
      const form = document.getElementById('log-form') as HTMLFormElement
      form?.reset()
      setDailySummaryData(initialDailySummary); // Reset daily summary state
    } catch (error) {
      console.error('创建日志失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form id="log-form" action={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
          日志内容 (可选)
        </label>
        <textarea
          id="content"
          name="content"
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="记录今天做了什么，有什么收获或感受..."
        />
      </div>

      {/* Daily Summary Section */}
      <div className="space-y-6 pt-4 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">每日总结</h3>

        {/* 价值投资 (Investment) */}
        <div className="space-y-3 pl-4 border-l-2 border-purple-300">
          <h4 className="text-md font-medium text-purple-700">价值投资 (Investment)</h4>
          {/* 核心工作 (Core Work) */}
          <div className="space-y-2 pl-4 border-l border-gray-300">
            <p className="text-sm font-medium text-gray-700">核心工作 (Core Work)</p>
            <input
              type="text"
              name="investment.coreWork.projectA"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="项目A"
              value={dailySummaryData.investment.coreWork.projectA}
              onChange={handleDailySummaryChange}
            />
            <input
              type="text"
              name="investment.coreWork.projectB"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="项目B"
              value={dailySummaryData.investment.coreWork.projectB}
              onChange={handleDailySummaryChange}
            />
            <input
              type="text"
              name="investment.coreWork.managementCommunication"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="管理沟通"
              value={dailySummaryData.investment.coreWork.managementCommunication}
              onChange={handleDailySummaryChange}
            />
          </div>
          {/* 技能学习 (Skill Up) */}
          <div className="space-y-2 pl-4 border-l border-gray-300">
            <p className="text-sm font-medium text-gray-700">技能学习 (Skill Up)</p>
            <input
              type="text"
              name="investment.skillUp.professionalReading"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="专业阅读"
              value={dailySummaryData.investment.skillUp.professionalReading}
              onChange={handleDailySummaryChange}
            />
            <input
              type="text"
              name="investment.skillUp.onlineCourses"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="线上课程"
              value={dailySummaryData.investment.skillUp.onlineCourses}
              onChange={handleDailySummaryChange}
            />
            <input
              type="text"
              name="investment.skillUp.deliberatePractice"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="刻意练习"
              value={dailySummaryData.investment.skillUp.deliberatePractice}
              onChange={handleDailySummaryChange}
            />
          </div>
          {/* 深度思考 (Deep Thinking) */}
          <div className="space-y-2 pl-4 border-l border-gray-300">
            <p className="text-sm font-medium text-gray-700">深度思考 (Deep Thinking)</p>
            <input
              type="text"
              name="investment.deepThinking.reviewPlanning"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="复盘规划"
              value={dailySummaryData.investment.deepThinking.reviewPlanning}
              onChange={handleDailySummaryChange}
            />
            <input
              type="text"
              name="investment.deepThinking.creativeConception"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="创作构思"
              value={dailySummaryData.investment.deepThinking.creativeConception}
              onChange={handleDailySummaryChange}
            />
          </div>
          {/* 灵感源泉 (Inspiration) */}
          <div className="space-y-2 pl-4 border-l border-gray-300">
            <p className="text-sm font-medium text-gray-700">灵感源泉 (Inspiration)</p>
            <input
              type="text"
              name="investment.inspiration.filmTv"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="影视"
              value={dailySummaryData.investment.inspiration.filmTv}
              onChange={handleDailySummaryChange}
            />
            <input
              type="text"
              name="investment.inspiration.reading"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="阅读"
              value={dailySummaryData.investment.inspiration.reading}
              onChange={handleDailySummaryChange}
            />
            <input
              type="text"
              name="investment.inspiration.games"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="游戏"
              value={dailySummaryData.investment.inspiration.games}
              onChange={handleDailySummaryChange}
            />
          </div>
        </div>

        {/* 精力补充 (Replenishment) */}
        <div className="space-y-3 pl-4 border-l-2 border-green-300">
          <h4 className="text-md font-medium text-green-700">精力补充 (Replenishment)</h4>
          {/* 纯粹娱乐 (Pure Fun) */}
          <div className="space-y-2 pl-4 border-l border-gray-300">
            <p className="text-sm font-medium text-gray-700">纯粹娱乐 (Pure Fun)</p>
            <input
              type="text"
              name="replenishment.pureFun.filmTv"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="影视"
              value={dailySummaryData.replenishment.pureFun.filmTv}
              onChange={handleDailySummaryChange}
            />
            <input
              type="text"
              name="replenishment.pureFun.reading"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="阅读"
              value={dailySummaryData.replenishment.pureFun.reading}
              onChange={handleDailySummaryChange}
            />
            <input
              type="text"
              name="replenishment.pureFun.games"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="游戏"
              value={dailySummaryData.replenishment.pureFun.games}
              onChange={handleDailySummaryChange}
            />
          </div>
          {/* 身体锻炼 (Exercise) */}
          <div className="space-y-2 pl-4 border-l border-gray-300">
            <p className="text-sm font-medium text-gray-700">身体锻炼 (Exercise)</p>
            <input
              type="text"
              name="replenishment.exercise.aerobic"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="有氧"
              value={dailySummaryData.replenishment.exercise.aerobic}
              onChange={handleDailySummaryChange}
            />
            <input
              type="text"
              name="replenishment.exercise.anaerobic"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="无氧"
              value={dailySummaryData.replenishment.exercise.anaerobic}
              onChange={handleDailySummaryChange}
            />
            <input
              type="text"
              name="replenishment.exercise.gamifiedSports"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="游戏化运动（节奏光剑）"
              value={dailySummaryData.replenishment.exercise.gamifiedSports}
              onChange={handleDailySummaryChange}
            />
          </div>
          {/* 社交连接 (Social) */}
          <div className="space-y-2 pl-4 border-l border-gray-300">
            <p className="text-sm font-medium text-gray-700">社交连接 (Social)</p>
            <input
              type="text"
              name="replenishment.social.friends"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="朋友"
              value={dailySummaryData.replenishment.social.friends}
              onChange={handleDailySummaryChange}
            />
            <input
              type="text"
              name="replenishment.social.family"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="家人"
              value={dailySummaryData.replenishment.social.family}
              onChange={handleDailySummaryChange}
            />
          </div>
        </div>

        {/* 系统维持 (Maintenance) */}
        <div className="space-y-3 pl-4 border-l-2 border-blue-300">
          <h4 className="text-md font-medium text-blue-700">系统维持 (Maintenance)</h4>
          {/* 日常琐事 (Daily Chores) */}
          <div className="space-y-2 pl-4 border-l border-gray-300">
            <p className="text-sm font-medium text-gray-700">日常琐事 (Daily Chores)</p>
            <input
              type="text"
              name="maintenance.dailyChores.commute"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="通勤"
              value={dailySummaryData.maintenance.dailyChores.commute}
              onChange={handleDailySummaryChange}
            />
            <input
              type="text"
              name="maintenance.dailyChores.housework"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="家务"
              value={dailySummaryData.maintenance.dailyChores.housework}
              onChange={handleDailySummaryChange}
            />
          </div>
          {/* 事务性工作 (Admin Work) */}
          <div className="space-y-2 pl-4 border-l border-gray-300">
            <p className="text-sm font-medium text-gray-700">事务性工作 (Admin Work)</p>
            <input
              type="text"
              name="maintenance.adminWork.emailProcessing"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="邮件处理"
              value={dailySummaryData.maintenance.adminWork.emailProcessing}
              onChange={handleDailySummaryChange}
            />
            <input
              type="text"
              name="maintenance.adminWork.proceduralTasks"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="流程性任务"
              value={dailySummaryData.maintenance.adminWork.proceduralTasks}
              onChange={handleDailySummaryChange}
            />
          </div>
          {/* 信息处理 (Info Processing) */}
          <div className="space-y-2 pl-4 border-l border-gray-300">
            <p className="text-sm font-medium text-gray-700">信息处理 (Info Processing)</p>
            <input
              type="text"
              name="maintenance.infoProcessing.newsBrowsing"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="新闻浏览"
              value={dailySummaryData.maintenance.infoProcessing.newsBrowsing}
              onChange={handleDailySummaryChange}
            />
            <input
              type="text"
              name="maintenance.infoProcessing.communitySurfing"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="社区冲浪"
              value={dailySummaryData.maintenance.infoProcessing.communitySurfing}
              onChange={handleDailySummaryChange}
            />
          </div>
        </div>

        {/* 时间黑洞 (Time Sink) */}
        <div className="space-y-3 pl-4 border-l-2 border-red-300">
          <h4 className="text-md font-medium text-red-700">时间黑洞 (Time Sink)</h4>
          {/* 无效冲浪 (Mindless Browsing) */}
          <div className="space-y-2 pl-4 border-l border-gray-300">
            <p className="text-sm font-medium text-gray-700">无效冲浪 (Mindless Browsing)</p>
            <input
              type="text"
              name="timeSink.mindlessBrowsing"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder=""
              value={dailySummaryData.timeSink.mindlessBrowsing}
              onChange={handleDailySummaryChange}
            />
          </div>
          {/* 拖延等待 (Procrastination) */}
          <div className="space-y-2 pl-4 border-l border-gray-300">
            <p className="text-sm font-medium text-gray-700">拖延等待 (Procrastination)</p>
            <input
              type="text"
              name="timeSink.procrastination"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder=""
              value={dailySummaryData.timeSink.procrastination}
              onChange={handleDailySummaryChange}
            />
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="questId" className="block text-sm font-medium text-gray-700 mb-1">
          关联任务
        </label>
        <select
          id="questId"
          name="questId"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">无关联任务</option>
          {activeQuests.map((quest) => (
            <option key={quest.id} value={quest.id}>
              {quest.title}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md font-medium disabled:opacity-50 transition-colors"
      >
        {isLoading ? '保存中...' : '保存日志'}
      </button>
    </form>
  )
}