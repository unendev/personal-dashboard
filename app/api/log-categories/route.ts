import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

export async function GET() {
  try {
    const jsonDirectory = path.join(process.cwd(), 'data');
    const fileContents = await fs.readFile(jsonDirectory + '/log-categories.json', 'utf8');
    const categories = JSON.parse(fileContents);
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Failed to read log categories:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
