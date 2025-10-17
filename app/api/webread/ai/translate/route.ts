import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// 使用项目现有的 AI 服务
async function callDeepSeekAPI(text: string, prompt: string) {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'user',
          content: `${prompt}\n\n原文：${text}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text, type } = await request.json();

    if (!text || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let prompt = '';
    let result = '';

    switch (type) {
      case 'translate':
        prompt = '请将以下英文文本翻译成中文，保持原文的语气和风格：';
        break;
      case 'explain':
        prompt = '请解释以下英文文本的语法结构和词汇含义，用中文回答：';
        break;
      case 'summarize':
        prompt = '请用中文总结以下文本的主要内容：';
        break;
      case 'qa':
        prompt = '请根据以下文本内容，回答可能的相关问题，用中文回答：';
        break;
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    result = await callDeepSeekAPI(text, prompt);

    return NextResponse.json({
      type,
      originalText: text,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('AI translation error:', error);
    return NextResponse.json({ error: 'AI translation failed' }, { status: 500 });
  }
}
