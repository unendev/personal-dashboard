'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useReaderStore } from '@/app/components/features/webread/useReaderStore';
import EpubReader from '@/app/components/features/webread/EpubReader';
import * as webdavCache from '@/lib/webdav-cache';
import { Loader2, ArrowLeft, ChevronRight, BookOpen, Minus, Plus, Sun, Moon, Coffee } from 'lucide-react';
import Link from 'next/link';

interface BookMetadata {
  id: string;
  title: string;
}

export default function ReaderPage() {
  const { id } = useParams<{ id: string }>();
  const [bookMetadata, setBookMetadata] = useState<BookMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<any[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [savedLocation, setSavedLocation] = useState<string | undefined>(undefined);
  const [toc, setToc] = useState<any[]>([]);
  const [rendition, setRendition] = useState<any>(null);
  const [currentChapter, setCurrentChapter] = useState<string>('');
  
  const { toggleSidebar, sidebarOpen, currentCfi, progress, fontSize, setFontSize, theme, setTheme, book } = useReaderStore();

  useEffect(() => {
    // 获取书籍元数据
    webdavCache.getMetadataFromLocal(id).then(metadata => {
      if (metadata) {
        setBookMetadata({ id: metadata.id, title: metadata.title });
      } else {
        setBookMetadata({ id: id, title: id });
      }
      setLoading(false);
    }).catch(err => {
      console.error('[ReaderPage] Error fetching metadata:', err);
      setBookMetadata({ id: id, title: id });
      setLoading(false);
    });

    // 获取保存的阅读进度
    webdavCache.getProgress(id).then(savedProgress => {
      // 只在 CFI 有效时恢复位置
      if (savedProgress?.currentCfi && typeof savedProgress.currentCfi === 'string' && savedProgress.currentCfi.startsWith('epubcfi')) {
        setSavedLocation(savedProgress.currentCfi);
      }
    }).catch(err => {
      console.warn('[ReaderPage] Failed to load saved progress:', err);
    });

    // 获取笔记
    setLoadingNotes(true);
    webdavCache.getNotes(id).then(notes => {
      setNotes(notes);
      setLoadingNotes(false);
    });
  }, [id]);

  // 进度保存由 EpubReader 处理，这里只用于监控
  useEffect(() => {
    if (currentCfi && progress !== undefined) {
      // 进度已更新
    }
  }, [currentCfi, progress, id]);

  // 根据当前 CFI 更新当前章节
  useEffect(() => {
    if (currentCfi && toc.length > 0 && book) {
      try {
        // 找到当前 CFI 对应的章节
        const spineItem = book.spine.get(currentCfi);
        if (spineItem) {
          const currentHref = spineItem.href;
          // 在 TOC 中找到匹配的章节
          const matchedChapter = toc.find(item => {
            // 比较 href（可能需要处理锚点）
            const tocHref = item.href.split('#')[0];
            const currentHrefClean = currentHref.split('#')[0];
            return tocHref === currentHrefClean || item.href === currentHref;
          });
          if (matchedChapter) {
            setCurrentChapter(matchedChapter.href);
          }
        }
      } catch (e) {
        // 静默处理
      }
    }
  }, [currentCfi, toc, book]);

  // 当书籍加载完成时，提取目录
  useEffect(() => {
    if (book) {
      const extractToc = async () => {
        try {
          // 等待 navigation 加载完成
          if (book.loaded?.navigation) {
            await book.loaded.navigation;
          }
          
          const chapters: any[] = [];
          if (book.navigation && book.navigation.toc) {
            console.log('[ReaderPage] TOC found:', book.navigation.toc.length, 'items');
            const processToc = (items: any[], depth = 0) => {
              items.forEach(item => {
                if (depth < 3) { // 限制深度为3层
                  chapters.push({
                    label: item.label,
                    href: item.href,
                    depth,
                  });
                  if (item.subitems && item.subitems.length > 0) {
                    processToc(item.subitems, depth + 1);
                  }
                }
              });
            };
            processToc(book.navigation.toc);
          } else {
            console.log('[ReaderPage] No TOC found in book.navigation');
          }
          setToc(chapters);
        } catch (e) {
          console.error('[ReaderPage] Failed to extract TOC:', e);
        }
      };
      extractToc();
    }
  }, [book]);

  if (loading || !bookMetadata) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#3D3225]">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-900 relative">
      {/* 富有想象力的背景 - 书籍主题的星空效果 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* 星空背景 */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,119,182,0.0))]" />
        
        {/* 浮动的书籍图案 */}
        <svg className="absolute inset-0 w-full h-full opacity-5" viewBox="0 0 1200 800" preserveAspectRatio="none">
          <defs>
            <pattern id="books" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
              <rect x="20" y="20" width="60" height="100" fill="none" stroke="currentColor" strokeWidth="2" rx="2" />
              <line x1="25" y1="30" x2="75" y2="30" stroke="currentColor" strokeWidth="1" opacity="0.5" />
              <line x1="25" y1="40" x2="75" y2="40" stroke="currentColor" strokeWidth="1" opacity="0.5" />
              <line x1="25" y1="50" x2="75" y2="50" stroke="currentColor" strokeWidth="1" opacity="0.5" />
              <line x1="25" y1="60" x2="75" y2="60" stroke="currentColor" strokeWidth="1" opacity="0.5" />
              <line x1="25" y1="70" x2="75" y2="70" stroke="currentColor" strokeWidth="1" opacity="0.5" />
              <line x1="25" y1="80" x2="75" y2="80" stroke="currentColor" strokeWidth="1" opacity="0.5" />
              <line x1="25" y1="90" x2="75" y2="90" stroke="currentColor" strokeWidth="1" opacity="0.5" />
              <line x1="25" y1="100" x2="75" y2="100" stroke="currentColor" strokeWidth="1" opacity="0.5" />
              <line x1="25" y1="110" x2="75" y2="110" stroke="currentColor" strokeWidth="1" opacity="0.5" />
            </pattern>
          </defs>
          <rect width="1200" height="800" fill="url(#books)" stroke="currentColor" />
        </svg>
        
        {/* 动画光线 */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />
        
        {/* 细微的网格纹理 */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>

      {/* 主阅读区 */}
      <main className="flex-1 relative flex overflow-hidden z-10">
        {/* 阅读器核心 */}
        <div className="flex-1 h-full w-full relative group">
          <EpubReader 
            bookId={id} 
            title={bookMetadata?.title}
            initialLocation={savedLocation}
            onLocationChange={(cfi, p) => {
              useReaderStore.getState().setCurrentLocation(cfi, p);
            }}
            onRenditionReady={(rend) => {
              setRendition(rend);
            }}
          />
          
          {/* 中心点击区域 - 打开控件（仅中心圆形区域） */}
          <div 
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-20"
            onClick={() => setShowControls(!showControls)}
          />
        </div>

        {/* 右侧边栏 - 笔记 */}
        <aside 
          className={`
            fixed inset-y-0 right-0 w-80 bg-slate-800/95 backdrop-blur shadow-xl transform transition-transform duration-300 z-50 border-l border-white/10 flex flex-col
            ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}
          `}
        >
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
            <h3 className="font-medium font-serif text-amber-100">阅读笔记</h3>
            <button onClick={toggleSidebar} className="text-amber-300 hover:text-amber-100">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loadingNotes ? (
              <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-amber-500" /></div>
            ) : notes.length === 0 ? (
              <div className="text-center py-8 text-amber-600 text-sm">
                <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>暂无笔记</p>
              </div>
            ) : (
              notes.map(note => (
                <div key={note.id} className="group relative pl-4 border-l-2 border-amber-700/50 hover:border-amber-500 transition-colors">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs text-amber-600">{new Date(note.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-amber-300 line-clamp-2 italic mb-1">&quot;{note.text}&quot;</p>
                  <p className="text-sm text-amber-100">{note.note}</p>
                </div>
              ))
            )}
          </div>
        </aside>
      </main>

      {/* 控件面板 - 分散式布局 */}
      {showControls && (
        <div className="fixed inset-0 z-40" onClick={() => setShowControls(false)}>
          {/* 左上角：返回书架按钮 */}
          <Link 
            href="/webread"
            className="fixed top-4 left-4 p-3 bg-slate-800/95 backdrop-blur rounded-full border border-white/10 hover:bg-slate-700 transition-colors z-50 flex items-center justify-center"
            title="保存并返回书架"
          >
            <ArrowLeft className="w-6 h-6 text-amber-300" />
          </Link>

          {/* 上部：主题与字体大小 */}
          <div 
            className="fixed top-4 left-1/2 -translate-x-1/2 bg-slate-800/95 backdrop-blur rounded-lg shadow-lg border border-white/10 p-4 w-96 z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-4">
              {/* 字体大小 */}
              <div>
                <label className="text-xs text-amber-300 mb-2 block font-medium uppercase tracking-wider">字体大小</label>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setFontSize(Math.max(12, fontSize - 2))}
                    className="p-2 hover:bg-slate-700 rounded transition-colors"
                  >
                    <Minus className="w-4 h-4 text-amber-300" />
                  </button>
                  <input 
                    type="range" 
                    min="12" 
                    max="28" 
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value))}
                    className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <span className="text-sm font-medium w-10 text-center text-amber-100">{fontSize}px</span>
                  <button 
                    onClick={() => setFontSize(Math.min(28, fontSize + 2))}
                    className="p-2 hover:bg-slate-700 rounded transition-colors"
                  >
                    <Plus className="w-4 h-4 text-amber-300" />
                  </button>
                </div>
              </div>
              
              {/* 主题切换 */}
              <div>
                <label className="text-xs text-amber-300 mb-2 block font-medium uppercase tracking-wider">阅读主题</label>
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={() => setTheme('light')}
                    className={`p-2 rounded flex flex-col items-center justify-center gap-1 text-xs font-medium transition-all ${theme === 'light' ? 'bg-amber-600 text-white border border-amber-500' : 'hover:bg-slate-700 text-amber-300 border border-white/10'}`}
                  >
                    <Sun className="w-4 h-4" />
                    <span>亮色</span>
                  </button>
                  <button 
                    onClick={() => setTheme('sepia')}
                    className={`p-2 rounded flex flex-col items-center justify-center gap-1 text-xs font-medium transition-all ${theme === 'sepia' ? 'bg-amber-700 text-white border border-amber-600' : 'hover:bg-slate-700 text-amber-300 border border-white/10'}`}
                  >
                    <Coffee className="w-3 h-3" />
                    <span>护眼</span>
                  </button>
                  <button 
                    onClick={() => setTheme('dark')}
                    className={`p-2 rounded flex flex-col items-center justify-center gap-1 text-xs font-medium transition-all ${theme === 'dark' ? 'bg-slate-700 text-white border border-slate-600' : 'hover:bg-slate-700 text-amber-300 border border-white/10'}`}
                  >
                    <Moon className="w-4 h-4" />
                    <span>暗色</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧：笔记按钮 */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              toggleSidebar();
            }}
            className="fixed top-4 right-4 p-3 bg-slate-800/95 backdrop-blur rounded-full border border-white/10 hover:bg-slate-700 transition-colors z-50 flex items-center justify-center"
            title={sidebarOpen ? '隐藏笔记' : '显示笔记'}
          >
            <BookOpen className="w-6 h-6 text-amber-300" />
          </button>

          {/* 底部：阅读进度与目录 */}
          <div 
            className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-800/95 backdrop-blur rounded-lg shadow-lg border border-white/10 p-4 w-96 z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-4">
              {/* 阅读进度 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-amber-300 font-medium uppercase tracking-wider">阅读进度</label>
                  <span className="text-lg font-bold text-amber-100">{Math.round(progress * 100)}%</span>
                </div>
                <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 transition-all duration-300"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
              </div>

              {/* 目录选择 */}
              <div className="relative">
                <label className="text-xs text-amber-300 mb-2 block font-medium uppercase tracking-wider">目录</label>
                {toc.length > 0 ? (
                  <select 
                    className="w-full px-3 py-2 bg-slate-700 border border-white/10 rounded text-amber-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 relative z-50"
                    value={currentChapter}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      if (e.target.value && rendition) {
                        try {
                          rendition.display(e.target.value);
                          setCurrentChapter(e.target.value);
                          setShowControls(false);
                        } catch (err) {
                          console.error('[ReaderPage] Failed to navigate to chapter:', err);
                        }
                      }
                    }}
                  >
                    {toc.map((item, idx) => (
                      <option key={idx} value={item.href}>
                        {'　'.repeat(item.depth)}{item.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-amber-500/60 text-sm py-2">此书籍无目录信息</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 底部进度条 */}
      <div className="h-1 bg-white/10 relative z-10">
        <div className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 transition-all duration-300" style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  );
}
