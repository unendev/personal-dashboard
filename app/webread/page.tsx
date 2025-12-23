'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Upload, Book as BookIcon, Trash2, Loader2, RefreshCw } from 'lucide-react';
import * as webdavCache from '@/lib/webdav-cache';
import WebDAVConfigPanel from '@/app/components/features/webread/WebDAVConfigPanel';

interface Book {
  id: string;
  title: string;
  author?: string;
  coverUrl?: string;
  fileSize: number;
  uploadDate: number;
  lastReadAt?: number;
}

// 封面组件，带错误处理和本地优先存储
function BookCover({ book, gradient }: { book: Book; gradient: string }) {
  const [imgError, setImgError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadCoverImage();
  }, [book.id, book.coverUrl]);

  const loadCoverImage = async () => {
    try {
      setLoading(true);
      setImgError(false);
      
      // 1. 先从本地存储获取
      const localBlob = await webdavCache.getCoverFromLocal(book.id);
      if (localBlob) {
        const dataUrl = URL.createObjectURL(localBlob);
        setImageSrc(dataUrl);
        setLoading(false);
        return;
      }
      
      // 2. 本地无，从 WebDAV 下载
      if (!book.coverUrl) {
        setImgError(true);
        setLoading(false);
        return;
      }
      
      const configResponse = await fetch('/api/webread/webdav-config');
      if (!configResponse.ok) {
        setImgError(true);
        setLoading(false);
        return;
      }
      
      const config = await configResponse.json();
      const auth = btoa(`${config.username}:${config.password}`);
      
      const extensions = ['.jpg', '.jpeg', '.png'];
      let loaded = false;
      
      for (const ext of extensions) {
        if (loaded) break;
        
        const baseUrl = book.coverUrl.replace(/\.(jpg|jpeg|png)$/i, '');
        const coverUrl = baseUrl + ext;
        
        try {
          const response = await fetch(coverUrl, {
            headers: { 'Authorization': `Basic ${auth}` },
            mode: 'cors',
            credentials: 'omit',
          });
          
          if (response.ok) {
            const blob = await response.blob();
            await webdavCache.saveCoverToLocal(book.id, blob).catch(() => {});
            const dataUrl = URL.createObjectURL(blob);
            setImageSrc(dataUrl);
            loaded = true;
            setLoading(false);
            break;
          }
        } catch {
          // 继续尝试下一个扩展名
        }
      }
      
      if (!loaded) {
        setImgError(true);
        setLoading(false);
      }
    } catch {
      setImgError(true);
      setLoading(false);
    }
  };

  if (imageSrc && !imgError) {
    return (
      <img 
        src={imageSrc} 
        alt={book.title} 
        className="w-full h-full object-cover"
        onError={() => setImgError(true)}
      />
    );
  }

  // Fallback: 渐变背景 + 书名
  return (
    <div className={`w-full h-full bg-gradient-to-br ${gradient} flex flex-col items-center justify-center p-4 relative`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
      <BookIcon className="w-10 h-10 text-white/20 mb-3" />
      <p className="text-white/60 text-xs text-center font-serif line-clamp-3 leading-relaxed">
        {book.title}
      </p>
    </div>
  );
}

export default function WebReadShelf() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const loadBooks = async () => {
    try {
      const books = await webdavCache.getAllLocalBooks();
      
      // 获取每本书的阅读进度，用于排序
      const booksWithProgress = await Promise.all(
        books.map(async (book) => {
          const progress = await webdavCache.getProgress(book.id);
          return {
            ...book,
            lastReadAt: progress?.lastReadAt || 0,
          };
        })
      );
      
      // 按最后阅读时间排序（最近阅读的在前）
      booksWithProgress.sort((a, b) => b.lastReadAt - a.lastReadAt);
      
      setBooks(booksWithProgress);
      
      // 刷新所有书籍的封面 URL
      await webdavCache.refreshAllCoversClientSide();
      
      // 重新加载以获取更新后的封面 URL
      const updatedBooks = await webdavCache.getAllLocalBooks();
      
      // 再次排序
      const updatedBooksWithProgress = await Promise.all(
        updatedBooks.map(async (book) => {
          const progress = await webdavCache.getProgress(book.id);
          return {
            ...book,
            lastReadAt: progress?.lastReadAt || 0,
          };
        })
      );
      
      updatedBooksWithProgress.sort((a, b) => b.lastReadAt - a.lastReadAt);
      setBooks(updatedBooksWithProgress);
    } catch (err) {
      console.error('Failed to load books', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooks();
    syncCloudBooks();
    
    // 多种方式监听页面重新获得焦点
    const handleFocus = () => {
      loadBooks();
    };
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadBooks();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const syncCloudBooks = async () => {
    try {
      setSyncing(true);
      const result = await webdavCache.syncBooksFromCloud();
      await webdavCache.refreshAllCoversClientSide();
      if (result.synced > 0) {
        await loadBooks();
      }
    } catch {
      // 同步失败，静默处理
    } finally {
      setSyncing(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.toLowerCase().endsWith('.epub')) {
      alert('请选择 EPUB 文件');
      return;
    }

    setUploading(true);
    try {
      // 生成 bookId
      const bookId = `${file.name.replace('.epub', '')}-${Date.now()}`;

      // 获取 WebDAV 配置以构建封面 URL
      const configResponse = await fetch('/api/webread/webdav-config');
      const config = configResponse.ok ? await configResponse.json() : null;
      
      // 构建封面 URL
      let coverUrl = '';
      if (config) {
        const coverPath = config.ebookPath.replace('/file', '/cover').replace(/\/$/, '');
        const baseUrl = config.url.replace(/\/$/, '');
        coverUrl = `${baseUrl}${coverPath}/${bookId}.jpeg`;
      }

      // 创建元数据（包含封面 URL）
      const metadata: webdavCache.BookMetadata = {
        id: bookId,
        title: file.name.replace('.epub', ''),
        author: 'Unknown',
        coverUrl: coverUrl,
        fileSize: file.size,
        uploadDate: Date.now(),
        lastModified: Date.now(),
      };

      // 上传书籍和元数据
      await webdavCache.setBook(bookId, file, metadata);
      

      // 重新加载书籍列表
      await loadBooks();
    } catch (err) {
      console.error('Upload failed:', err);
      alert('上传失败，请检查 WebDAV 配置');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('确认删除这本书吗？')) return;

    try {
      await webdavCache.deleteBook(id);
      setBooks(books.filter(b => b.id !== id));
      
    } catch (err) {
      console.error('[WebReadShelf] Delete failed:', err);
      alert('删除失败');
    }
  };

  // 生成书籍封面的渐变色（基于书名生成一致的颜色）
  const getBookGradient = (title: string) => {
    const gradients = [
      'from-indigo-900 via-purple-900 to-slate-900',
      'from-emerald-900 via-teal-900 to-slate-900',
      'from-amber-900 via-orange-900 to-slate-900',
      'from-rose-900 via-pink-900 to-slate-900',
      'from-cyan-900 via-blue-900 to-slate-900',
      'from-violet-900 via-fuchsia-900 to-slate-900',
    ];
    const index = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % gradients.length;
    return gradients[index];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-900 text-gray-100">
      {/* WebDAV 配置面板 */}
      <WebDAVConfigPanel />

      {/* 头部 - 暗色风格 */}
      <header className="px-6 py-8 md:px-12 flex justify-between items-end border-b border-white/5">
        <div>
          <h1 className="text-3xl font-serif font-medium tracking-tight text-amber-100">Heptapod Library</h1>
          <p className="text-slate-500 text-sm mt-2">非线性阅读体验</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => syncCloudBooks()}
            disabled={syncing}
            className="p-2 rounded-full border border-white/10 hover:border-amber-500/50 hover:bg-amber-500/10 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-slate-400 ${syncing ? 'animate-spin' : ''}`} />
          </button>
          <label className={`cursor-pointer px-4 py-2 rounded-full border border-white/10 hover:border-amber-500/50 hover:bg-amber-500/10 transition-colors flex items-center gap-2 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
            {uploading ? <Loader2 className="w-4 h-4 animate-spin text-amber-400" /> : <Upload className="w-4 h-4 text-slate-400" />}
            <span className="text-sm font-medium text-slate-300">导入 EPUB</span>
            <input type="file" accept=".epub" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      </header>

      {/* 书籍列表 */}
      <main className="px-6 py-12 md:px-12 max-w-7xl mx-auto">
        {loading ? (
          <div className="flex justify-center pt-20">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500/50" />
          </div>
        ) : books.length === 0 ? (
          <div className="text-center pt-32 text-slate-500 font-serif">
            <BookIcon className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-slate-400">书架是空的</p>
            <p className="text-sm mt-2 text-slate-600">导入《你一生的故事》开始体验</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-8 gap-y-12">
            {books.map((book) => (
              <div 
                key={book.id} 
                className="group relative flex flex-col"
              >
                {/* 封面 - 暗色渐变风格 */}
                <Link 
                  href={`/webread/read/${encodeURIComponent(book.id)}`}
                  className="aspect-[2/3] rounded-lg shadow-lg shadow-black/30 group-hover:shadow-xl group-hover:shadow-amber-500/10 transition-all duration-300 relative overflow-hidden block"
                >
                  <BookCover book={book} gradient={getBookGradient(book.title)} />
                  
                  {/* 悬停光效 */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
                
                {/* 删除按钮 */}
                <button 
                  onClick={(e) => handleDelete(e, book.id)}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 backdrop-blur rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600/80 z-10"
                  title="删除书籍"
                >
                  <Trash2 className="w-4 h-4 text-white/80" />
                </button>

                <div className="mt-4 space-y-1">
                  <h3 className="font-serif text-base leading-tight line-clamp-2 text-slate-200 group-hover:text-amber-200 transition-colors">
                    {book.title}
                  </h3>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">
                    {book.author || 'Unknown Author'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
