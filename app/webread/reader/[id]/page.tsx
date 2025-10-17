'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Rendition, Book as EpubBook } from 'epubjs';
import { ArrowLeft, Settings, BookOpen, Eye, EyeOff } from 'lucide-react';
import AITranslationModal from '@/app/components/webread/AITranslationModal';

interface Book {
  id: string;
  title: string;
  author: string | null;
  fileUrl: string;
  fileSize: number;
  uploadDate: string;
  coverUrl: string | null;
}

interface ReadingProgress {
  id: string;
  bookId: string;
  currentChapter: string;
  progress: number;
  lastReadAt: string;
  cfi?: string;
}

// EPUB.js event types
interface RelocatedLocation {
  start: {
    cfi: string;
    percentage: number;
    href?: string;
  };
  end: {
    cfi: string;
  };
}

interface SelectedContents {
  window: Window;
}

interface RenderedSection {
  id: string;
  href: string;
}


export default function EpubReaderPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = params.id as string;
  
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ReadingProgress | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [lineHeight, setLineHeight] = useState(1.6);
  const [layoutMode, setLayoutMode] = useState<'paginated' | 'scrolled'>('paginated');
  const [theme, setTheme] = useState<'light' | 'dark' | 'sepia'>('sepia');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showTranslationModal, setShowTranslationModal] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [rendition, setRendition] = useState<Rendition | null>(null);
  
  const epubContainerRef = useRef<HTMLDivElement>(null);
  const epubRef = useRef<EpubBook | null>(null);

  // 测试文件 URL 可访问性
  const testFileUrl = async (fileUrl: string) => {
    try {
      console.log('Testing file URL accessibility:', fileUrl);
      const response = await fetch(fileUrl, { method: 'HEAD' });
      console.log('File URL test result:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      if (!response.ok) {
        throw new Error(`File not accessible: ${response.status} ${response.statusText}`);
      }
      
      return true;
    } catch (error) {
      console.error('File URL test failed:', error);
      setError(`文件无法访问: ${error instanceof Error ? error.message : '未知错误'}`);
      return false;
    }
  };

  // 获取书籍信息
  const fetchBook = async () => {
    try {
      const response = await fetch(`/api/webread/books/${bookId}`);
      if (response.ok) {
        const bookData = await response.json();
        console.log('Book data fetched:', bookData);
        setBook(bookData);
        
        // 测试文件 URL 可访问性
        if (bookData.fileUrl) {
          await testFileUrl(bookData.fileUrl);
        }
      } else {
        setError('书籍不存在或无权访问');
      }
    } catch (error) {
      console.error('Failed to fetch book:', error);
      setError('获取书籍信息失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取阅读进度
  const fetchProgress = async () => {
    try {
      const response = await fetch(`/api/webread/progress/${bookId}`);
      if (response.ok) {
        const progressData = await response.json();
        console.log('Progress data fetched:', progressData);
        setProgress(progressData);
      } else {
        console.log('No progress found or error:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch progress:', error);
    }
  };

  // 保存阅读进度
  const saveProgress = async (chapter: string, progressValue: number, cfi: string) => {
    try {
      console.log('Saving progress:', { bookId, chapter, progressValue, cfi });
      const response = await fetch(`/api/webread/progress/${bookId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chapter,
          progress: progressValue,
          cfi: cfi,
        }),
      });
      
      if (response.ok) {
        console.log('Progress saved successfully');
      } else {
        console.error('Failed to save progress:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  };

  // 应用主题和样式
  const applyThemeStyles = (renditionInstance: unknown) => {
    if (!renditionInstance || typeof renditionInstance !== 'object') return;

    const rendition = renditionInstance as Record<string, unknown>; // 使用Record类型替代any

    const themeStyles = {
      light: {
        color: '#000000',
        'background-color': '#ffffff',
      },
      dark: {
        color: '#ffffff',
        'background-color': '#1a1a1a',
      },
      sepia: {
        color: '#5c4b37',
        'background-color': '#f4f1ea',
      },
    };

    (rendition.themes as { default: (styles: Record<string, unknown>) => void }).default({
      body: {
        'font-size': `${fontSize}px`,
        'line-height': `${lineHeight}`,
        'max-width': '800px',
        'margin': '0 auto',
        'padding': '0 2rem',
        'box-sizing': 'border-box',
        ...themeStyles[theme],
      },
    });
    console.log('Theme styles applied');
  };

  // 初始化 EPUB 阅读器
  const initEpubReader = async () => {
    if (!book?.fileUrl || !epubContainerRef.current) {
      console.error('Missing book fileUrl or container ref:', { 
        fileUrl: book?.fileUrl, 
        containerRef: !!epubContainerRef.current 
      });
      return;
    }

    console.log('Starting EPUB initialization with fileUrl:', book.fileUrl);

    try {
      // 动态导入 epubjs
      const { default: ePub } = await import('epubjs');
      console.log('epubjs imported successfully');
      
      // 创建 EPUB 实例
      const epub = ePub(book.fileUrl);
      epubRef.current = epub;
      console.log('EPUB instance created');

      // 等待 EPUB 准备就绪
      console.log('Waiting for EPUB ready...');
      await epub.ready;
      
      // 检查 EPUB 基本信息
      console.log('EPUB ready, basic info:', {
        hasMetadata: !!(epub as any).metadata,
        spineLength: (epub as any).spine?.length || 0,
        hasLocations: !!(epub as any).locations,
        locationsLength: (epub as any).locations?.length || 0
      });
      
      // 安全地访问元数据
      if ((epub as any).metadata) {
        console.log('EPUB metadata:', {
          title: (epub as any).metadata.title || 'Unknown Title',
          creator: (epub as any).metadata.creator || 'Unknown Author',
          language: (epub as any).metadata.language || 'Unknown Language'
        });
      } else {
        console.warn('EPUB metadata is not available');
      }

      // 检查 EPUB 是否准备好渲染
      if (!(epub as any).spine || (epub as any).spine.length === 0) {
        throw new Error('EPUB spine is empty or not available');
      }

      // 渲染到容器
      console.log('Rendering EPUB to container...');
      const rendition = epub.renderTo(epubContainerRef.current, {
        width: '100%',
        height: '100%',
        spread: 'none',
        allowScriptedContent: true,
        manager: 'default',
        flow: layoutMode || 'paginated',
        resizeOnOrientationChange: true,
        overflow: 'hidden',
      });
      console.log('EPUB rendered to container');

      // 等待渲染器准备就绪
      await rendition.ready;
      console.log('Rendition ready');
      
      // 保存 rendition 实例用于翻页
      setRendition(rendition);

      // -- Rendition Event Listeners --
      // 监听位置变化，用于保存进度
      rendition.on('relocated', (location: unknown) => {
        console.log('EPUB relocated:', location);
        // 使用 CFI 保存精确位置
        if (location && location.start && location.start.cfi) {
          const progress = location.start.percentage;
          const chapter = location.start?.href || 'unknown';
          const cfi = location.start.cfi;
          saveProgress(chapter, progress, cfi);
        }
      });

      // 监听文本选择，用于 AI 翻译
      rendition.on('selected', (cfiRange: string, contents: unknown) => {
        const text = contents.window.getSelection().toString();
        if (text.trim()) {
          setSelectedText(text.trim());
          setShowTranslationModal(true);
        }
      });

      // 监听内容显示完成，用于应用样式
      rendition.on('displayed', (section: unknown) => {
        console.log('EPUB section displayed, applying styles:', section);
        applyThemeStyles(rendition);
      });

      // 监听渲染错误
      rendition.on('error', (error: unknown) => {
        console.error('EPUB rendering error:', error);
        setError(`EPUB 渲染错误: ${error.message}`);
      });

      // 如果有保存的进度，尝试跳转到该位置
      if (progress?.cfi) {
        console.log('Restoring reading progress from CFI:', progress.cfi);
        try {
          await rendition.display(progress.cfi);
          console.log('Progress restored successfully from CFI');
        } catch (error) {
          console.error('Failed to restore progress from CFI, displaying first page:', error);
          await rendition.display();
        }
      } else {
        // 显示第一页
        console.log('No CFI found, displaying first page...');
        try {
          await rendition.display();
          console.log('First page displayed successfully');
        } catch (error) {
          console.error('Failed to display first page:', error);
          throw error;
        }
      }

      console.log('EPUB initialization completed successfully');

    } catch (error) {
      console.error('Failed to initialize EPUB reader:', error);
      setError(`EPUB 文件加载失败: ${error.message}`);
    }
  };

  useEffect(() => {
    if (bookId) {
      fetchBook();
      fetchProgress();
    }
  }, [bookId]);

  useEffect(() => {
    if (book && epubContainerRef.current) {
      initEpubReader();
    }
  }, [book, fontSize, lineHeight, theme, layoutMode]);

  // 主题切换
  const toggleTheme = () => {
    const themes = ['light', 'dark', 'sepia'] as const;
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  // 字体大小调整
  const adjustFontSize = (delta: number) => {
    setFontSize(Math.max(12, Math.min(32, fontSize + delta)));
  };

  // 设置字体大小预设
  const setFontSizePreset = (size: number) => {
    setFontSize(Math.max(12, Math.min(32, size)));
  };

  // 行间距调整
  const adjustLineHeight = (delta: number) => {
    setLineHeight(Math.max(1.2, Math.min(2.0, lineHeight + delta)));
  };

  // 设置行间距预设
  const setLineHeightPreset = (height: number) => {
    setLineHeight(Math.max(1.2, Math.min(2.0, height)));
  };

  // 切换布局模式
  const toggleLayoutMode = () => {
    setLayoutMode(prev => prev === 'paginated' ? 'scrolled' : 'paginated');
  };

  // 翻页功能
  const nextPage = async () => {
    console.log('nextPage called, rendition:', !!rendition);
    if (rendition) {
      try {
        await rendition.next();
        console.log('Next page successful');
      } catch (error) {
        console.error('Failed to go to next page:', error);
      }
    } else {
      console.warn('Rendition not available for next page');
    }
  };

  const prevPage = async () => {
    console.log('prevPage called, rendition:', !!rendition);
    if (rendition) {
      try {
        await rendition.prev();
        console.log('Previous page successful');
      } catch (error) {
        console.error('Failed to go to previous page:', error);
      }
    } else {
      console.warn('Rendition not available for previous page');
    }
  };

  // 键盘快捷键和鼠标滚轮
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      console.log('Key pressed:', event.key, 'rendition:', !!rendition);
      
      // 确保在阅读器页面且 rendition 可用时才响应
      if (!rendition) {
        console.log('Rendition not available, ignoring key press');
        return;
      }
      
      // 下一页
      if (event.key === 'ArrowRight' || event.key === ' ' || event.key === 'd' || event.key === 'D') {
        event.preventDefault();
        nextPage();
      } 
      // 上一页
      else if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') {
        event.preventDefault();
        prevPage();
      }
      // 下一页（上下箭头）
      else if (event.key === 'ArrowDown' || event.key === 's' || event.key === 'S') {
        event.preventDefault();
        nextPage();
      }
      // 上一页（上下箭头）
      else if (event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W') {
        event.preventDefault();
        prevPage();
      }
    };

    const handleWheel = (event: WheelEvent) => {
      console.log('Wheel event:', event.deltaY, 'rendition:', !!rendition);
      
      if (!rendition) {
        console.log('Rendition not available, ignoring wheel event');
        return;
      }
      
      event.preventDefault();
      
      if (event.deltaY > 0) {
        // 向下滚动 - 下一页
        nextPage();
      } else if (event.deltaY < 0) {
        // 向上滚动 - 上一页
        prevPage();
      }
    };

    // 添加事件监听器
    document.addEventListener('keydown', handleKeyPress);
    document.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      document.removeEventListener('wheel', handleWheel);
    };
  }, [rendition]);

  // 添加笔记功能
  const handleAddToNotes = async (originalText: string, translation: string) => {
    try {
      await fetch(`/api/webread/notes/${bookId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookId,
          chapter: 'AI Translation',
          text: originalText,
          note: translation,
          highlight: 'yellow',
          position: {},
        }),
      });
      alert('已添加到笔记');
    } catch (error) {
      console.error('Failed to add note:', error);
      alert('添加笔记失败');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {error || '书籍不存在'}
          </h3>
          <button
            onClick={() => router.push('/webread')}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            返回书库
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* 顶部工具栏 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/webread')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-medium text-gray-900">{book.title}</h1>
            {book.author && (
              <p className="text-sm text-gray-500">{book.author}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* 字体大小控制 */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => adjustFontSize(-2)}
              className="p-1 hover:bg-gray-100 rounded"
              disabled={fontSize <= 12}
            >
              A-
            </button>
            <span className="text-sm text-gray-600 px-2">{fontSize}px</span>
            <button
              onClick={() => adjustFontSize(2)}
              className="p-1 hover:bg-gray-100 rounded"
              disabled={fontSize >= 24}
            >
              A+
            </button>
          </div>
          
          {/* 主题切换 */}
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            {theme === 'light' ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
          
          {/* 设置按钮 */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* 阅读进度条 */}
      {progress && (
        <div className="bg-gray-100 h-1">
          <div
            className="bg-blue-600 h-1 transition-all duration-300"
            style={{ width: `${progress.progress * 100}%` }}
          ></div>
        </div>
      )}

      {/* 阅读器主体 */}
      <div className="flex-1 relative overflow-hidden">
        <div
          ref={epubContainerRef}
          className="w-full h-full relative"
          style={{
            backgroundColor: theme === 'dark' ? '#1a1a1a' : theme === 'sepia' ? '#f4f1ea' : '#ffffff',
            padding: '20px',
            boxSizing: 'border-box',
            maxWidth: '100%',
            overflow: 'hidden',
          }}
        >
          {/* 调试信息 */}
          <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs p-2 rounded z-10">
            <div>Rendition: {rendition ? '✅' : '❌'}</div>
            <div>Book: {book ? '✅' : '❌'}</div>
            <div>Container: {epubContainerRef.current ? '✅' : '❌'}</div>
          </div>
          
          {/* 点击翻页区域 */}
          {rendition && (
            <>
              <div
                className="absolute top-0 left-0 h-full w-[40%] z-10 cursor-pointer"
                onClick={prevPage}
              />
              <div
                className="absolute top-0 right-0 h-full w-[40%] z-10 cursor-pointer"
                onClick={nextPage}
              />
            </>
          )}
        </div>
      </div>

      {/* 设置面板 */}
      {showSettings && (
        <div className="absolute top-16 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-80">
          <h3 className="font-medium mb-4 text-gray-800">阅读设置</h3>
          
          <div className="space-y-4">
            {/* 字体大小控制 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                字体大小 ({fontSize}px)
              </label>
              <div className="flex items-center space-x-2 mb-2">
                <button
                  onClick={() => adjustFontSize(-2)}
                  disabled={fontSize <= 12}
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  -
                </button>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-200"
                    style={{ width: `${((fontSize - 12) / (32 - 12)) * 100}%` }}
                  />
                </div>
                <button
                  onClick={() => adjustFontSize(2)}
                  disabled={fontSize >= 32}
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  +
                </button>
              </div>
              <div className="flex space-x-1">
                <button
                  onClick={() => setFontSizePreset(14)}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                >
                  小
                </button>
                <button
                  onClick={() => setFontSizePreset(18)}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                >
                  中
                </button>
                <button
                  onClick={() => setFontSizePreset(24)}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                >
                  大
                </button>
              </div>
            </div>

            {/* 行间距控制 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                行间距 ({lineHeight})
              </label>
              <div className="flex items-center space-x-2 mb-2">
                <button
                  onClick={() => adjustLineHeight(-0.1)}
                  disabled={lineHeight <= 1.2}
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  -
                </button>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-200"
                    style={{ width: `${((lineHeight - 1.2) / (2.0 - 1.2)) * 100}%` }}
                  />
                </div>
                <button
                  onClick={() => adjustLineHeight(0.1)}
                  disabled={lineHeight >= 2.0}
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  +
                </button>
              </div>
              <div className="flex space-x-1">
                <button
                  onClick={() => setLineHeightPreset(1.3)}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                >
                  紧凑
                </button>
                <button
                  onClick={() => setLineHeightPreset(1.6)}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                >
                  标准
                </button>
                <button
                  onClick={() => setLineHeightPreset(1.8)}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                >
                  宽松
                </button>
              </div>
            </div>

            {/* 布局模式 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                布局模式
              </label>
              <div className="flex space-x-2">
                <button
                  onClick={() => setLayoutMode('paginated')}
                  className={`px-3 py-1 rounded text-sm ${
                    layoutMode === 'paginated' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'
                  }`}
                >
                  分页
                </button>
                <button
                  onClick={() => setLayoutMode('scrolled')}
                  className={`px-3 py-1 rounded text-sm ${
                    layoutMode === 'scrolled' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'
                  }`}
                >
                  滚动
                </button>
              </div>
            </div>
            
            {/* 主题选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                主题
              </label>
              <div className="flex space-x-2">
                <button
                  onClick={() => setTheme('light')}
                  className={`px-3 py-1 rounded text-sm ${
                    theme === 'light' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'
                  }`}
                >
                  日间
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`px-3 py-1 rounded text-sm ${
                    theme === 'dark' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'
                  }`}
                >
                  夜间
                </button>
                <button
                  onClick={() => setTheme('sepia')}
                  className={`px-3 py-1 rounded text-sm ${
                    theme === 'sepia' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'
                  }`}
                >
                  护眼
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI 翻译弹窗 */}
      <AITranslationModal
        isOpen={showTranslationModal}
        onClose={() => setShowTranslationModal(false)}
        selectedText={selectedText}
        onAddToNotes={handleAddToNotes}
      />
    </div>
  );
}
