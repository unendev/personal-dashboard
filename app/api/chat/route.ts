import { createDeepSeek } from '@ai-sdk/deepseek';
import { createGoogleGenerativeAI, GoogleGenerativeAIProviderOptions } from '@ai-sdk/google';
import { streamText, convertToModelMessages } from 'ai';

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
  if (provider === 'deepseek' && model === 'deepseek-reasoner') return true;
  if (provider === 'gemini' && (model.includes('gemini-2.5-pro') || model.includes('gemini-3'))) return true;
  return false;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // useChat 发送的格式: { messages: UIMessage[], ...customBody }
    const { messages, provider = 'deepseek', apiKey, model, baseUrl } = body;

    const effectiveModel = model || (provider === 'gemini' ? 'gemini-2.5-flash' : 'deepseek-chat');
    const enableThinking = isThinkingModel(provider, effectiveModel);
    
    console.log('[Chat API] Request:', { provider, model: effectiveModel, thinking: enableThinking, msgCount: messages?.length });

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
      
      // Gemini 思考模式配置
      if (enableThinking) {
        const thinkingConfig: any = { includeThoughts: true };
        if (effectiveModel.includes('gemini-3')) {
          thinkingConfig.thinkingLevel = 'high';
        } else if (effectiveModel === 'gemini-2.5-flash') {
          thinkingConfig.thinkingBudget = 8192;
        }
        providerOptions = {
          google: { thinkingConfig } satisfies GoogleGenerativeAIProviderOptions,
        };
      }
    } else if (provider === 'deepseek') {
      const deepseek = createDeepSeek({
        apiKey: effectiveApiKey,
      });
      aiModel = deepseek(effectiveModel);
    } else {
      const { createOpenAI } = await import('@ai-sdk/openai');
      const client = createOpenAI({
        apiKey: effectiveApiKey,
        baseURL: baseUrl || '',
      });
      aiModel = client(effectiveModel);
    }

    // 处理消息 - 支持 UIMessage 格式（useChat）和简单格式
    let systemPrompt: string | undefined;
    let modelMessages: any[];

    if (messages?.[0]?.parts) {
      // UIMessage 格式 (from useChat)
      modelMessages = convertToModelMessages(messages);
    } else {
      // 简单格式 { role, content }
      const systemMsg = messages?.find((m: any) => m.role === 'system');
      systemPrompt = systemMsg?.content;
      modelMessages = messages
        ?.filter((m: any) => m.role !== 'system')
        .map((m: any) => ({ role: m.role, content: m.content })) || [];
    }

    const result = streamText({
      model: aiModel,
      system: systemPrompt,
      messages: modelMessages,
      providerOptions,
    });

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
