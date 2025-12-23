import { createDeepSeek } from '@ai-sdk/deepseek';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, CoreMessage } from 'ai';

interface ChatRequest {
  messages: CoreMessage[];
  provider?: 'deepseek' | 'gemini' | 'custom';
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

// 生产环境检测
const isProduction = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';

export async function POST(req: Request) {
  try {
    const { messages, provider = 'deepseek', apiKey, model, baseUrl } = await req.json() as ChatRequest;

    console.log('[Chat API] Request received:', { provider, model, messageCount: messages.length });

    // 根据 provider 选择默认的环境变量 API Key
    let envApiKey = '';
    if (provider === 'gemini') {
      envApiKey = process.env.GOOGLE_AI_STUDIO_API_KEY || process.env.GOOGLE_API_KEY || '';
    } else {
      envApiKey = process.env.DEEPSEEK_API_KEY || '';
    }

    // 使用客户端提供的 apiKey，或回退到环境变量
    const effectiveApiKey = apiKey || envApiKey;
    
    if (!effectiveApiKey) {
      console.error('[Chat API] No API key available for provider:', provider);
      return new Response(JSON.stringify({ error: '未配置 API Key，请在设置中配置' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let aiModel;

    if (provider === 'gemini') {
      console.log('[Chat API] Using Gemini provider with API key:', effectiveApiKey.substring(0, 10) + '...');
      const proxyConfig: any = {};
      if (!isProduction) {
        const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
        if (proxyUrl) {
          proxyConfig.httpAgent = proxyUrl;
          proxyConfig.httpsAgent = proxyUrl;
          console.log('[Chat API] Using proxy:', proxyUrl);
        }
      }
      
      const google = createGoogleGenerativeAI({
        apiKey: effectiveApiKey,
        ...proxyConfig,
      });
      const effectiveModel = model || 'gemini-2.5-flash';
      console.log('[Chat API] Gemini model:', effectiveModel);
      aiModel = google(effectiveModel);
    } else if (provider === 'deepseek') {
      console.log('[Chat API] Using DeepSeek provider with official SDK');
      const deepseek = createDeepSeek({
        apiKey: effectiveApiKey,
      });
      const effectiveModel = model || 'deepseek-chat';
      console.log('[Chat API] DeepSeek model:', effectiveModel);
      aiModel = deepseek(effectiveModel);
    } else {
      // Custom provider
      console.log('[Chat API] Using Custom provider');
      const { createOpenAI } = await import('@ai-sdk/openai');
      const client = createOpenAI({
        apiKey: effectiveApiKey,
        baseURL: baseUrl || '',
      });
      aiModel = client(model || 'custom');
    }

    console.log('[Chat API] Starting streamText with model:', model);
    const result = streamText({
      model: aiModel,
      messages,
    });

    console.log('[Chat API] Returning text stream response');
    return result.toTextStreamResponse();
  } catch (error) {
    console.error('[Chat API] Error:', error);
    console.error('[Chat API] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return new Response(JSON.stringify({ error: 'AI 请求失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
