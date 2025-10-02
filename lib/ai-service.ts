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

interface TagSuggestion {
  tags: string[];
  reasoning?: string;
}

export class AIService {
  private static readonly DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
  private static readonly DEEPSEEK_MODEL = 'deepseek-chat';

  /**
   * 为宝藏内容生成智能标签建议
   */
  static async generateTags(content: {
    title: string;
    content?: string;
    type: 'TEXT' | 'IMAGE' | 'MUSIC';
    existingTags?: string[];
  }): Promise<TagSuggestion> {
    try {
      const apiKey = process.env.DEEPSEEK_API_KEY;
      
      if (!apiKey) {
        console.warn('DeepSeek API key not configured, using fallback tags');
        return this.generateFallbackTags(content);
      }

      const systemPrompt = `你是一个智能标签生成助手，专门为生活记录内容生成合适的标签。

标签维度参考（但不限于）：
1. 思考模式：深思、灵感、随笔、顿悟
2. 内容来源：影视、阅读、对话、音乐、旅行、梦境
3. 情绪氛围：平静、欢快、忧郁、激动、沉思、感动
4. 主题领域：人生、工作、情感、艺术、技术、哲学
5. 时空场景：清晨、深夜、家中、咖啡馆、通勤、户外

要求：
1. 生成 3-5 个最相关的标签
2. 标签要简洁（2-4个字）
3. 可以创造新标签，不局限于预设维度
4. 标签要能准确描述内容的本质
5. 返回 JSON 格式：{ "tags": ["标签1", "标签2", ...], "reasoning": "简短解释" }`;

      const userPrompt = `请为以下内容生成标签：

类型：${content.type === 'TEXT' ? '文本记录' : content.type === 'IMAGE' ? '图片记录' : '音乐记录'}
标题：${content.title}
${content.content ? `内容：${content.content.slice(0, 500)}` : ''}
${content.existingTags && content.existingTags.length > 0 ? `历史常用标签：${content.existingTags.join(', ')}` : ''}`;

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
          max_tokens: 300
        }),
      });

      if (!response.ok) {
        console.error(`DeepSeek API error: ${response.status}`);
        return this.generateFallbackTags(content);
      }

      const result = await response.json();
      const aiContent = result.choices[0]?.message?.content;
      
      if (!aiContent) {
        return this.generateFallbackTags(content);
      }

      // 尝试解析 JSON
      try {
        const parsed = JSON.parse(aiContent);
        return {
          tags: parsed.tags || [],
          reasoning: parsed.reasoning
        };
      } catch {
        // 如果不是 JSON，尝试提取标签
        const tagMatches = aiContent.match(/["']([^"']+)["']/g);
        if (tagMatches) {
          const tags = tagMatches.map((m: string) => m.replace(/["']/g, ''));
          return { tags: tags.slice(0, 5) };
        }
        return this.generateFallbackTags(content);
      }
    } catch (error) {
      console.error('Error generating tags:', error);
      return this.generateFallbackTags(content);
    }
  }

  /**
   * 降级方案：基于规则的标签生成
   */
  private static generateFallbackTags(content: {
    title: string;
    content?: string;
    type: 'TEXT' | 'IMAGE' | 'MUSIC';
  }): TagSuggestion {
    const tags: string[] = [];
    const text = `${content.title} ${content.content || ''}`.toLowerCase();

    // 根据类型添加标签
    if (content.type === 'MUSIC') tags.push('音乐');
    if (content.type === 'IMAGE') tags.push('图片');

    // 检测关键词
    const keywords = {
      '电影': ['电影', '影片', '观影'],
      '阅读': ['书', '读', '阅读', '文章'],
      '工作': ['工作', '项目', '任务'],
      '思考': ['思考', '想法', '思维'],
      '感悟': ['感悟', '体会', '领悟'],
      '生活': ['生活', '日常'],
    };

    for (const [tag, words] of Object.entries(keywords)) {
      if (words.some(word => text.includes(word))) {
        tags.push(tag);
      }
    }

    // 如果标签太少，添加默认标签
    if (tags.length === 0) {
      tags.push('随笔', '生活');
    }

    return { tags: tags.slice(0, 5) };
  }

  static async generateSummary(userId: string, date: string): Promise<AISummaryResponse> {
    try {
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

      const analysisData = this.prepareAnalysisData(tasks);
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
      return this.generateFallbackSummary(userId, date);
    }
  }

  private static prepareAnalysisData(tasks: TimerTask[]): AnalysisData {
    const totalTime = tasks.reduce((sum, task) => sum + task.elapsedTime, 0);
    const taskCount = tasks.length;
    const categories: Record<string, number> = {};
    
    tasks.forEach(task => {
      const category = task.categoryPath.split('/')[0] || '未分类';
      categories[category] = (categories[category] || 0) + task.elapsedTime;
    });

    const tasksWithTime = tasks.filter(task => task.elapsedTime > 0);
    const tasksWithoutTime = tasks.filter(task => task.elapsedTime === 0);

    return {
      totalTime,
      taskCount,
      categories,
      completedTasks: tasksWithTime.length,
      runningTasks: 0,
      pausedTasks: tasksWithoutTime.length,
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

  private static async callDeepSeekAPI(data: AnalysisData, date: string) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    
    if (!apiKey) {
      throw new Error('DeepSeek API key not configured');
    }

    const systemPrompt = `你是一个专业的时间管理和效率分析助手。请根据用户的计时数据生成详细的分析总结。

重要说明：
这是一个纯计时系统，重点关注时间投入而非任务状态。请忽略任务的状态信息（运行/暂停/停止），只关注实际的时间投入情况。

分析要求：
1. 提供简洁明了的总体总结，重点关注时间分配
2. 识别时间分配模式和计时习惯
3. 分析各类别的时间投入情况
4. 给出具体的时间管理改进建议
5. 使用中文回复
6. 重点关注时间投入而非任务完成状态
7. 不要提及任务状态分布，只分析时长数据

请以以下格式回复：
{
  "summary": "总体总结",
  "insights": ["洞察1", "洞察2", "洞察3"]
}`;

    const userPrompt = `请分析以下计时数据并生成总结：

日期：${date}
总计时时间：${Math.floor(data.totalTime / 3600)}小时${Math.floor((data.totalTime % 3600) / 60)}分钟
任务总数：${data.taskCount}个
有效计时任务：${data.completedTasks}个（有计时时间的任务）

时间分配：
${Object.entries(data.categories).map(([category, time]) => 
  `- ${category}: ${Math.floor(time / 3600)}小时${Math.floor((time % 3600) / 60)}分钟`
).join('\n')}

任务详情：
${data.tasks.filter(task => task.elapsedTime > 0).map(task => 
  `- ${task.name} (${task.categoryPath}): ${Math.floor(task.elapsedTime / 3600)}小时${Math.floor((task.elapsedTime % 3600) / 60)}分钟`
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

    try {
      const parsed = JSON.parse(content);
      return {
        summary: parsed.summary || content,
        insights: parsed.insights || []
      };
    } catch {
      return {
        summary: content,
        insights: []
      };
    }
  }

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

    const insights: string[] = [];
    
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

    const tasksWithTime = tasks.filter(task => task.elapsedTime > 0);
    if (tasksWithTime.length > 0) {
      insights.push(`完成了${tasksWithTime.length}个任务的时间投入，时间管理良好！`);
    }

    const summary = `今天总共计时了${Math.floor(totalTime / 3600)}小时${Math.floor((totalTime % 3600) / 60)}分钟，涉及${taskCount}个任务。${insights.join(' ')}`;

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


