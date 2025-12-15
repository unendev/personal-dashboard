import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// 阿里云 OSS 配置
const OSS_CONFIG = {
  accessKeyId: process.env.ALIYUN_OSS_ACCESS_KEY_ID || '',
  accessKeySecret: process.env.ALIYUN_OSS_ACCESS_KEY_SECRET || '',
  bucket: process.env.ALIYUN_OSS_BUCKET || '',
  region: process.env.ALIYUN_OSS_REGION || 'oss-cn-hangzhou',
  endpoint: process.env.ALIYUN_OSS_ENDPOINT || '',
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const missingVars = []
    if (!OSS_CONFIG.accessKeyId) missingVars.push('ALIYUN_OSS_ACCESS_KEY_ID')
    if (!OSS_CONFIG.accessKeySecret) missingVars.push('ALIYUN_OSS_ACCESS_KEY_SECRET') 
    if (!OSS_CONFIG.bucket) missingVars.push('ALIYUN_OSS_BUCKET')
    
    if (missingVars.length > 0) {
      console.error('OSS Configuration Missing:', missingVars)
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('filename') || 'book.epub'
    
    // 生成唯一文件名
    const timestamp = Date.now()
    const randomStr = crypto.randomBytes(4).toString('hex')
    // 保持扩展名
    const parts = filename.split('.')
    const ext = parts.length > 1 ? parts.pop() : 'epub'
    const cleanName = parts.join('.').replace(/[^a-zA-Z0-9-_]/g, '')
    
    const fileKey = `books/${session.user.id}/${timestamp}-${randomStr}.${ext}`

    // 1小时过期
    const expireTime = new Date(Date.now() + 3600 * 1000).toISOString()

    // Policy: 允许 100MB
    const policyString = JSON.stringify({
      expiration: expireTime,
      conditions: [
        ['content-length-range', 0, 104857600], // 100MB
        { bucket: OSS_CONFIG.bucket },
        ['starts-with', '$key', `books/${session.user.id}/`],
      ]
    })

    const policy = Buffer.from(policyString).toString('base64')
    const signature = crypto
      .createHmac('sha1', OSS_CONFIG.accessKeySecret)
      .update(policy)
      .digest('base64')

    let ossEndpoint = OSS_CONFIG.endpoint || `https://${OSS_CONFIG.bucket}.${OSS_CONFIG.region}.aliyuncs.com`
    if (ossEndpoint && !ossEndpoint.startsWith('http')) {
      ossEndpoint = `https://${ossEndpoint}`
    }
    
    return NextResponse.json({
      accessKeyId: OSS_CONFIG.accessKeyId,
      policy,
      signature,
      key: fileKey,
      endpoint: ossEndpoint,
      url: `${ossEndpoint}/${fileKey}` // 预估的最终 URL
    })
  } catch (error) {
    console.error('OSS Sign Error:', error)
    return NextResponse.json({ error: 'Signature generation failed' }, { status: 500 })
  }
}
