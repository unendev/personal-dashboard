
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
  });

  return result.toTextStreamResponse();
}
