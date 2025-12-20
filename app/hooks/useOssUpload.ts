import { useState } from 'react';

/**
 * 通用 OSS 上传 Hook
 * 封装了获取签名、直传 OSS、获取签名 URL 的全流程
 */
export function useOssUpload() {
  const [isUploading, setIsUploading] = useState(false);

  const upload = async (file: File): Promise<string> => {
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
      
      // 检查是否配置了 OSS，未配置则降级为 Base64
      if (signatureData.error) {
        console.warn('OSS 未配置，使用本地 Base64 预览');
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }

      // 2. 构建表单数据
      const formData = new FormData();
      formData.append('key', signatureData.key);
      formData.append('policy', signatureData.policy);
      formData.append('OSSAccessKeyId', signatureData.accessKeyId);
      formData.append('signature', signatureData.signature);
      formData.append('success_action_status', '200');
      formData.append('file', file);

      // 3. 上传到 OSS
      const uploadRes = await fetch(signatureData.endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error('OSS 上传请求失败');
      }

      // 4. 构建基础 URL
      const baseUrl = (signatureData.cdnUrl || signatureData.endpoint).trim().replace(/\/+$/, '');
      const normalizedKey = signatureData.key.replace(/^\/+/, '');
      const imageUrl = `${baseUrl}/${normalizedKey}`;
      
      // 5. 获取签名 URL (用于访问私有 Bucket)
      try {
        const signUrlRes = await fetch('/api/upload/oss/sign-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: imageUrl }),
        });
        
        if (signUrlRes.ok) {
          const { signedUrl } = await signUrlRes.json();
          return signedUrl;
        } else {
          console.warn('⚠️ 生成签名 URL 失败，使用原始 URL');
          return imageUrl;
        }
      } catch (signError) {
        console.warn('⚠️ 签名 URL 请求失败，使用原始 URL:', signError);
        return imageUrl;
      }
    } catch (error) {
      console.error('图片上传流程失败:', error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  return { upload, isUploading };
}
