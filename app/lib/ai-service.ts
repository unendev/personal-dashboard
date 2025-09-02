import { TimerDB, TimerTask } from './timer-db';

interface AISummaryResponse {
  summary: string;
  totalTime: number;
  taskCount: number;
  categories: Record<string, number>;
  insights: string[];
  tasks: Array<{
    id: string;
    name: string;
    categoryPath: string;
    elapsedTime: number;
    completedAt: number | null;
  }>;
}

interface AnalysisData {
  totalTime: number;
  taskCount: number;
  categories: Record<string, number>;
  completedTasks: number;
  runningTasks: number;
  pausedTasks: number;
  tasks: Array<{
    id: string;
    name: string;
    categoryPath: string;
    elapsedTime: number;
    completedAt: number | null;
    isRunning: boolean;
    isPaused: boolean;
  }>;
}

export class AIService {
  private static readonly DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
  private static readonly DEEPSEEK_MODEL = 'deepseek-chat';

  /**
   * 使用 DeepSeek API 生成 AI 总结
   */
  static async generateSummary(userId: string, date: string): Promise<AISummaryResponse> {
    try {
      // 获取当日的任务数据
      const tasks = await TimerDB.getTasksByDate(userId, date);
      
      if (tasks.length === 0) {
        return {
          summary: "今天没有记录任何任务活动。",
          totalTime: 0,
          taskCount: 0,
          categories: {},
          insights: [],
          tasks: []
        };
      }

      // 准备数据用于 AI 分析
      const analysisData = this.prepareAnalysisData(tasks);
      
      // 调用 DeepSeek API
      const aiSummary = await this.callDeepSeekAPI(analysisData, date);
      
      return {
        summary: aiSummary.summary,
        totalTime: analysisData.totalTime,
        taskCount: analysisData.taskCount,
        categories: analysisData.categories,
        insights: aiSummary.insights,
        tasks: analysisData.tasks
      };
    } catch (error) {
      console.error('Error generating AI summary:', error);
      // 如果 AI API 调用失败，回退到基础总结
      return this.generateFallbackSummary(userId, date);
    }
  }

  /**
   * 准备用于 AI 分析的数据
   */
  private static prepareAnalysisData(tasks: TimerTask[]): AnalysisData {
    const totalTime = tasks.reduce((sum, task) => sum + task.elapsedTime, 0);
    const taskCount = tasks.length;
    const categories: Record<string, number> = {};
    
    // 按分类统计时间
    tasks.forEach(task => {
      const category = task.categoryPath.split('/')[0] || '未分类';
      categories[category] = (categories[category] || 0) + task.elapsedTime;
    });

    // 按完成状态分类
    const completedTasks = tasks.filter(task => task.completedAt);
    const runningTasks = tasks.filter(task => task.isRunning);
    const pausedTasks = tasks.filter(task => task.isPaused);

    return {
      totalTime,
      taskCount,
      categories,
      completedTasks: completedTasks.length,
      runningTasks: runningTasks.length,
      pausedTasks: pausedTasks.length,
      tasks: tasks.map(task => ({
        id: task.id,
        name: task.name,
        categoryPath: task.categoryPath,
        elapsedTime: task.elapsedTime,
        completedAt: task.completedAt,
        isRunning: task.isRunning,
        isPaused: task.isPaused
      }))
    };
  }

  /**
   * 调用 DeepSeek API
   */
  private static async callDeepSeekAPI(data: AnalysisData, date: string) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    
    if (!apiKey) {
      throw new Error('DeepSeek API key not configured');
    }

    const systemPrompt = `你是一个专业的时间管理和效率分析助手。请根据用户的工作数据生成详细的分析总结。

分析要求：
1. 提供简洁明了的总体总结
2. 识别时间分配模式
3. 给出具体的改进建议
4. 使用中文回复
5. 保持积极正面的语调

请以以下格式回复：
{
  "summary": "总体总结",
  "insights": ["洞察1", "洞察2", "洞察3"]
}`;

    const userPrompt = `请分析以下工作数据并生成总结：

日期：${date}
总工作时间：${Math.floor(data.totalTime / 3600)}小时${Math.floor((data.totalTime % 3600) / 60)}分钟
任务总数：${data.taskCount}个
完成任务：${data.completedTasks}个
正在运行：${data.runningTasks}个
暂停任务：${data.pausedTasks}个

时间分配：
${Object.entries(data.categories).map(([category, time]) => 
  `- ${category}: ${Math.floor(time / 3600)}小时${Math.floor((time % 3600) / 60)}分钟`
).join('\n')}

任务详情：
${data.tasks.map(task => 
  `- ${task.name} (${task.categoryPath}): ${Math.floor(task.elapsedTime / 3600)}小时${Math.floor((task.elapsedTime % 3600) / 60)}分钟 ${task.completedAt ? '✅' : task.isRunning ? '⏱️' : '⏸️'}`
).join('\n')}`;

    const response = await fetch(this.DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: this.DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        stream: false,
        temperature: 0.7,
        max_tokens: 1000
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    const content = result.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content received from DeepSeek API');
    }

    // 尝试解析 JSON 格式的回复
    try {
      const parsed = JSON.parse(content);
      return {
        summary: parsed.summary || content,
        insights: parsed.insights || []
      };
    } catch {
      // 如果不是 JSON 格式，直接返回内容
      return {
        summary: content,
        insights: []
      };
    }
  }

  /**
   * 生成回退总结（当 AI API 不可用时）
   */
  private static async generateFallbackSummary(userId: string, date: string): Promise<AISummaryResponse> {
    const tasks = await TimerDB.getTasksByDate(userId, date);
    
    if (tasks.length === 0) {
      return {
        summary: "今天没有记录任何任务活动。",
        totalTime: 0,
        taskCount: 0,
        categories: {},
        insights: [],
        tasks: []
      };
    }

    const totalTime = tasks.reduce((sum, task) => sum + task.elapsedTime, 0);
    const taskCount = tasks.length;
    const categories: Record<string, number> = {};
    
    tasks.forEach(task => {
      const category = task.categoryPath.split('/')[0] || '未分类';
      categories[category] = (categories[category] || 0) + task.elapsedTime;
    });

    const insights = [];
    
    if (totalTime > 8 * 3600) {
      insights.push("今天工作时间超过8小时，请注意休息。");
    }
    
    if (taskCount > 5) {
      insights.push("任务数量较多，建议集中精力在重要任务上。");
    }
    
    const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];
    if (topCategory) {
      insights.push(`在"${topCategory[0]}"类别上投入了最多时间，占总时间的${Math.round(topCategory[1] / totalTime * 100)}%。`);
    }

    const completedTasks = tasks.filter(task => task.completedAt);
    if (completedTasks.length > 0) {
      insights.push(`完成了${completedTasks.length}个任务，效率不错！`);
    }

    const summary = `今天总共工作了${Math.floor(totalTime / 3600)}小时${Math.floor((totalTime % 3600) / 60)}分钟，完成了${taskCount}个任务。${insights.join(' ')}`;

    return {
      summary,
      totalTime,
      taskCount,
      categories,
      insights,
      tasks: tasks.map(task => ({
        id: task.id,
        name: task.name,
        categoryPath: task.categoryPath,
        elapsedTime: task.elapsedTime,
        completedAt: task.completedAt
      }))
    };
  }
}
