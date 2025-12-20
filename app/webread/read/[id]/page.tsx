'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useReaderStore } from '@/app/components/features/webread/useReaderStore';
import EpubReader from '@/app/components/features/webread/EpubReader';
import { Loader2, ArrowLeft, Menu, Settings, MessageSquare, ChevronRight, BookOpen } from 'lucide-react';
import Link from 'next/link';
import AIReaderAssistant from '@/app/components/features/webread/AIReaderAssistant';

interface BookMetadata {
  id: string;
  title: string;
  fileUrl: string;
  readingProgress?: Array<{
    currentChapter: string;
  }>;
}

export default function ReaderPage() {
  const { id } = useParams<{ id: string }>();
  const [bookMetadata, setBookMetadata] = useState<BookMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [notes, setNotes] = useState<any[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  
  // 使用 Store
  const { toggleSidebar, sidebarOpen, currentCfi, progress, addBubble } = useReaderStore();

  useEffect(() => {
    // 获取书籍元数据
    fetch(`/api/webread/books/${id}`)
      .then(res => res.json())
      .then(data => {
        setBookMetadata(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });

    // 获取笔记/气泡
    setLoadingNotes(true);
    fetch(`/api/webread/notes?bookId=${id}`)
      .then(res => res.json())
      .then(data => {
        setNotes(data);
        setLoadingNotes(false);
        // 初始化 Store 中的气泡
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data.forEach((note: any) => {
           if (note.type === 'AI_INSIGHT') {
               try {
                   const content = JSON.parse(note.aiContent as string);
                   addBubble({
                       id: note.id,
                       cfi: note.position,
                       snippet: content.analysis.substring(0, 50) + '...',
                       fullAnalysis: content.analysis,
                       type: 'AI_INSIGHT'
                   });
               } catch (e) { console.error('Error parsing note content', e); }
           }
        });
      })
      .catch(e => {
          console.error(e);
          setLoadingNotes(false);
      });
  }, [id, addBubble]);

  // 定期保存进度（带防抖）
  useEffect(() => {
    if (!currentCfi || !progress) return;
    
    const timer = setTimeout(async () => {
      try {
        console.log('[ReaderPage] Saving progress:', { progress: Math.round(progress * 100) + '%', cfi: currentCfi });
        const response = await fetch(`/api/webread/books/${id}/progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            progress,
            cfi: currentCfi,
            currentChapter: 'Unknown',
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Save failed: ${response.statusText}`);
        }
        
        console.log('[ReaderPage] ✓ Progress saved:', Math.round(progress * 100) + '%');
      } catch (e) {
        console.error('[ReaderPage] Failed to save progress:', e);
      }
    }, 2000); // 2秒防抖

    return () => clearTimeout(timer);
  }, [currentCfi, progress, id]);

  if (loading || !bookMetadata) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#FDFBF7]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#FDFBF7]">
      {/* 顶部导航栏 - 鼠标悬停显示 */}
      <header className="h-12 flex items-center justify-between px-4 border-b border-gray-100 bg-[#FDFBF7] z-50">
        <div className="flex items-center gap-4">
          <Link href="/webread" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </Link>
          <span className="text-sm font-medium text-gray-800 line-clamp-1 max-w-[200px]">
            {bookMetadata.title}
          </span>
        </div>
        <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-100 rounded-full">
                <Settings className="w-4 h-4 text-gray-600" />
            </button>
            <button onClick={toggleSidebar} className="p-2 hover:bg-gray-100 rounded-full">
                <Menu className="w-4 h-4 text-gray-600" />
            </button>
        </div>
      </header>

      {/* 主阅读区 + AI 助手 */}
      <main className="flex-1 relative flex overflow-hidden">
        {/* 阅读器核心 */}
        <div className="flex-1 h-full w-full relative">
            <EpubReader 
              url={bookMetadata.fileUrl} 
              bookId={id} 
              title={bookMetadata.title}
              initialLocation={bookMetadata.readingProgress?.[0]?.currentChapter}
              onLocationChange={(cfi, p) => {
                useReaderStore.getState().setCurrentLocation(cfi, p);
                console.log('[ReaderPage] Location changed:', { cfi, progress: p });
              }}
            />
            
            {/* 浮动 AI 助手层 (Heptapod) */}
            <AIReaderAssistant />
        </div>

        {/* 右侧边栏 (目录/笔记/详细对话) */}
        <aside 
            className={`
                fixed inset-y-0 right-0 w-80 bg-white shadow-xl transform transition-transform duration-300 z-50 border-l border-gray-100 flex flex-col
                ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}
            `}
        >
            <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-medium font-serif">阅读笔记</h3>
                <button onClick={toggleSidebar} className="text-gray-400 hover:text-gray-600">
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loadingNotes ? (
                    <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-gray-300" /></div>
                ) : notes.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                        <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p>暂无笔记或灵感</p>
                    </div>
                ) : (
                    notes.map(note => (
                        <div key={note.id} className="group relative pl-4 border-l-2 border-gray-100 hover:border-purple-300 transition-colors">
                            <div className="mb-1 flex items-center gap-2">
                                {note.type === 'AI_INSIGHT' && <MessageSquare className="w-3 h-3 text-purple-500" />}
                                <span className="text-xs text-gray-400">{new Date(note.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-2 italic mb-1">&quot;{note.text}&quot;</p>
                            {note.type === 'AI_INSIGHT' ? (
                                <p className="text-xs text-purple-700 bg-purple-50 p-2 rounded line-clamp-3">
                                    {JSON.parse(note.aiContent as string).analysis}
                                </p>
                            ) : (
                                <p className="text-sm text-gray-800">{note.note}</p>
                            )}
                            
                            <button 
                                onClick={() => {
                                    // Navigate to note location
                                    // TODO: Implement navigation via store
                                    // useReaderStore.getState().setBookLocation(note.position)
                                    // Close sidebar
                                    toggleSidebar();
                                    // Trigger bubble click if it's an insight
                                    if (note.type === 'AI_INSIGHT') {
                                        const event = new CustomEvent('ept-bubble-click', { detail: note.id });
                                        window.dispatchEvent(event);
                                    }
                                }}
                                className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-blue-600"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </aside>
      </main>
      
      {/* 底部进度条 (可选) */}
      <div className="h-1 bg-gray-100">
        <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  );
}