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
    - The user input can be structured OR natural language.
    - **Natural Language**: "Read history book for 1 hour" -> Name: "Read history book", Category: (Match "Reading" or "Study"), Time: 3600s
    - **Structured Shortcut**: "Task (Category) Time" -> Explicit override.
    - **Nesting**: "Project > Task" or "Project: Task".
    - **Omitted Name**: "(Category) Time" or "#Tag Time".
    
    Output JSON Schema:
    {
      "name": "string", // Clean task name.
      "parentName": "string", // Optional parent context.
      "categoryPath": "string", // Best match from context OR A NEW LOGICAL PATH if semantically distinct.
      "initialTime": number, // Seconds.
      "instanceTags": string[] 
    }
    
    Instructions:
    1. **Time Extraction**: Look for "1h", "30m", "1 hour", "20 mins". Remove this from the name.
    2. **Category Matching**: 
       - If (Category) is present, use it.
       - If NO parentheses, map to existing paths if close.
       - **CRITICAL**: If the task implies a NEW context not in existing paths, generate a new logical path (e.g. "Work/NewProject"). The system will auto-create it.
    3. **Hierarchy**: Detect > or : for parent/child relationship.
    4. **Cleanup**: The name should be the core task activity, stripped of time and category markers.
    5. Return valid JSON only.
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
    
    // 3.1 (新增) 智能回退任务名逻辑
    if (!jsonResult.name || jsonResult.name.trim() === '') {
        // 优先级 1: 使用第一个 Tag
        if (jsonResult.instanceTags && jsonResult.instanceTags.length > 0) {
            jsonResult.name = jsonResult.instanceTags[0];
        } 
        // 优先级 2: 使用分类路径的最后一部分
        else if (jsonResult.categoryPath) {
            const parts = jsonResult.categoryPath.split('/');
            jsonResult.name = parts[parts.length - 1];
        }
        // 优先级 3: 默认值
        else {
            jsonResult.name = "未命名任务";
        }
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
