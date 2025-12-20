'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Upload, Book as BookIcon, Trash2, Clock, MoreVertical, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as webdavCache from '@/lib/webdav-cache';

interface Book {
  id: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  fileSize: number;
  uploadDate: string;
  readingProgress: Array<{
    progress: number;
    currentChapter: string;
  }>;
}

export default function WebReadShelf() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      const res = await fetch('/api/webread/books');
      if (res.ok) {
        const data = await res.json();
        setBooks(data.books);
        
        // 预热缓存检查
        if (webdavCache.isWebDAVSupported()) {
             data.books.forEach(async (book: Book) => {
                 const isCached = await webdavCache.isBookCached(book.id);
                 if (!isCached) {
                     // 可以在这里静默下载，或者在 UI 上显示“云端”图标
                     console.log(`Book ${book.title} is not cached locally.`);
                 }
             });
        }
      }
    } catch (err) {
      console.error('Failed to load books', err);
    } finally {
      setLoading(false);
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
      // 1. 获取签名
      const signRes = await fetch(`/api/webread/books/upload-sign?filename=${encodeURIComponent(file.name)}`);
      if (!signRes.ok) throw new Error('Failed to get upload signature');
      const signData = await signRes.json();

      // 2. 直传 OSS
      const formData = new FormData();
      formData.append('key', signData.key);
      formData.append('policy', signData.policy);
      formData.append('OSSAccessKeyId', signData.accessKeyId);
      formData.append('success_action_status', '200');
      formData.append('signature', signData.signature);
      formData.append('file', file);

      const uploadRes = await fetch(signData.endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) throw new Error('Failed to upload to OSS');

      // 3. 创建数据库记录
      const bookRes = await fetch('/api/webread/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: file.name.replace('.epub', ''),
          author: 'Unknown', // 可以在前端解析 epub 元数据优化
          fileUrl: signData.url,
          fileSize: file.size,
          coverUrl: null, // TODO: 解析封面
        }),
      });

      if (!bookRes.ok) throw new Error('Failed to save book record');
      
      const newBook = await bookRes.json();
      
      // 4. 自动存入 WebDAV 缓存
      if (webdavCache.isWebDAVSupported()) {
          await webdavCache.setBook(newBook.id, newBook.fileUrl, file, newBook.title);
      }

      await fetchBooks();
    } catch (err) {
      console.error('Upload failed:', err);
      alert('上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('确认删除这本书吗？')) return;

    try {
      await fetch(`/api/webread/books/${id}`, { method: 'DELETE' });
      // 清除 WebDAV 缓存
      if (webdavCache.isWebDAVSupported()) {
          await webdavCache.deleteBook(id);
      }
      setBooks(books.filter(b => b.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-gray-900">
      {/* 极简头部 */}
      <header className="px-6 py-8 md:px-12 flex justify-between items-end border-b border-gray-100">
        <div>
          <h1 className="text-3xl font-serif font-medium tracking-tight">Heptapod Library</h1>
          <p className="text-gray-400 text-sm mt-2">非线性阅读体验</p>
        </div>
        <div className="flex items-center gap-4">
          <label className={`cursor-pointer px-4 py-2 rounded-full border border-gray-200 hover:border-black transition-colors flex items-center gap-2 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span className="text-sm font-medium">导入 EPUB</span>
            <input type="file" accept=".epub" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      </header>

      {/* 书籍列表 */}
      <main className="px-6 py-12 md:px-12 max-w-7xl mx-auto">
        {loading ? (
          <div className="flex justify-center pt-20">
            <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
          </div>
        ) : books.length === 0 ? (
          <div className="text-center pt-32 text-gray-400 font-serif">
            <BookIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>书架是空的</p>
            <p className="text-sm mt-2">导入《你一生的故事》开始体验</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-8 gap-y-12">
            {books.map((book) => (
              <Link 
                key={book.id} 
                href={`/webread/read/${book.id}`}
                className="group relative flex flex-col"
              >
                {/* 封面占位符 - 优雅的纯色或渐变 */}
                <div className="aspect-[2/3] bg-white shadow-sm border border-gray-100 group-hover:shadow-md transition-all duration-300 relative overflow-hidden rounded-sm">
                  {book.coverUrl ? (
                    <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 text-gray-300">
                      <BookIcon className="w-12 h-12 opacity-20" />
                    </div>
                  )}
                  
                  {/* 进度条 */}
                  {book.readingProgress?.[0] && (
                    <div className="absolute bottom-0 left-0 h-1 bg-gray-100 w-full">
                      <div 
                        className="h-full bg-black/40" 
                        style={{ width: `${book.readingProgress[0].progress * 100}%` }} 
                      />
                    </div>
                  )}
                  
                  {/* 删除按钮 */}
                  <button 
                    onClick={(e) => handleDelete(e, book.id)}
                    className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-4 space-y-1">
                  <h3 className="font-serif text-lg leading-tight line-clamp-2 group-hover:underline decoration-1 underline-offset-4">
                    {book.title}
                  </h3>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">
                    {book.author || 'Unknown Author'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
