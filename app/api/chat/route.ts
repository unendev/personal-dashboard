
import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

// Ensure Node.js runtime
// export const runtime = 'edge';

const deepseek = createOpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: deepseek('deepseek-chat'),
    messages,
    // No specific system prompt or tools for the generic chat endpoint
    // It will just be a helpful assistant (or whatever the client context implies)
  });

  const stream = 'toDataStream' in result ? result.toDataStream() : result.stream;
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Vercel-AI-Data-Stream': 'v1',
    }
  });
}
