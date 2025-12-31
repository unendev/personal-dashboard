import { createGoogleGenerativeAI, GoogleGenerativeAIProviderOptions } from '@ai-sdk/google';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { env } from "@/lib/env";

const isProduction = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
const proxyConfig: any = {};

if (!isProduction) {
  const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY || 'http://127.0.0.1:10809';
  proxyConfig.httpAgent = proxyUrl;
  proxyConfig.httpsAgent = proxyUrl;
}

// 初始化 Providers
const google = createGoogleGenerativeAI({
  apiKey: env.GOOGLE_AI_STUDIO_API_KEY || process.env.GOOGLE_AI_STUDIO_API_KEY,
  ...proxyConfig,
  // 新增：添加30秒超时，防止请求挂起
  fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(30000) }),
});

const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY,
  ...proxyConfig,
});

console.log('[AI Provider] Proxy config:', proxyConfig);

interface GetAIModelOptions {
  provider: 'gemini' | 'deepseek' | string;
  modelId?: string;
  enableThinking?: boolean;
}

interface AIModelResult {
  model: any;
  providerOptions: any;
}

export function getAIModel({ provider, modelId, enableThinking }: GetAIModelOptions): AIModelResult {
  const effectiveModelId = modelId || (provider === 'gemini' ? 'gemini-2.5-flash' : 'deepseek-chat');
  let model: any;
  let providerOptions: any = {};

  if (provider === 'gemini') {
    model = google(effectiveModelId);
    
    // Gemini 思考模式配置
    if (enableThinking && (effectiveModelId.includes('gemini-3') || effectiveModelId.includes('gemini-2.5'))) {
      const thinkingConfig: any = { includeThoughts: true };
      
      if (effectiveModelId.includes('gemini-3')) {
        // 3.0 Pro: 使用 thinkingLevel
        thinkingConfig.thinkingLevel = 'high';
      } else if (effectiveModelId === 'gemini-2.5-flash') {
        // 2.5 Flash: 需要 thinkingBudget 来启用思考
        thinkingConfig.thinkingBudget = 8192;
      }
      // 2.5 Pro: 只需 includeThoughts: true
      
      providerOptions = {
        google: { thinkingConfig } satisfies GoogleGenerativeAIProviderOptions,
      };
      console.log(`[AI Provider] Gemini thinking enabled for ${effectiveModelId}`);
    }
  } else if (provider === 'deepseek') {
    model = deepseek(effectiveModelId);
  } else {
    // 默认回退
    model = deepseek('deepseek-chat');
  }

  return { model, providerOptions };
}
