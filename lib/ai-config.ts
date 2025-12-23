/**
 * AI 配置管理
 * 支持多种 AI 提供商：DeepSeek, Gemini, Custom
 * 每个提供商的配置独立保存
 */

export interface AIConfig {
  provider: 'deepseek' | 'gemini' | 'custom';
  apiKey: string;
  baseUrl?: string;
  model: string;
  enabled: boolean;
}

const DEFAULT_CONFIGS: Record<string, AIConfig> = {
  deepseek: {
    provider: 'deepseek',
    apiKey: '',
    baseUrl: '',
    model: 'deepseek-chat',
    enabled: true,
  },
  gemini: {
    provider: 'gemini',
    apiKey: '',
    baseUrl: '',
    model: 'gemini-2.5-flash',
    enabled: true,
  },
  custom: {
    provider: 'custom',
    apiKey: '',
    baseUrl: '',
    model: 'custom',
    enabled: true,
  },
};

const STORAGE_PREFIX = 'webread-ai-config-';
const PROVIDER_KEY = 'webread-ai-provider';

/**
 * 获取存储键
 */
function getStorageKey(provider: string): string {
  return `${STORAGE_PREFIX}${provider}`;
}

/**
 * 获取当前选中的提供商
 */
function getCurrentProvider(): 'deepseek' | 'gemini' | 'custom' {
  if (typeof window === 'undefined') return 'deepseek';
  
  try {
    const provider = localStorage.getItem(PROVIDER_KEY);
    if (provider && ['deepseek', 'gemini', 'custom'].includes(provider)) {
      return provider as 'deepseek' | 'gemini' | 'custom';
    }
  } catch (e) {
    console.error('[AIConfig] Failed to load provider:', e);
  }
  
  return 'deepseek';
}

/**
 * 获取 AI 配置（当前选中的 provider）
 */
export function getAIConfig(): AIConfig {
  if (typeof window === 'undefined') {
    return DEFAULT_CONFIGS.deepseek;
  }
  
  try {
    const provider = getCurrentProvider();
    const storageKey = getStorageKey(provider);
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
      return { ...DEFAULT_CONFIGS[provider], ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('[AIConfig] Failed to load config:', e);
  }
  
  const provider = getCurrentProvider();
  return DEFAULT_CONFIGS[provider];
}

/**
 * 获取指定 provider 的配置（用于切换 provider 时加载已保存的配置）
 */
export function getProviderConfig(provider: AIConfig['provider']): AIConfig {
  if (typeof window === 'undefined') {
    return DEFAULT_CONFIGS[provider];
  }
  
  try {
    const storageKey = getStorageKey(provider);
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
      return { ...DEFAULT_CONFIGS[provider], ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('[AIConfig] Failed to load provider config:', e);
  }
  
  return DEFAULT_CONFIGS[provider];
}

/**
 * 保存 AI 配置
 */
export function setAIConfig(config: Partial<AIConfig>): void {
  if (typeof window === 'undefined') return;
  
  try {
    const provider = config.provider || getCurrentProvider();
    const current = getAIConfig();
    const newConfig = { ...current, ...config, provider };
    
    // 保存该提供商的配置
    const storageKey = getStorageKey(provider);
    localStorage.setItem(storageKey, JSON.stringify(newConfig));
    
    // 保存当前选中的提供商
    localStorage.setItem(PROVIDER_KEY, provider);
    
    console.log('[AIConfig] Config saved:', provider, newConfig.model);
  } catch (e) {
    console.error('[AIConfig] Failed to save config:', e);
  }
}

/**
 * 获取提供商的默认模型列表
 */
export function getProviderModels(provider: AIConfig['provider']): { id: string; name: string }[] {
  switch (provider) {
    case 'deepseek':
      return [
        { id: 'deepseek-chat', name: 'DeepSeek Chat' },
        { id: 'deepseek-reasoner', name: 'DeepSeek R1 (推理)' },
      ];
    case 'gemini':
      return [
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
        { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
        { id: 'gemini-3-pro-preview', name: 'Gemini 3.0 Pro' },
      ];
    case 'custom':
      return [
        { id: 'custom', name: '自定义模型' },
      ];
    default:
      return [];
  }
}

/**
 * 获取提供商的默认 Base URL
 * 注意：Gemini 不需要 baseUrl，使用 SDK 默认值
 */
export function getProviderBaseUrl(provider: AIConfig['provider']): string {
  switch (provider) {
    case 'deepseek':
      return 'https://api.deepseek.com/v1';
    case 'gemini':
      return ''; // Gemini 使用 SDK 默认值，不需要设置
    case 'custom':
      return '';
    default:
      return '';
  }
}
