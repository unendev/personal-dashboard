/**
 * 网络请求工具函数
 * 提供带重试机制的 fetch 封装
 */

/**
 * 增强版 fetch 重试函数
 * @param url 请求 URL
 * @param options fetch 选项
 * @param maxRetries 最大重试次数，默认 3 次
 * @param onRetry 重试回调函数，接收当前重试次数
 * @returns Promise<Response>
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3,
  onRetry?: (attempt: number, error: Error) => void
): Promise<Response> {
  const delays = [100, 500, 1000]; // 递增的重试延迟（毫秒）
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      // 如果响应成功或者是客户端错误（4xx），不重试
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }
      
      // 服务器错误（5xx）或其他错误，需要重试
      if (attempt < maxRetries) {
        const delay = delays[attempt] || 1000;
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        
        if (onRetry) {
          onRetry(attempt + 1, error);
        }
        
        console.warn(`请求失败 (尝试 ${attempt + 1}/${maxRetries}): ${url}`, error.message);
        await sleep(delay);
        continue;
      }
      
      return response;
    } catch (error) {
      // 网络错误、超时等
      if (attempt < maxRetries) {
        const delay = delays[attempt] || 1000;
        const err = error instanceof Error ? error : new Error('Unknown error');
        
        if (onRetry) {
          onRetry(attempt + 1, err);
        }
        
        console.warn(`请求失败 (尝试 ${attempt + 1}/${maxRetries}): ${url}`, err.message);
        await sleep(delay);
        continue;
      }
      
      throw error;
    }
  }
  
  throw new Error(`请求失败：已达到最大重试次数 (${maxRetries})`);
}

/**
 * 延迟函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 带重试的 JSON POST 请求
 */
export async function postJSON<T = any>(
  url: string,
  data: any,
  maxRetries: number = 3,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  const response = await fetchWithRetry(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    },
    maxRetries,
    onRetry
  );
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`请求失败 (${response.status}): ${errorText}`);
  }
  
  return response.json();
}

/**
 * 带重试的 JSON PUT 请求
 */
export async function putJSON<T = any>(
  url: string,
  data: any,
  maxRetries: number = 3,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  const response = await fetchWithRetry(
    url,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    },
    maxRetries,
    onRetry
  );
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`请求失败 (${response.status}): ${errorText}`);
  }
  
  return response.json();
}

/**
 * 带重试的 DELETE 请求
 */
export async function deleteRequest(
  url: string,
  maxRetries: number = 3,
  onRetry?: (attempt: number, error: Error) => void
): Promise<void> {
  const response = await fetchWithRetry(
    url,
    {
      method: 'DELETE',
    },
    maxRetries,
    onRetry
  );
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`删除失败 (${response.status}): ${errorText}`);
  }
}

