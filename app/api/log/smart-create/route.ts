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
    - Example: "Buy Milk (Life/Chores) 30m" -> Name: "Buy Milk", Category: "Life/Chores", Time: 1800s
    - Example: "Code Feature X 1h" -> Name: "Code Feature X", Category: (Infer best match), Time: 3600s
    - Example: "Read Book" -> Name: "Read Book", Category: (Infer), Time: 0
    
    Output JSON Schema:
    {
      "name": "string", // Clean task name
      "categoryPath": "string", // Must be one of Existing Category Paths if a close match is found. Otherwise, suggest a new logical path (e.g., "Category/Subcategory").
      "initialTime": number, // Duration in seconds. Default 0.
      "instanceTags": string[] // Extract hashtags like "#Work" or inferred tags.
    }
    
    Instructions:
    - If the user explicitly provides a category in parentheses, try to match it to an existing path. If fuzzy match fails, use the user's input.
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

    return NextResponse.json(jsonResult);

  } catch (error) {
    console.error('Smart Create Error:', error);
    return NextResponse.json({ error: 'Failed to process request: ' + (error instanceof Error ? error.message : String(error)) }, { status: 500 });
  }
}
