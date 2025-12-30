import { useState } from 'react';

export interface UploadResult {
  originalUrl: string;
  signedUrl: string;
}

interface UploadOptions {
  onProgress?: (progress: number) => void;
}

/**
 * 通用 OSS 上传 Hook (升级版)
 * 支持进度监听和返回完整 URL 信息
 */
export function useOssUpload() {
  const [isUploading, setIsUploading] = useState(false);

  const upload = async (file: File, options?: UploadOptions): Promise<UploadResult> => {
    setIsUploading(true);
    try {
      // 1. 获取上传签名
      const signatureUrl = new URL('/api/upload/oss/signature', window.location.origin);
      signatureUrl.searchParams.set('filename', file.name);
      signatureUrl.searchParams.set('contentType', file.type);
      
      const signatureRes = await fetch(signatureUrl.toString());
      if (!signatureRes.ok) {
        const errorData = await signatureRes.json().catch(() => ({}));
        throw new Error(`获取上传签名失败: ${errorData.error || signatureRes.statusText}`);
      }
      
      const signatureData = await signatureRes.json();
      
      // 检查是否配置了 OSS
      if (signatureData.error) {
        console.warn('OSS 未配置，使用本地 Base64 预览');
        const mockUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        return { originalUrl: mockUrl, signedUrl: mockUrl };
      }

      // 2. 构建表单数据
      const formData = new FormData();
      formData.append('key', signatureData.key);
      formData.append('policy', signatureData.policy);
      formData.append('OSSAccessKeyId', signatureData.accessKeyId);
      formData.append('signature', signatureData.signature);
      formData.append('success_action_status', '200');
      formData.append('file', file);

      // 3. 上传到 OSS (使用 XHR 以支持进度)
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        if (options?.onProgress) {
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const percent = Math.round((e.loaded / e.total) * 100);
              options.onProgress?.(percent);
            }
          });
        }

        xhr.addEventListener('load', () => {
          if (xhr.status === 200 || xhr.status === 204) {
            resolve();
          } else {
            reject(new Error(`OSS上传失败: ${xhr.status}`));
          }
        });
        
        xhr.addEventListener('error', () => reject(new Error('网络错误')));
        xhr.addEventListener('abort', () => reject(new Error('上传取消')));
        
        xhr.open('POST', signatureData.endpoint);
        xhr.send(formData);
      });

      // 4. 构建基础 URL
      const baseUrl = (signatureData.cdnUrl || signatureData.endpoint).trim().replace(/\/+$/, '');
      const normalizedKey = signatureData.key.replace(/^\/+/, '');
      const originalUrl = `${baseUrl}/${normalizedKey}`;
      
      // 5. 获取签名 URL
      let signedUrl = originalUrl;
      try {
        const signUrlRes = await fetch('/api/upload/oss/sign-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: originalUrl }),
        });
        
        if (signUrlRes.ok) {
          const data = await signUrlRes.json();
          signedUrl = data.signedUrl;
        }
      } catch (e) {
        console.warn('签名 URL 获取失败，使用原始 URL', e);
      }

      return { originalUrl, signedUrl };
    } catch (error) {
      console.error('图片上传流程失败:', error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  return { upload, isUploading };
}