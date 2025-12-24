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
  onNoteAdded?: (note: webdavCache.BookNote) => void;
}

interface SelectionPopup {
  text: string;
  position: { x: number; y: number };
  cfiRange?: string;
}

// 高亮颜色类名（用于 CSS 样式注入）
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const HIGHLIGHT_COLORS = ['yellow', 'green', 'blue'] as const;

export default function EpubReader({ bookId, title, initialLocation, onLocationChange, onRenditionReady, onNoteAdded }: EpubReaderProps) {
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

  // 移动端滑动翻页
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !isReady) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    const minSwipeDistance = 50;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      touchEndX = e.changedTouches[0].clientX;
      touchEndY = e.changedTouches[0].clientY;
      
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;
      
      // 确保是水平滑动（水平距离大于垂直距离）
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
        if (deltaX > 0) {
          goPrev(); // 右滑 = 上一页
        } else {
          goNext(); // 左滑 = 下一页
        }
      }
    };

    viewer.addEventListener('touchstart', handleTouchStart, { passive: true });
    viewer.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      viewer.removeEventListener('touchstart', handleTouchStart);
      viewer.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isReady, goNext, goPrev]);

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

  // 翻页函数的 ref
  const goNextRef = useRef(goNext);
  goNextRef.current = goNext;
  const goPrevRef = useRef(goPrev);
  goPrevRef.current = goPrev;

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

        // 启用移动端文本选择
        rendition.hooks.content.register((contents: any) => {
          const doc = contents.document;
          const win = contents.window;
          
          // 确保文本可选择 + 高亮样式
          const style = doc.createElement('style');
          style.textContent = `
            * {
              -webkit-user-select: text !important;
              -moz-user-select: text !important;
              -ms-user-select: text !important;
              user-select: text !important;
              -webkit-touch-callout: default !important;
            }
            body {
              -webkit-tap-highlight-color: rgba(0,0,0,0);
            }
            /* epub.js highlight 样式 - 按颜色分类 */
            .hl-yellow {
              fill: rgba(250, 204, 21, 0.35) !important;
              fill-opacity: 1 !important;
            }
            .hl-green {
              fill: rgba(52, 211, 153, 0.35) !important;
              fill-opacity: 1 !important;
            }
            .hl-blue {
              fill: rgba(96, 165, 250, 0.35) !important;
              fill-opacity: 1 !important;
            }
          `;
          doc.head.appendChild(style);
          
          // 移动端：监听 selectionchange 事件
          let selectionTimeout: NodeJS.Timeout | null = null;
          doc.addEventListener('selectionchange', () => {
            if (selectionTimeout) clearTimeout(selectionTimeout);
            selectionTimeout = setTimeout(() => {
              const selection = win.getSelection();
              if (selection && !selection.isCollapsed) {
                const text = selection.toString().trim();
                if (text.length > 0) {
                  try {
                    const range = selection.getRangeAt(0);
                    // 触发 epub.js 的 selected 事件
                    const cfiRange = contents.cfiFromRange(range);
                    if (cfiRange) {
                      rendition.emit('selected', cfiRange, contents);
                    }
                  } catch (e) {
                    // 静默处理
                  }
                }
              }
            }, 300);
          });
        });

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

        // 先标记为 ready，让用户可以开始阅读
        if (mounted) {
          setIsReady(true);
          if (onRenditionReady) {
            onRenditionReady(rendition);
          }
          
          // 加载并应用高亮
          webdavCache.getNotes(bookId).then(notes => {
            console.log('[EpubReader] Loading highlights for', notes.length, 'notes');
            if (mounted && renditionRef.current) {
              notes.forEach(note => {
                if (!note.cfi) {
                  console.warn('[EpubReader] Note has no CFI:', note.id);
                  return;
                }
                const colorClass = `hl-${note.color || 'yellow'}`;
                console.log('[EpubReader] Applying highlight:', {
                  noteId: note.id,
                  cfi: note.cfi,
                  colorClass,
                  text: note.text.substring(0, 30) + '...',
                });
                try {
                  // 使用 highlight 方法 + className 应用颜色
                  renditionRef.current!.annotations.highlight(
                    note.cfi,
                    { id: note.id },
                    () => {
                      console.log('[EpubReader] Highlight clicked:', note.id);
                      renditionRef.current?.display(note.cfi);
                    },
                    colorClass
                  );
                  console.log('[EpubReader] Highlight applied successfully:', note.id);
                } catch (e) {
                  console.error('[EpubReader] Failed to apply highlight:', note.id, e);
                }
              });
            }
          }).catch((e) => {
            console.error('[EpubReader] Failed to load notes:', e);
          });
        }

        // 尝试从缓存加载 locations，否则后台生成
        const cachedLocations = await webdavCache.getLocations(bookId);
        if (cachedLocations) {
          try {
            book.locations.load(cachedLocations);
            console.log('[EpubReader] Locations loaded from cache:', book.locations.length());
          } catch (e) {
            console.warn('[EpubReader] Failed to load cached locations, regenerating:', e);
            book.locations.generate(1600).then(() => {
              console.log('[EpubReader] Locations regenerated:', book.locations.length());
              webdavCache.saveLocations(bookId, book.locations.save());
            }).catch(() => {});
          }
        } else {
          // 后台生成 locations（不阻塞 UI）
          book.locations.generate(1600).then(() => {
            console.log('[EpubReader] Locations generated:', book.locations.length());
            // 保存到缓存
            webdavCache.saveLocations(bookId, book.locations.save());
          }).catch((e) => {
            console.warn('[EpubReader] Failed to generate locations:', e);
          });
        }

        // 设置事件监听 - 追踪位置变化并保存进度
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
              } catch (e) {
                console.error('[Reader] Failed to save progress:', e);
              }
            }, 500);
          } catch (e) {
            // 静默处理
          }
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rendition.on('selected', (cfiRange: string, _contents: any) => {
          const range = rendition.getRange(cfiRange);
          const text = range.toString().trim();
          
          // 调试日志
          console.log('[EpubReader] Text selected:', {
            cfiRange,
            text: text.substring(0, 50) + '...',
            rangeInfo: {
              startContainer: range.startContainer?.nodeName,
              endContainer: range.endContainer?.nodeName,
              startOffset: range.startOffset,
              endOffset: range.endOffset,
            }
          });
          
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
                  cfiRange,
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
        
        rendition.on('click', (e: MouseEvent) => {
          setSelection(null);
          
          // 检查点击位置，实现左右翻页
          const viewerRect = viewerRef.current?.getBoundingClientRect();
          if (viewerRect) {
            const clickX = e.clientX - viewerRect.left;
            const width = viewerRect.width;
            
            // 左侧 25% 区域 - 上一页
            if (clickX < width * 0.25) {
              // 检查是否有选中文本
              const selection = window.getSelection();
              const iframeSelection = renditionRef.current?.getContents()?.map((c: any) => c.window?.getSelection()).find((s: any) => s && !s.isCollapsed);
              if ((!selection || selection.isCollapsed) && !iframeSelection) {
                goPrevRef.current();
                return;
              }
            }
            // 右侧 25% 区域 - 下一页
            else if (clickX > width * 0.75) {
              const selection = window.getSelection();
              const iframeSelection = renditionRef.current?.getContents()?.map((c: any) => c.window?.getSelection()).find((s: any) => s && !s.isCollapsed);
              if ((!selection || selection.isCollapsed) && !iframeSelection) {
                goNextRef.current();
                return;
              }
            }
          }
          
          // 只有在没有选中文本时才关闭弹窗
          setTimeout(() => {
            const selection = window.getSelection();
            const iframeSelection = renditionRef.current?.getContents()?.map((c: any) => c.window?.getSelection()).find((s: any) => s && !s.isCollapsed);
            if ((!selection || selection.isCollapsed) && !iframeSelection) {
              setSelectionPopup(null);
            }
          }, 200);
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
    <div className="w-full h-full relative group bg-[#2b2416]">
      <div 
        ref={viewerRef} 
        className={`w-full h-full overflow-hidden ${!isReady ? 'opacity-0' : 'opacity-100'} transition-opacity duration-700`}
      />
      
      {/* PC端翻页提示 - 不阻止文本选择 */}
      {isReady && (
        <>
          {/* 左侧翻页热区 - 使用透明背景，不阻止事件 */}
          <div 
            className="absolute left-0 top-0 w-8 h-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none"
          >
            <div className="w-6 h-12 bg-white/10 rounded-r-full flex items-center justify-center">
              <span className="text-white/50 text-xs">‹</span>
            </div>
          </div>
          {/* 右侧翻页热区 */}
          <div 
            className="absolute right-0 top-0 w-8 h-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none"
          >
            <div className="w-6 h-12 bg-white/10 rounded-l-full flex items-center justify-center">
              <span className="text-white/50 text-xs">›</span>
            </div>
          </div>
        </>
      )}
      
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#2b2416]">
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
          bookId={bookId}
          cfiRange={selectionPopup.cfiRange}
          onNoteAdded={(note) => {
            // 立即应用高亮
            console.log('[EpubReader] onNoteAdded called:', {
              noteId: note.id,
              cfi: note.cfi,
              color: note.color,
              text: note.text.substring(0, 30) + '...',
            });
            if (renditionRef.current && note.cfi) {
              const colorClass = `hl-${note.color || 'yellow'}`;
              console.log('[EpubReader] Applying immediate highlight with class:', colorClass);
              try {
                // 使用 highlight 方法，通过 className 应用样式
                renditionRef.current.annotations.highlight(
                  note.cfi,
                  { id: note.id },
                  () => {
                    console.log('[EpubReader] New highlight clicked:', note.id);
                    renditionRef.current?.display(note.cfi);
                  },
                  colorClass
                );
                console.log('[EpubReader] Immediate highlight applied successfully');
              } catch (e) {
                console.error('[EpubReader] Failed to apply immediate highlight:', e);
              }
            } else {
              console.warn('[EpubReader] Cannot apply highlight - rendition or cfi missing:', {
                hasRendition: !!renditionRef.current,
                hasCfi: !!note.cfi,
              });
            }
            // 通知父组件更新笔记列表
            onNoteAdded?.(note);
          }}
        />
      )}
    </div>
  );
}
