import { NextRequest, NextResponse } from 'next/server';
import { generateUploadSignature } from '@/lib/oss-config';

// POST /api/upload/oss/signature - 获取阿里云 OSS 直传签名
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filename, contentType } = body;

    if (!filename || !contentType) {
      return NextResponse.json({ 
        error: 'filename and contentType are required' 
      }, { status: 400 });
    }

    // 验证文件类型
    const allowedTypes = [
      'image/jpeg',
      'image/png', 
      'image/gif',
      'image/webp',
      'image/svg+xml'
    ];

    if (!allowedTypes.includes(contentType)) {
      return NextResponse.json({ 
        error: 'Unsupported file type' 
      }, { status: 400 });
    }

    // 验证文件大小（前端限制）
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (body.size && body.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 10MB' 
      }, { status: 400 });
    }

    const signature = await generateUploadSignature(filename, contentType);

    return NextResponse.json(signature);
  } catch (error) {
    console.error('Error generating OSS signature:', error);
    return NextResponse.json({ 
      error: 'Failed to generate upload signature' 
    }, { status: 500 });
  }
}
