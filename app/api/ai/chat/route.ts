import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';
import { OpenAIStream, StreamingTextResponse } from 'ai'; // Import streaming utilities

// Initialize the OpenAI client with DeepSeek's configuration
const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com/v1',
});

// Define the handler for POST requests
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages = body.messages || [];

    if (messages.length === 0) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 });
    }

    const systemPrompt = {
      role: 'system',
      content: '你是一个循循善诱的俄语老师。请主要使用中文进行教学和解释。在对话中，请使用简单、日常的俄语短语或单词作为例子，并总是在旁边附上中文翻译。你的目标是为初学者创造一个没有压力的学习环境。'
    };

    const response = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [systemPrompt, ...messages],
      stream: true, // Enable streaming
    });

    // Convert the response into a friendly text-stream
    const stream = OpenAIStream(response);

    // Respond with the stream
    return new StreamingTextResponse(stream);

  } catch (error) {
    console.error('Error calling DeepSeek API:', error);
    // In case of an error, send a non-streaming JSON response
    return NextResponse.json({ error: 'Failed to fetch response from AI' }, { status: 500 });
  }
}

