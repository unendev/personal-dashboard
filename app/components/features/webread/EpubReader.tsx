'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Epub, { Book, Rendition } from 'epubjs';
import { useReaderStore } from './useReaderStore';
import * as ebookCache from '@/lib/ebook-cache';

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
  
        const { setBook, fontSize, theme, setSelection, bubbles } = useReaderStore();
  
    const applyStyles = useCallback((rendition: Rendition) => {
      const bg = theme === 'dark' ? '#1a1a1a' : theme === 'sepia' ? '#FDFBF7' : '#ffffff';
      const text = theme === 'dark' ? '#d1d5db' : '#374151';
      
      rendition.themes.register('default', {
        body: { 
          'font-family': "'Georgia', 'Times New Roman', serif", 
          'font-size': `${fontSize}px`,
          'line-height': '1.8',
          'color': text,
          'background-color': bg,
          'padding': '0 20px', // 移动端边距
        },
        'p': {
          'margin-bottom': '1.5em',
          'text-align': 'justify'
        }
      });
      rendition.themes.select('default');
    }, [fontSize, theme]);
  
    useEffect(() => {
      let mounted = true;
  
      const loadBook = async () => {
        if (!viewerRef.current) return;
  
        // 1. 尝试加载数据 (缓存 -> 网络)
        let bookData: ArrayBuffer | string = url;
        
        try {
            if (ebookCache.isIndexedDBSupported()) {
                const cachedBlob = await ebookCache.getBook(bookId);
                if (cachedBlob) {
                    console.log('Loading book from IndexedDB cache');
                    bookData = await cachedBlob.arrayBuffer();
                } else {
                    console.log('Fetching book from network...');
                    const response = await fetch(url);
                    if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
                    const blob = await response.blob();
                    
                    // 异步写入缓存
                    ebookCache.setBook(bookId, url, blob, title || 'Unknown Book').catch(console.warn);
                    
                    bookData = await blob.arrayBuffer();
                }
            }
        } catch (e) {
            console.error('Error loading book data, falling back to URL streaming:', e);
            // 如果 fetch 失败（例如跨域），回退到 URL
            // 注意：如果 URL 不以 .epub 结尾且是相对路径，这可能导致 404
            bookData = url;
        }
  
        // 2. 初始化 Book
        const book = Epub(bookData);
        bookRef.current = book;
        setBook(book);
  
        // 3. 渲染
        const rendition = book.renderTo(viewerRef.current, {
          width: '100%',
          height: '100%',
          flow: 'scrolled', // 滚动模式，更适合沉浸式阅读
          manager: 'continuous',
        });
        renditionRef.current = rendition;
  
        // 4. 显示
        await rendition.display(initialLocation);
        setIsReady(true);
  
        // 5. 应用样式
        applyStyles(rendition);
  
        // 6. 事件监听
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
          // 设置选中状态，触发 UI 显示工具栏
          setSelection({ text, cfiRange });
          // 不清除选中，交给 UI 处理
        });
        
        // 点击空白处取消选中
        rendition.on('click', () => {
           setSelection(null);
        });
  
              // 7. 渲染灵感气泡
              const renderBubbles = () => {
                if (!renditionRef.current) return;
                // 清除旧的气泡（如果有）
                (renditionRef.current as any).highlights.clear();
        
                bubbles.forEach(bubble => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (renditionRef.current as any)?.highlight(bubble.cfi, {}, (e: any) => {
                    // e is a synthetic event from epubjs, might differ from native MouseEvent
                    // We need to prevent default behavior if possible
                    
                    // Dispatch custom event to be caught by AIReaderAssistant
                    const event = new CustomEvent('ept-bubble-click', { detail: bubble.id });
                    window.dispatchEvent(event);
                    
                    console.log('Bubble clicked:', bubble.id);
                  });
                });
              };  
        // 首次渲染和 bubbles 变化时渲染
        renderBubbles();
        book.on('rendition:rendered', renderBubbles); // 页面重新渲染时也更新
  
        return () => {
          mounted = false;
          if (bookRef.current) {
            bookRef.current.destroy();
          }
          book.off('rendition:rendered', renderBubbles);
        };
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
  
  return (
    <div className="w-full h-full relative group">
      <div 
        ref={viewerRef} 
        className={`w-full h-full overflow-hidden ${!isReady ? 'opacity-0' : 'opacity-100'} transition-opacity duration-700`}
      />
      
      {/* 翻页/滚动提示：由于是 scrolled 模式，原生滚动即可。但在移动端可能需要隐藏的翻页区 */}
    </div>
  );
}
