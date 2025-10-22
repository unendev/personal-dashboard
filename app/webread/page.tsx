'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Upload, Search, Eye, Clock, User, HardDrive } from 'lucide-react';
import CacheManagerModal from '@/app/components/features/webread/CacheManagerModal';
import * as ebookCache from '@/lib/ebook-cache';
import { generateDemoEpub } from '@/lib/demo-epub-generator';

interface Book {
  id: string;
  title: string;
  author: string | null;
  fileUrl: string;
  fileSize: number;
  uploadDate: string;
  coverUrl: string | null;
  readingProgress: Array<{
    progress: number;
    lastReadAt: string;
  }>;
}

interface BooksResponse {
  books: Book[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function WebReadPage() {
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [cacheModalOpen, setCacheModalOpen] = useState(false);
  const [cachedBookIds, setCachedBookIds] = useState<Set<string>>(new Set());

  // 获取书籍列表
  const fetchBooks = async () => {
    try {
      const response = await fetch('/api/webread/books');
      if (response.ok) {
        const data: BooksResponse = await response.json();
        
        // 加载示例书籍
        const demoBook = await loadDemoBook();
        
        // 合并示例书籍和真实书籍（示例书籍排在最前面）
        const allBooks = demoBook ? [demoBook, ...data.books] : data.books;
        setBooks(allBooks);
        
        // 获取书籍后检查缓存状态（优化：示例书籍已确定缓存）
        await checkCachedBooks(allBooks, demoBook ? DEMO_BOOK_ID : null);
      }
    } catch (error) {
      console.error('Failed to fetch books:', error);
    } finally {
      setLoading(false);
    }
  };

  // 检查哪些书籍已缓存
  const checkCachedBooks = async (bookList: Book[], knownCachedId?: string | null) => {
    if (!ebookCache.isIndexedDBSupported()) return;
    
    try {
      const cached = new Set<string>();
      
      // 如果有已知缓存的书籍，直接添加（跳过检查）
      if (knownCachedId) {
        cached.add(knownCachedId);
      }
      
      // 检查其他书籍
      for (const book of bookList) {
        // 跳过已知缓存的书籍
        if (book.id === knownCachedId) continue;
        
        const isCached = await ebookCache.isBookCached(book.id);
        if (isCached) {
          cached.add(book.id);
        }
      }
      
      setCachedBookIds(cached);
    } catch (error) {
      console.error('检查缓存状态失败:', error);
    }
  };

  // 缓存更新后刷新状态
  const handleCacheUpdated = () => {
    checkCachedBooks(books);
  };

  // 示例书籍固定 ID
  const DEMO_BOOK_ID = 'demo-book-webread';

  // 生成示例书籍（内部函数）
  const generateAndCacheDemoBook = async (): Promise<void> => {
    console.log('生成示例书籍...');
    const demoBlob = await generateDemoEpub({
      title: '示例电子书 - WebRead 测试',
      author: 'WebRead 系统',
      chapters: 3,
    });
    
    console.log('示例书籍生成完成:', ebookCache.formatFileSize(demoBlob.size));
    
    // 缓存到 IndexedDB（使用固定 ID）
    await ebookCache.setBook(
      DEMO_BOOK_ID,
      '', // 示例书籍无需 URL
      demoBlob,
      '示例电子书 - WebRead 测试'
    );
    
    console.log('✅ 示例书籍已缓存');
  };

  // 检查并加载示例书籍
  const loadDemoBook = async (): Promise<Book | null> => {
    if (!ebookCache.isIndexedDBSupported()) {
      return null;
    }

    try {
      // 检查缓存中是否已有示例书籍
      const isCached = await ebookCache.isBookCached(DEMO_BOOK_ID);
      
      if (!isCached) {
        // 首次访问，自动生成
        console.log('首次访问，自动生成示例书籍');
        await generateAndCacheDemoBook();
      }

      // 获取缓存信息以显示文件大小
      const cachedBlob = await ebookCache.getBook(DEMO_BOOK_ID);
      const fileSize = cachedBlob?.size || 15000; // 默认大小

      // 构造虚拟书籍对象
      const demoBook: Book = {
        id: DEMO_BOOK_ID,
        title: '示例电子书 - WebRead 测试',
        author: 'WebRead 系统',
        fileUrl: '', // 示例书籍纯缓存
        fileSize: fileSize,
        uploadDate: new Date().toISOString(),
        coverUrl: null,
        readingProgress: [],
      };

      return demoBook;
    } catch (error) {
      console.error('加载示例书籍失败:', error);
      return null;
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  // 文件上传处理
  const handleFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.epub')) {
      alert('请选择 EPUB 格式的文件');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name.replace('.epub', ''));

    try {
      const response = await fetch('/api/webread/books', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        await fetchBooks(); // 重新获取书籍列表
        setUploadModalOpen(false);
        alert('书籍上传成功！');
      } else {
        const error = await response.json();
        alert(`上传失败：${error.error}`);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  // 获取阅读进度
  const getReadingProgress = (book: Book) => {
    const progress = book.readingProgress[0];
    return progress ? Math.round(progress.progress * 100) : 0;
  };

  // 搜索过滤
  const filteredBooks = books.filter(book =>
    book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (book.author && book.author.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BookOpen className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">WebRead</h1>
              <p className="text-sm text-gray-500">智能阅读与知识管理平台</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setCacheModalOpen(true)}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 flex items-center space-x-2"
            >
              <HardDrive className="h-4 w-4" />
              <span>缓存管理</span>
            </button>
            <button
              onClick={() => setUploadModalOpen(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <Upload className="h-4 w-4" />
              <span>上传书籍</span>
            </button>
          </div>
        </div>
        </div>
      </div>

      {/* 搜索栏 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索书籍标题或作者..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* 书籍网格 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {filteredBooks.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? '未找到匹配的书籍' : '还没有上传任何书籍'}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm ? '尝试使用其他关键词搜索' : '点击上方按钮上传您的第一本书'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setUploadModalOpen(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
              >
                上传书籍
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredBooks.map((book) => (
              <div
                key={book.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/webread/reader/${book.id}`)}
              >
                {/* 封面 */}
                <div className="aspect-[3/4] bg-gray-100 rounded-t-lg flex items-center justify-center">
                  {book.coverUrl ? (
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className="w-full h-full object-cover rounded-t-lg"
                    />
                  ) : (
                    <BookOpen className="h-16 w-16 text-gray-400" />
                  )}
                </div>

                {/* 书籍信息 */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-medium text-gray-900 line-clamp-2 flex-1">
                      {book.title}
                    </h3>
                    {cachedBookIds.has(book.id) && (
                      <span className="ml-2 flex-shrink-0 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full flex items-center">
                        <HardDrive className="h-3 w-3 mr-1" />
                        已缓存
                      </span>
                    )}
                  </div>
                  {book.author && (
                    <p className="text-sm text-gray-500 mb-2 flex items-center">
                      <User className="h-3 w-3 mr-1" />
                      {book.author}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatDate(book.uploadDate)}
                    </span>
                    <span>{formatFileSize(book.fileSize)}</span>
                  </div>

                  {/* 阅读进度 */}
                  {book.readingProgress.length > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>阅读进度</span>
                        <span>{getReadingProgress(book)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${getReadingProgress(book)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 上传模态框 */}
      {uploadModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-4">上传书籍</h2>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".epub"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileUpload(file);
                  }
                }}
                className="hidden"
                id="file-upload"
                disabled={uploading}
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">
                  {uploading ? '上传中...' : '点击选择 EPUB 文件'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  支持最大 50MB 的 EPUB 文件
                </p>
              </label>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setUploadModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={uploading}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 缓存管理模态框 */}
      <CacheManagerModal
        isOpen={cacheModalOpen}
        onClose={() => setCacheModalOpen(false)}
        onCacheUpdated={handleCacheUpdated}
      />
    </div>
  );
}
