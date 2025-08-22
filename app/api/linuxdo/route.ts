import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET() {
  try {
    // 读取Linux.do报告文件
    const filePath = path.join(process.cwd(), 'config', 'linuxdo-report.json');
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContents);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reading Linux.do report:', error);
    return NextResponse.json(
      { error: 'Failed to load Linux.do report' },
      { status: 500 }
    );
  }
}