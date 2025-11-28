"use client";

import { useState, useTransition } from 'react';
import { Flashcard } from '@prisma/client';
import { updateFlashcardReview } from '../russian/actions';
import Link from 'next/link';

interface FlashcardReviewClientProps {
  initialCards: Flashcard[];
}

export function FlashcardReviewClient({ initialCards }: FlashcardReviewClientProps) {
  const [cards, setCards] = useState(initialCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleUpdateReview = (performance: 'Forgot' | 'Good' | 'Easy') => {
    startTransition(async () => {
      const cardId = cards[currentIndex].id;
      await updateFlashcardReview(cardId, performance);
      
      // Move to the next card
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    });
  };

  if (cards.length === 0) {
    return <p className="text-center text-gray-500 dark:text-gray-400">没有需要复习的卡片。太棒了！</p>;
  }

  if (currentIndex >= cards.length) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold text-green-600">复习完成！</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">今天的所有卡片都已复习完毕。</p>
        <Link href="/russian" className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          返回学习页面
        </Link>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  return (
    <div className="max-w-xl mx-auto">
      <div className="relative h-64">
        {/* Card Front */}
        <div className={`absolute inset-0 bg-white dark:bg-gray-800 shadow-lg rounded-lg flex items-center justify-center p-4 transition-transform duration-500 ${isFlipped ? '[transform:rotateY(180deg)]' : ''} [backface-visibility:hidden]`}>
          <p className="text-2xl font-semibold">{currentCard.front}</p>
        </div>
        
        {/* Card Back */}
        <div className={`absolute inset-0 bg-gray-100 dark:bg-gray-700 shadow-lg rounded-lg flex items-center justify-center p-4 transition-transform duration-500 ${!isFlipped ? '[transform:rotateY(180deg)]' : ''} [backface-visibility:hidden]`}>
          <p className="text-xl text-gray-800 dark:text-gray-200">{currentCard.back}</p>
        </div>
      </div>
      
      <div className="mt-6 flex flex-col items-center">
        {isPending ? (
          <p className="animate-pulse">处理中...</p>
        ) : !isFlipped ? (
          <button 
            onClick={() => setIsFlipped(true)}
            className="w-full py-3 bg-blue-600 text-white rounded-md text-lg font-semibold hover:bg-blue-700"
          >
            显示答案
          </button>
        ) : (
          <div className="grid grid-cols-3 gap-4 w-full">
            <button 
              onClick={() => handleUpdateReview('Forgot')}
              className="py-3 bg-red-500 text-white rounded-md font-semibold hover:bg-red-600"
            >
              忘记
            </button>
            <button 
              onClick={() => handleUpdateReview('Good')}
              className="py-3 bg-green-500 text-white rounded-md font-semibold hover:bg-green-600"
            >
              掌握
            </button>
            <button 
              onClick={() => handleUpdateReview('Easy')}
              className="py-3 bg-blue-500 text-white rounded-md font-semibold hover:bg-blue-600"
            >
              简单
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 text-center text-sm text-gray-500">
        剩余卡片: {cards.length - currentIndex} / {cards.length}
      </div>
    </div>
  );
}
