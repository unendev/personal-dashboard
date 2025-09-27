import OSS from 'ali-oss';

// 阿里云 OSS 配置
const ossConfig = {
  region: process.env.OSS_REGION || 'oss-cn-hangzhou',
  accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET!,
  bucket: process.env.OSS_BUCKET_NAME!,
};

// 创建 OSS 客户端
const client = new OSS(ossConfig);

// 生成上传签名
export async function generateUploadSignature(filename: string, contentType: string) {
  try {
    // 生成唯一文件名
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const ext = filename.split('.').pop();
    const objectName = `treasures/${timestamp}-${randomStr}.${ext}`;

    // 设置上传策略
    const policy = {
      expiration: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1小时过期
      conditions: [
        ['content-length-range', 0, 10 * 1024 * 1024], // 最大10MB
        ['starts-with', '$key', 'treasures/'],
        ['eq', '$Content-Type', contentType],
      ],
    };

    // 生成签名
    const signature = client.signatureUrl(objectName, {
      expires: 3600, // 1小时
      method: 'PUT',
      'Content-Type': contentType,
    });

    return {
      uploadUrl: signature,
      objectName,
      publicUrl: `https://${ossConfig.bucket}.${ossConfig.region}.aliyuncs.com/${objectName}`,
    };
  } catch (error) {
    console.error('Error generating upload signature:', error);
    throw new Error('Failed to generate upload signature');
  }
}

export { client };
