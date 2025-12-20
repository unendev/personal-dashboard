'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Epub, { Book, Rendition } from 'epubjs';
import { useReaderStore } from './useReaderStore';
import * as webdavCache from '@/lib/webdav-cache';

interface EpubReaderProps {
  url: string; // 这里可能是 blob url 或 oss url
  bookId: string;
  title?: string;
  initialLocation?: string;
  onLocationChange?: (cfi: string, progress: number) => void;
}

export default function EpubReader({ url, bookId, title, initialLocation, onLocationChange }: EpubReaderProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const bookRef = useRef<Book | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { setBook, fontSize, theme, setSelection, bubbles } = useReaderStore();

  const applyStyles = useCallback((rendition: Rendition) => {
    try {
      const bg = theme === 'dark' ? '#1a1a1a' : theme === 'sepia' ? '#FDFBF7' : '#ffffff';
      const text = theme === 'dark' ? '#d1d5db' : '#374151';
      
      rendition.themes.register('default', {
        body: { 
          'font-family': "'Georgia', 'Times New Roman', serif", 
          'font-size': `${fontSize}px`,
          'line-height': '1.8',
          'color': text,
          'background-color': bg,
          'padding': '0 20px',
        },
        'p': {
          'margin-bottom': '1.5em',
          'text-align': 'justify'
        }
      });
      rendition.themes.select('default');
      console.log('[EpubReader] Styles applied successfully', { theme, fontSize });
    } catch (e) {
      console.error('[EpubReader] Failed to apply styles:', e);
    }
  }, [fontSize, theme]);
  
  // 当主题或字体大小改变时，重新应用样式
  useEffect(() => {
    if (renditionRef.current && isReady) {
      console.log('[EpubReader] Theme or font size changed, reapplying styles');
      applyStyles(renditionRef.current);
    }
  }, [fontSize, theme, isReady, applyStyles]);

  useEffect(() => {
    let mounted = true;

    const loadBook = async () => {
      try {
        if (!viewerRef.current) {
          throw new Error('Viewer container not found');
        }

        console.log('[EpubReader] Starting book load for bookId:', bookId);
        setError(null);

        // 1. 加载数据 (缓存 -> 网络)
        let bookData: ArrayBuffer | string = url;
        
        try {
          if (webdavCache.isWebDAVSupported()) {
            console.log('[EpubReader] Checking WebDAV cache...');
            const cachedBlob = await webdavCache.getBook(bookId);
            if (cachedBlob) {
              console.log('[EpubReader] ✓ Book found in WebDAV cache');
              bookData = await cachedBlob.arrayBuffer();
            } else {
              console.log('[EpubReader] Cache miss, fetching from network...');
              const response = await fetch(url);
              if (!response.ok) {
                throw new Error(`Network fetch failed: ${response.statusText}`);
              }
              const blob = await response.blob();
              console.log('[EpubReader] ✓ Book fetched from network, size:', blob.size);
              
              // 异步写入 WebDAV 缓存
              webdavCache.setBook(bookId, url, blob, title || 'Unknown Book').catch(e => {
                console.warn('[EpubReader] Failed to cache book to WebDAV:', e);
              });
              
              bookData = await blob.arrayBuffer();
            }
          } else {
            console.log('[EpubReader] WebDAV not supported, using URL streaming');
          }
        } catch (cacheError) {
          console.warn('[EpubReader] Cache operation failed, falling back to URL:', cacheError);
          bookData = url;
        }

        // 2. 初始化 Book
        console.log('[EpubReader] Initializing EpubJS Book...');
        const book = Epub(bookData);
        bookRef.current = book;
        setBook(book);
        console.log('[EpubReader] ✓ Book initialized');

        // 3. 创建 Rendition
        console.log('[EpubReader] Creating rendition...');
        const rendition = book.renderTo(viewerRef.current, {
          width: '100%',
          height: '100%',
          flow: 'scrolled',
          manager: 'continuous',
        });
        renditionRef.current = rendition;
        console.log('[EpubReader] ✓ Rendition created');

        // 4. 显示内容
        console.log('[EpubReader] Displaying content at location:', initialLocation || 'start');
        await rendition.display(initialLocation);
        console.log('[EpubReader] ✓ Content displayed');

        // 5. 应用样式
        console.log('[EpubReader] Applying styles...');
        applyStyles(rendition);

        // 6. 设置事件监听
        console.log('[EpubReader] Setting up event listeners...');
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rendition.on('relocated', (location: any) => {
          if (!mounted) return;
          if (onLocationChange) {
            onLocationChange(location.start.cfi, location.start.percentage);
          }
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rendition.on('selected', (cfiRange: string, contents: any) => {
          const range = rendition.getRange(cfiRange);
          const text = range.toString();
          setSelection({ text, cfiRange });
        });
        
        rendition.on('click', () => {
          setSelection(null);
        });

        // 7. 渲染灵感气泡
        const renderBubbles = () => {
          if (!renditionRef.current) return;
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (renditionRef.current as any).highlights?.clear?.();
      
            bubbles.forEach(bubble => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (renditionRef.current as any)?.highlight?.(bubble.cfi, {}, (e: any) => {
                const event = new CustomEvent('ept-bubble-click', { detail: bubble.id });
                window.dispatchEvent(event);
              });
            });
          } catch (e) {
            console.warn('[EpubReader] Failed to render bubbles:', e);
          }
        };
        
        renderBubbles();
        book.on('rendition:rendered', renderBubbles);

        if (mounted) {
          setIsReady(true);
          console.log('[EpubReader] ✓ Book ready for reading');
        }

        return () => {
          mounted = false;
          if (bookRef.current) {
            bookRef.current.destroy();
          }
          book.off('rendition:rendered', renderBubbles);
        };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error('[EpubReader] Fatal error during book load:', errorMsg, err);
        if (mounted) {
          setError(errorMsg);
        }
      }
    };

    loadBook();

    return () => {
      mounted = false;
      if (bookRef.current) {
        bookRef.current.destroy();
      }
    };
  }, [url, bookId, title, initialLocation, onLocationChange, setBook, setSelection, applyStyles, bubbles]);
  
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
    <div className="w-full h-full relative group">
      <div 
        ref={viewerRef} 
        className={`w-full h-full overflow-hidden ${!isReady ? 'opacity-0' : 'opacity-100'} transition-opacity duration-700`}
      />
      
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2" />
            <p className="text-sm text-gray-600">正在加载书籍...</p>
          </div>
        </div>
      )}
    </div>
  );
}
