"use server";

import { revalidatePath } from 'next/cache';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

// Helper for logging
const log = (action: string, details: object) => {
  console.log(`[Action: ${action}]`, JSON.stringify(details, null, 2));
};

interface NotePayload {
  content: string;
  sourceText: string;
}

interface FlashcardPayload {
  front: string;
  back: string;
}

/**
 * Creates a new Russian Learning Note for the logged-in user.
 */
export async function createNote(payload: NotePayload) {
  const session = await getServerSession(authOptions);
  log('createNote', { userId: session?.user?.id, hasPayload: !!payload });
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  try {
    const note = await prisma.russianLearningNote.create({
      data: {
        userId: session.user.id,
        content: payload.content,
        sourceText: payload.sourceText,
      },
    });
    revalidatePath('/notes');
    log('createNote', { status: 'success', noteId: note.id });
    return { success: true };
  } catch (error) {
    console.error('Failed to create note:', error);
    return { error: 'Failed to save the note.' };
  }
}

/**
 * Creates a new Flashcard for the logged-in user.
 */
export async function createFlashcard(payload: FlashcardPayload) {
  const session = await getServerSession(authOptions);
  log('createFlashcard', { userId: session?.user?.id, hasPayload: !!payload });
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  try {
    const flashcard = await prisma.flashcard.create({
      data: {
        userId: session.user.id,
        front: payload.front,
        back: payload.back,
      },
    });
    revalidatePath('/review');
    log('createFlashcard', { status: 'success', flashcardId: flashcard.id });
    return { success: true };
  } catch (error) {
    console.error('Failed to create flashcard:', error);
    return { error: 'Failed to save the flashcard.' };
  }
}

/**
 * Updates a flashcard's review stage and next review date based on performance.
 */
export async function updateFlashcardReview(cardId: string, performance: 'Forgot' | 'Good' | 'Easy') {
  const session = await getServerSession(authOptions);
  log('updateFlashcardReview', { userId: session?.user?.id, cardId, performance });
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  try {
    const card = await prisma.flashcard.findUnique({
      where: { id: cardId, userId: session.user.id },
    });

    if (!card) {
      log('updateFlashcardReview', { status: 'error', reason: 'Card not found' });
      return { error: 'Card not found' };
    }

    let newStage = card.stage;
    const now = new Date();

    const addDays = (date: Date, days: number): Date => {
      const result = new Date(date);
      result.setDate(result.getDate() + days);
      return result;
    };

    let nextReviewDate: Date;

    switch (performance) {
      case 'Forgot':
        newStage = 0;
        nextReviewDate = addDays(now, 1);
        break;
      case 'Good':
        newStage += 1;
        nextReviewDate = addDays(now, Math.pow(2, newStage - 1));
        break;
      case 'Easy':
        newStage += 2;
        nextReviewDate = addDays(now, Math.pow(2, newStage - 1));
        break;
      default:
        log('updateFlashcardReview', { status: 'error', reason: 'Invalid performance rating' });
        return { error: 'Invalid performance rating.' };
    }

    await prisma.flashcard.update({
      where: { id: cardId },
      data: {
        stage: newStage,
        nextReviewAt: nextReviewDate,
      },
    });

    revalidatePath('/review');
    log('updateFlashcardReview', { status: 'success', cardId, newStage });
    return { success: true };

  } catch (error) {
    console.error('Failed to update flashcard review:', error);
    return { error: 'Failed to update the flashcard.' };
  }
}

// === Conversation Actions ===

export async function getConversationList() {
  const session = await getServerSession(authOptions);
  log('getConversationList', { userId: session?.user?.id });
  if (!session?.user?.id) {
    return [];
  }

  const conversations = await prisma.conversation.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
  });
  log('getConversationList', { status: 'success', count: conversations.length });
  return conversations;
}

export async function createConversation() {
  const session = await getServerSession(authOptions);
  log('createConversation', { userId: session?.user?.id });
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const newConversation = await prisma.conversation.create({
    data: {
      userId: session.user.id,
      title: '新对话',
    },
  });
  
  revalidatePath('/russian');
  log('createConversation', { status: 'success', newConversationId: newConversation.id });
  return newConversation;
}

export async function getConversationMessages(conversationId: string) {
  const session = await getServerSession(authOptions);
  log('getConversationMessages', { userId: session?.user?.id, conversationId });
  if (!session?.user?.id) {
    return [];
  }

  const messages = await prisma.chatMessage.findMany({
    where: {
      conversation: {
        id: conversationId,
        userId: session.user.id,
      },
    },
    orderBy: { createdAt: 'asc' },
  });
  
  log('getConversationMessages', { status: 'success', count: messages.length });
  return messages.map(msg => ({ id: msg.id, role: msg.role as 'user' | 'assistant' | 'system', content: msg.content }));
}


interface ChatMessagePayload {
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
}

export async function saveChatMessage(payload: ChatMessagePayload) {
  const session = await getServerSession(authOptions);
  log('saveChatMessage', { userId: session?.user?.id, conversationId: payload.conversationId, role: payload.role });
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }
  
  try {
    const [, message] = await prisma.$transaction([
      prisma.conversation.update({
        where: { id: payload.conversationId },
        data: { updatedAt: new Date() },
      }),
      prisma.chatMessage.create({
        data: {
          conversationId: payload.conversationId,
          role: payload.role,
          content: payload.content,
        },
      }),
    ]);
    
    revalidatePath(`/russian/${payload.conversationId}`);
    log('saveChatMessage', { status: 'success', messageId: message.id });
    return { success: true, message };
  } catch (error) {
    console.error('Failed to save chat message:', error);
    return { error: 'Failed to save chat message.' };
  }
}

export async function updateConversationTitle(conversationId: string, title: string) {
    const session = await getServerSession(authOptions);
    log('updateConversationTitle', { userId: session?.user?.id, conversationId, title });
    if (!session?.user?.id) {
        return { error: 'Unauthorized' };
    }
    
    await prisma.conversation.updateMany({
        where: { id: conversationId, userId: session.user.id },
        data: { title },
    });
    revalidatePath('/russian');
    revalidatePath(`/russian/${conversationId}`);
    log('updateConversationTitle', { status: 'success', conversationId });
}

export async function deleteConversation(conversationId: string) {
  const session = await getServerSession(authOptions);
  log('deleteConversation', { userId: session?.user?.id, conversationId });
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  try {
    await prisma.conversation.delete({
      where: {
        id: conversationId,
        userId: session.user.id,
      },
    });

    revalidatePath('/russian');
    log('deleteConversation', { status: 'success', conversationId });
    return { success: true };
  } catch (error) {
    console.error(`Failed to delete conversation ${conversationId}:`, error);
    log('deleteConversation', { status: 'error', conversationId, error });
    return { error: 'Failed to delete conversation.' };
  }
}
