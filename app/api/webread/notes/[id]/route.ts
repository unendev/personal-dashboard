import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { note, highlight } = await request.json();

    const bookNote = await prisma.bookNote.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
    });

    if (!bookNote) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    const updatedNote = await prisma.bookNote.update({
      where: { id: id },
      data: {
        note: note !== undefined ? note : bookNote.note,
        highlight: highlight !== undefined ? highlight : bookNote.highlight,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(updatedNote);
  } catch (error) {
    console.error('Update note error:', error);
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const bookNote = await prisma.bookNote.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
    });

    if (!bookNote) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    await prisma.bookNote.delete({
      where: { id: id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete note error:', error);
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}
