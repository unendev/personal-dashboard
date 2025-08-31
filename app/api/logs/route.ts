import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

// 日志数据类型
interface LogData {
  [key: string]: unknown;
}

export async function POST(request: Request) {
  try {
    const log = await request.json();
    const jsonDirectory = path.join(process.cwd(), 'data');
    const filePath = jsonDirectory + '/logs.json';

    let existingLogs: LogData[] = [];
    try {
      const fileContents = await fs.readFile(filePath, 'utf8');
      existingLogs = JSON.parse(fileContents);
    } catch (readError: unknown) {
      if (readError instanceof Error && 'code' in readError && readError.code === 'ENOENT') {
        // 文件不存在，初始化为空数组
        existingLogs = [];
      } else {
        console.error('Failed to read existing logs:', readError);
        return new NextResponse('Internal Server Error', { status: 500 });
      }
    }

    const newLog = { ...log, timestamp: new Date().toISOString() };
    existingLogs.push(newLog);

    await fs.writeFile(filePath, JSON.stringify(existingLogs, null, 2), 'utf8');

    return NextResponse.json({ message: 'Log saved successfully', log: newLog });
  } catch (error) {
    console.error('Failed to save log:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function GET() {
  try {
    const jsonDirectory = path.join(process.cwd(), 'data');
    const filePath = jsonDirectory + '/logs.json';

    let existingLogs: LogData[] = [];
    try {
      const fileContents = await fs.readFile(filePath, 'utf8');
      existingLogs = JSON.parse(fileContents);
    } catch (readError: unknown) {
      if (readError instanceof Error && 'code' in readError && readError.code === 'ENOENT') {
        // 文件不存在，返回空数组
        existingLogs = [];
      } else {
        console.error('Failed to read logs:', readError);
        return new NextResponse('Internal Server Error', { status: 500 });
      }
    }
    return NextResponse.json(existingLogs);
  } catch (error) {
    console.error('Failed to get logs:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
