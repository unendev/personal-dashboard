'use client';

import { create } from 'zustand';
import { Book } from 'epubjs';

export interface ReaderBubble {
  id: string;
  cfi: string;
  snippet: string;
  fullAnalysis?: string;
  type?: string;
}

interface WebReadState {
  // 书籍状态
  book: Book | null;
  setBook: (book: Book | null) => void;
  
  // 进度状态
  currentCfi: string;
  progress: number;
  setCurrentLocation: (cfi: string, progress: number) => void;
  
  // UI 状态
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  theme: 'light' | 'sepia' | 'dark';
  setTheme: (theme: 'light' | 'sepia' | 'dark') => void;

  // AI & 交互状态
  selection: { text: string; cfiRange: string } | null;
  setSelection: (sel: { text: string; cfiRange: string } | null) => void;
  
  // 灵感气泡 (Heptapod Bubbles)
  bubbles: ReaderBubble[];
  addBubble: (bubble: ReaderBubble) => void;
}

export const useReaderStore = create<WebReadState>((set) => ({
  book: null,
  setBook: (book) => set({ book }),
  
  currentCfi: '',
  progress: 0,
  setCurrentLocation: (cfi, progress) => set({ currentCfi: cfi, progress }),
  
  sidebarOpen: false, // 默认关闭，减少干扰
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  
  fontSize: 18,
  setFontSize: (size) => set({ fontSize: size }),
  
  theme: 'light',
  setTheme: (theme) => set({ theme }),
  
  selection: null,
  setSelection: (selection) => set({ selection }),
  
  bubbles: [],
  addBubble: (bubble) => set((state) => ({ bubbles: [...state.bubbles, bubble] })),
}));
