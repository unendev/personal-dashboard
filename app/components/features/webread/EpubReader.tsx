'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Epub, { Book, Rendition } from 'epubjs';
import { useReaderStore } from './useReaderStore';
import * as webdavCache from '@/lib/webdav-cache';
import { SelectionAIPopup } from './SelectionAIPopup';

interface EpubReaderProps {
  bookId: string;
  title?: string;
  initialLocation?: string;
  onLocationChange?: (cfi: string, progress: number) => void;
  onRenditionReady?: (rendition: Rendition) => void;
}

interface SelectionPopup {
  text: string;
  position: { x: number; y: number };
}

export default function EpubReader({ bookId, title, initialLocation, onLocationChange, onRenditionReady }: EpubReaderProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const bookRef = useRef<Book | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectionPopup, setSelectionPopup] = useState<SelectionPopup | null>(null);
  
  const { setBook, fontSize, theme, setSelection, bubbles } = useReaderStore();

  // 翻页函数
  const goNext = useCallback(() => {
    if (renditionRef.current) {
      renditionRef.current.next();
    }
  }, []);

  const goPrev = useCallback(() => {
    if (renditionRef.current) {
      renditionRef.current.prev();
    }
  }, []);

  // 键盘翻页
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        goNext();
      } else if (e.key === 'ArrowLeft') {
        goPrev();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev]);

  const applyStyles = useCallback((rendition: Rendition) => {
    try {
      // 根据主题应用不同的背景和文字颜色
      let bgStyle = '';
      let text = '';
      let linkColor = '';
      
      if (theme === 'dark') {
        bgStyle = '#1a1a1a';
        text = '#ffffff';
        linkColor = '#8ab4f8';
      } else if (theme === 'sepia') {
        // Dark Reader 反转后的护眼色：深棕色背景 + 白色文字
        bgStyle = '#2b2416';
        text = '#ffffff';
        linkColor = '#c9a87a';
      } else {
        bgStyle = '#faf8f3';
        text = '#1a1a1a';
        linkColor = '#8b6f47';
      }
      
      rendition.themes.register('default', {
        body: { 
          'font-family': "'Georgia', 'Times New Roman', 'Noto Serif CJK SC', serif", 
          'font-size': `${fontSize}px`,
          'line-height': '1.8',
          'color': text,
          'background': bgStyle,
          'padding': '0 20px',
          'writing-mode': 'horizontal-tb',
          '-webkit-writing-mode': 'horizontal-tb',
        },
        'a': {
          'color': linkColor,
          'text-decoration': 'none',
          'border-bottom': `1px solid ${linkColor}`,
        },
        'a:visited': {
          'color': linkColor,
        },
        'p': {
          'margin-bottom': '1.5em',
          'text-align': 'justify'
        },
        'ruby': {
          'font-size': '0.6em'
        }
      });
      rendition.themes.select('default');
      
    } catch (e) {
      console.error('[EpubReader] Failed to apply styles:', e);
    }
  }, [fontSize, theme]);
  
  // 当主题或字体大小改变时，重新应用样式并重新渲染当前页面
  useEffect(() => {
    if (renditionRef.current && isReady) {
      console.log('[EpubReader] Applying styles - fontSize:', fontSize, 'theme:', theme);
      applyStyles(renditionRef.current);
      
      // 重新渲染当前页面以应用新样式
      try {
        const currentLocation = renditionRef.current.currentLocation() as any;
        if (currentLocation?.start?.cfi) {
          renditionRef.current.display(currentLocation.start.cfi);
        }
      } catch (e) {
        // 静默处理
      }
    }
  }, [fontSize, theme, isReady, applyStyles]);

  // 使用 ref 来存储回调，避免依赖变化导致重新加载
  const onLocationChangeRef = useRef(onLocationChange);
  onLocationChangeRef.current = onLocationChange;
  
  const bubblesRef = useRef(bubbles);
  bubblesRef.current = bubbles;

  useEffect(() => {
    let mounted = true;
    let currentBook: Book | null = null;
    let renderBubblesHandler: (() => void) | null = null;
    let readyTimeout: NodeJS.Timeout | null = null;
    let saveProgressTimeout: NodeJS.Timeout | null = null;

    const cleanup = () => {
      
      mounted = false;
      if (readyTimeout) {
        clearTimeout(readyTimeout);
        readyTimeout = null;
      }
      if (saveProgressTimeout) {
        clearTimeout(saveProgressTimeout);
        saveProgressTimeout = null;
      }
      if (currentBook) {
        if (renderBubblesHandler) {
          currentBook.off('rendition:rendered', renderBubblesHandler);
        }
        try {
          currentBook.destroy();
        } catch {
          // 静默处理
        }
        currentBook = null;
      }
      bookRef.current = null;
      renditionRef.current = null;
    };

    const loadBook = async () => {
      try {
        if (!viewerRef.current) {
          throw new Error('Viewer container not found');
        }

        setError(null);

        const cachedBlob = await webdavCache.getBook(bookId);
        
        if (!cachedBlob) {
          throw new Error('书籍未找到，请确认已上传到 WebDAV');
        }
        
        if (!mounted) return;
        
        const bookData = await cachedBlob.arrayBuffer();

        if (!mounted || !viewerRef.current) return;

        const book = Epub(bookData);
        currentBook = book;
        bookRef.current = book;
        setBook(book);

        if (!mounted || !viewerRef.current) {
          cleanup();
          return;
        }

        const rendition = book.renderTo(viewerRef.current, {
          width: '100%',
          height: '100%',
          flow: 'paginated',
          spread: 'none',
          allowScriptedContent: true,
        });
        renditionRef.current = rendition;

        readyTimeout = setTimeout(() => {
          if (mounted) {
            setIsReady(true);
          }
        }, 8000);

        try {
          await Promise.race([
            rendition.display(initialLocation || undefined),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Display timeout')), 5000)
            )
          ]);
        } catch (e) {
          // 如果初始位置加载失败，尝试从头开始
          try {
            await rendition.display();
          } catch {
            // 继续执行
          }
        }
        
        if (readyTimeout) {
          clearTimeout(readyTimeout);
          readyTimeout = null;
        }
        
        if (!mounted) {
          cleanup();
          return;
        }

        applyStyles(rendition);

        // 加载导航（目录）
        try {
          await book.loaded.navigation;
          console.log('[EpubReader] Navigation loaded:', book.navigation?.toc?.length || 0, 'items');
        } catch (e) {
          console.warn('[EpubReader] Failed to load navigation:', e);
        }

        // 生成 locations 用于计算进度
        try {
          await book.locations.generate(1600); // 每1600字符一个位置点
          console.log('[EpubReader] Locations generated:', book.locations.length());
        } catch (e) {
          console.warn('[EpubReader] Failed to generate locations:', e);
        }

        // 设置事件监听 - 追踪位置变化并保存进度
        let lastSavedCfi = '';
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rendition.on('relocated', (location: any) => {
          if (!mounted) return;
          
          try {
            const cfi = location?.start?.cfi;
            
            // 验证 CFI 有效
            if (!cfi || typeof cfi !== 'string') {
              return;
            }
            
            // 使用 locations 计算准确的进度
            let progressValue = 0;
            try {
              if (book.locations && book.locations.length() > 0) {
                progressValue = book.locations.percentageFromCfi(cfi);
              } else {
                // 如果 locations 未生成，使用 displayed 的百分比
                progressValue = location?.start?.percentage ?? 0;
              }
            } catch {
              progressValue = location?.start?.percentage ?? 0;
            }
            
            // 确保进度值在 0-1 之间
            if (progressValue > 1) {
              progressValue = progressValue / 100;
            }
            progressValue = Math.max(0, Math.min(1, progressValue));
            
            console.log('[EpubReader] Progress update:', { cfi, progressValue: (progressValue * 100).toFixed(1) + '%' });
            
            // 更新 store 中的进度
            onLocationChangeRef.current?.(cfi, progressValue);
            
            // 防抖保存进度（避免频繁保存）
            if (saveProgressTimeout) {
              clearTimeout(saveProgressTimeout);
            }
            
            saveProgressTimeout = setTimeout(async () => {
              try {
                const now = Date.now();
                await webdavCache.saveProgress({
                  bookId,
                  currentCfi: cfi,
                  progress: progressValue,
                  currentChapter: 'Unknown',
                  lastReadAt: now,
                });
                lastSavedCfi = cfi;
              } catch (e) {
                console.error('[Reader] Failed to save progress:', e);
              }
            }, 500);
          } catch (e) {
            // 静默处理
          }
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rendition.on('selected', (cfiRange: string, contents: any) => {
          const range = rendition.getRange(cfiRange);
          const text = range.toString().trim();
          setSelection({ text, cfiRange });
          
          // 显示 AI 弹窗（如果选中了文本）
          if (text && text.length > 0) {
            // 获取选区位置
            try {
              const rect = range.getBoundingClientRect();
              // 计算相对于视口的位置
              const viewerRect = viewerRef.current?.getBoundingClientRect();
              if (viewerRect) {
                setSelectionPopup({
                  text,
                  position: {
                    x: rect.left + rect.width / 2,
                    y: rect.top,
                  }
                });
              }
            } catch (e) {
              // 静默处理
            }
          }
        });
        
        rendition.on('click', () => {
          setSelection(null);
          // 延迟关闭弹窗，避免点击弹窗时被关闭
          setTimeout(() => {
            const selection = window.getSelection();
            if (!selection || selection.isCollapsed) {
              setSelectionPopup(null);
            }
          }, 100);
        });

        // 处理链接点击 - 支持 Ctrl+点击（桌面）和长按/直接点击（移动端）
        rendition.on('linkClicked', (href: string, event: MouseEvent) => {
          // 检查是否是外部链接
          if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
            // 桌面端：Ctrl+点击 或 移动端：直接点击
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            if (event.ctrlKey || event.metaKey || isMobile) {
              event.preventDefault();
              window.open(href, '_blank', 'noopener,noreferrer');
            }
          }
        });

        renderBubblesHandler = () => {
          if (!renditionRef.current) return;
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (renditionRef.current as any).highlights?.clear?.();
      
            bubblesRef.current.forEach(bubble => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (renditionRef.current as any)?.highlight?.(bubble.cfi, {}, () => {
                const event = new CustomEvent('ept-bubble-click', { detail: bubble.id });
                window.dispatchEvent(event);
              });
            });
          } catch {
            // 静默处理
          }
        };
        
        renderBubblesHandler();
        book.on('rendition:rendered', renderBubblesHandler);

        if (mounted) {
          setIsReady(true);
          onRenditionReady?.(rendition);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        if (mounted) {
          setError(errorMsg);
        }
        cleanup();
      }
    };

    loadBook();

    return cleanup;
    // 只在 bookId 变化时重新加载
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);
  
    // CSS to highlight the bubbles (add to globals.css or component css)
    // .epub-bubble-highlight { background-color: rgba(255, 255, 0, 0.3); border-bottom: 1px dashed yellow; cursor: pointer; }
  
  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-red-50">
        <div className="text-center max-w-md">
          <h3 className="text-lg font-semibold text-red-900 mb-2">加载失败</h3>
          <p className="text-sm text-red-700 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative group bg-slate-900">
      <div 
        ref={viewerRef} 
        className={`w-full h-full overflow-hidden ${!isReady ? 'opacity-0' : 'opacity-100'} transition-opacity duration-700`}
      />
      
      {/* 点击区域翻页 */}
      {isReady && (
        <>
          <div 
            className="absolute left-0 top-0 w-1/4 h-full cursor-pointer z-5" 
            onClick={goPrev}
          />
          <div 
            className="absolute right-0 top-0 w-1/4 h-full cursor-pointer z-5" 
            onClick={goNext}
          />
        </>
      )}
      
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400 mx-auto mb-2" />
            <p className="text-sm text-amber-200">正在加载书籍...</p>
          </div>
        </div>
      )}

      {/* 文本选择 AI 弹窗 */}
      {selectionPopup && (
        <SelectionAIPopup
          selectedText={selectionPopup.text}
          position={selectionPopup.position}
          onClose={() => setSelectionPopup(null)}
          bookTitle={title}
        />
      )}
    </div>
  );
}
