import { generateText } from 'ai';
import { getAIModel } from '@/lib/ai-provider';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { text, date } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // 1. 获取所有分类用于上下文 (限制数量以节省 token)
    // 优先获取最近使用的分类或常用分类可能更好，但这里先获取全部（假设数量不多）
    const categories = await prisma.logCategory.findMany({
      select: { name: true, parentId: true, id: true },
    });
    
    // 构建分类路径映射
    const categoryMap = new Map(categories.map(c => [c.id, c]));
    const categoryPaths = categories.map(c => {
        let path = c.name;
        let current = c;
        let depth = 0;
        while (current.parentId && categoryMap.has(current.parentId) && depth < 5) {
            current = categoryMap.get(current.parentId)!;
            path = `${current.name}/${path}`;
            depth++;
        }
        return path;
    });

    // 简单的去重和排序
    const uniquePaths = Array.from(new Set(categoryPaths)).sort();
    const categoryContext = uniquePaths.join(', ');

    // 2. 调用 AI
    // 使用 System Prompt 设定角色
    const systemPrompt = `You are an AI assistant for a productivity app. Your goal is to parse a raw task input string into a structured JSON object.
    
    Context:
    - User is creating a task log or timer task.
    - Today's date is: ${date || new Date().toISOString().split('T')[0]}
    - Existing Category Paths: [${categoryContext}]
    
    Input Format Analysis:
    - The user input often follows: "Task Name (Category) [Time Duration]"
    - The user might also use nesting syntax: "Parent Task > Child Task" or "Parent Task: Child Task"
    - Example: "Buy Milk (Life/Chores) 30m" -> Name: "Buy Milk", Category: "Life/Chores", Time: 1800s
    - Example: "Project Alpha > Design UI 2h" -> ParentName: "Project Alpha", Name: "Design UI", Category: (Infer), Time: 7200s
    - Example: "Refactor: Login Page" -> ParentName: "Refactor", Name: "Login Page"
    
    Output JSON Schema:
    {
      "name": "string", // Clean task name (Child name if nested)
      "parentName": "string", // Optional. Name of the parent task if hierarchy is detected.
      "categoryPath": "string", // Must be one of Existing Category Paths if a close match is found. Otherwise, suggest a new logical path.
      "initialTime": number, // Duration in seconds. Default 0.
      "instanceTags": string[] // Extract hashtags like "#Work" or inferred tags.
    }
    
    Instructions:
    - If hierarchy is detected ('>' or ':'), split the name. The part BEFORE is parentName, AFTER is name.
    - If the user explicitly provides a category in parentheses, try to match it to an existing path.
    - If no category is provided, INFER it from the task name and existing paths.
    - Parse time expressions like "10m", "1h", "1.5h", "30min" into seconds.
    - Return ONLY valid JSON. No markdown formatting.
    `;

    const { model } = getAIModel({ provider: 'deepseek', modelId: 'deepseek-chat' });
    
    const result = await generateText({
      model,
      system: systemPrompt,
      prompt: `Parse this input: "${text}"`,
    });

    // 3. 解析结果
    let jsonResult;
    try {
        const cleanedText = result.text.replace(/```json/g, '').replace(/```/g, '').trim();
        jsonResult = JSON.parse(cleanedText);
    } catch (e) {
        console.error('Failed to parse AI response JSON:', result.text);
        return NextResponse.json({ error: 'AI response invalid' }, { status: 500 });
    }

    // 4. (新增) 如果识别到父任务名，查找父任务ID
    if (jsonResult.parentName) {
        // 查找最近的匹配任务 (限制在最近7天内，避免匹配到太久远的任务)
        // 或者是正在运行的任务
        // 这里简化逻辑：查找该用户最新的且名称匹配的任务
        // 注意：我们在这个 API 中没有 session user id，但通常 task 是特定于用户的
        // 由于 LogPage 调用这个 API 时没有传 userId，我们可能需要...
        // 暂时：由于这是一个开放的工具 API，我们无法直接查询特定用户的任务（没有 Auth Context）
        // 修正：我们应该在 API 中加入 Auth 检查，或者...
        // 由于时间关系，我们让 AI 返回 parentName，让前端去处理？
        // 不，前端处理太慢。我们还是要在后端处理。
        // 添加 Auth 检查
        const { getServerSession } = await import('next-auth/next');
        const { authOptions } = await import('@/lib/auth');
        const session = await getServerSession(authOptions);
        
        if (session?.user?.id) {
             const parentTask = await prisma.timerTask.findFirst({
                 where: {
                     userId: session.user.id,
                     name: {
                         contains: jsonResult.parentName, // 使用 contains 增加容错
                         mode: 'insensitive'
                     },
                     // 排除已完成很久的任务？暂时不排除
                 },
                 orderBy: { updatedAt: 'desc' },
                 select: { id: true, categoryPath: true }
             });
             
             if (parentTask) {
                 jsonResult.parentId = parentTask.id;
                 // 如果 AI 没推断出分类，可以继承父任务分类
                 if (!jsonResult.categoryPath || jsonResult.categoryPath === '未分类') {
                     jsonResult.categoryPath = parentTask.categoryPath;
                 }
             } else {
                 // 兜底逻辑：如果找不到父任务，将任务名重组为 "Parent - Child" 以保留上下文
                 // 避免创建一个孤立的 "Child" 任务导致用户不知道它属于谁
                 jsonResult.name = `${jsonResult.parentName} - ${jsonResult.name}`;
             }
        } else {
             // 如果没有 session user，也执行兜底逻辑
             jsonResult.name = `${jsonResult.parentName} - ${jsonResult.name}`;
        }
    }

    return NextResponse.json(jsonResult);

  } catch (error) {
    console.error('Smart Create Error:', error);
    return NextResponse.json({ error: 'Failed to process request: ' + (error instanceof Error ? error.message : String(error)) }, { status: 500 });
  }
}
