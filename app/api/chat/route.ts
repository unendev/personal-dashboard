import { createDeepSeek } from '@ai-sdk/deepseek';
import { createGoogleGenerativeAI, GoogleGenerativeAIProviderOptions } from '@ai-sdk/google';
import { streamText } from 'ai';

interface ChatRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  provider?: 'deepseek' | 'gemini' | 'custom';
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

// 生产环境检测
const isProduction = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';

// 代理配置 - 本地开发时使用
const proxyConfig: any = {};
if (!isProduction) {
  const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY || 'http://127.0.0.1:10809';
  proxyConfig.httpAgent = proxyUrl;
  proxyConfig.httpsAgent = proxyUrl;
}

// 判断是否是思考模型
function isThinkingModel(provider: string, model: string): boolean {
  if (provider === 'deepseek' && model === 'deepseek-reasoner') {
    return true;
  }
  if (provider === 'gemini' && (model.includes('gemini-2.5-pro') || model.includes('gemini-3'))) {
    return true;
  }
  return false;
}

export async function POST(req: Request) {
  try {
    const { messages, provider = 'deepseek', apiKey, model, baseUrl } = await req.json() as ChatRequest;

    const effectiveModel = model || (provider === 'gemini' ? 'gemini-2.5-flash' : 'deepseek-chat');
    const enableThinking = isThinkingModel(provider, effectiveModel);
    
    console.log('[Chat API] Request:', { provider, model: effectiveModel, thinking: enableThinking });

    // 根据 provider 选择默认的环境变量 API Key
    let envApiKey = '';
    if (provider === 'gemini') {
      envApiKey = process.env.GOOGLE_AI_STUDIO_API_KEY || process.env.GOOGLE_API_KEY || '';
    } else {
      envApiKey = process.env.DEEPSEEK_API_KEY || '';
    }

    const effectiveApiKey = apiKey || envApiKey;
    
    if (!effectiveApiKey) {
      return new Response(JSON.stringify({ error: '未配置 API Key，请在设置中配置' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let aiModel;
    let providerOptions: any = {};

    if (provider === 'gemini') {
      const google = createGoogleGenerativeAI({
        apiKey: effectiveApiKey,
        ...proxyConfig,
      });
      aiModel = google(effectiveModel);
      
      // Gemini 思考模式配置 - 参考 /room 实现
      if (enableThinking) {
        const thinkingConfig: any = { includeThoughts: true };
        
        if (effectiveModel.includes('gemini-3')) {
          thinkingConfig.thinkingLevel = 'high';
        } else if (effectiveModel === 'gemini-2.5-flash') {
          thinkingConfig.thinkingBudget = 8192;
        }
        // gemini-2.5-pro 只需 includeThoughts: true
        
        providerOptions = {
          google: { thinkingConfig } satisfies GoogleGenerativeAIProviderOptions,
        };
      }
    } else if (provider === 'deepseek') {
      const deepseek = createDeepSeek({
        apiKey: effectiveApiKey,
      });
      // DeepSeek R1 (deepseek-reasoner) 原生支持 reasoning
      aiModel = deepseek(effectiveModel);
    } else {
      const { createOpenAI } = await import('@ai-sdk/openai');
      const client = createOpenAI({
        apiKey: effectiveApiKey,
        baseURL: baseUrl || '',
      });
      aiModel = client(effectiveModel);
    }

    // 提取 system 消息和聊天消息
    const systemMessage = messages.find(m => m.role === 'system');
    const chatMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const result = streamText({
      model: aiModel,
      system: systemMessage?.content,
      messages: chatMessages,
      providerOptions,
    });

    // 思考模型发送 reasoning，普通模型不发送
    return result.toUIMessageStreamResponse({
      sendReasoning: enableThinking,
      headers: {
        'Transfer-Encoding': 'chunked',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('[Chat API] Error:', error);
    return new Response(JSON.stringify({ 
      error: 'AI 请求失败: ' + (error instanceof Error ? error.message : String(error)) 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
