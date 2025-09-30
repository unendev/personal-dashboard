import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// 阿里云 OSS 配置（从环境变量读取）
const OSS_CONFIG = {
  accessKeyId: process.env.ALIYUN_OSS_ACCESS_KEY_ID || '',
  accessKeySecret: process.env.ALIYUN_OSS_ACCESS_KEY_SECRET || '',
  bucket: process.env.ALIYUN_OSS_BUCKET || '',
  region: process.env.ALIYUN_OSS_REGION || 'oss-cn-hangzhou',
  endpoint: process.env.ALIYUN_OSS_ENDPOINT || '',
}

export async function GET(request: NextRequest) {
  try {
    // 检查配置
    if (!OSS_CONFIG.accessKeyId || !OSS_CONFIG.accessKeySecret || !OSS_CONFIG.bucket) {
      return NextResponse.json(
        { error: 'OSS 配置未完成，请设置环境变量' },
        { status: 500 }
      )
    }

    // 生成唯一文件名
    const timestamp = Date.now()
    const randomStr = crypto.randomBytes(8).toString('hex')
    const fileKey = `treasure-images/${timestamp}-${randomStr}`

    // 设置过期时间（1小时后）
    const expireTime = new Date(Date.now() + 3600 * 1000).toISOString()

    // 构建 Policy
    const policyString = JSON.stringify({
      expiration: expireTime,
      conditions: [
        ['content-length-range', 0, 10485760], // 最大 10MB
        { bucket: OSS_CONFIG.bucket },
        ['starts-with', '$key', 'treasure-images/'],
      ]
    })

    const policy = Buffer.from(policyString).toString('base64')

    // 计算签名
    const signature = crypto
      .createHmac('sha1', OSS_CONFIG.accessKeySecret)
      .update(policy)
      .digest('base64')

    // 构建完整的 OSS endpoint，确保有 https:// 协议头
    let ossEndpoint = OSS_CONFIG.endpoint || `https://${OSS_CONFIG.bucket}.${OSS_CONFIG.region}.aliyuncs.com`
    
    // 如果 endpoint 不包含协议头，自动添加 https://
    if (ossEndpoint && !ossEndpoint.startsWith('http://') && !ossEndpoint.startsWith('https://')) {
      ossEndpoint = `https://${ossEndpoint}`
    }
    
    // 返回签名数据
    return NextResponse.json({
      accessKeyId: OSS_CONFIG.accessKeyId,
      policy,
      signature,
      key: fileKey,
      endpoint: ossEndpoint,
      cdnUrl: process.env.ALIYUN_OSS_CDN_URL || ossEndpoint,
      bucket: OSS_CONFIG.bucket
    })
  } catch (error) {
    console.error('Error generating OSS signature:', error)
    return NextResponse.json(
      { error: '生成上传签名失败' },
      { status: 500 }
    )
  }
}