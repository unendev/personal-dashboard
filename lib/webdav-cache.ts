/**
 * WebDAV 电子书缓存管理器
 * 用于通过 WebDAV 协议存储和检索 EPUB 文件
 * 替代 IndexedDB，提供更好的跨设备同步和存储管理
 */

import { createClient, WebDAVClient } from 'webdav';

export interface CachedBook {
  bookId: string;        // 主键
  fileUrl: string;       // 原始 OSS URL
  fileName: string;      // WebDAV 中的文件名
  cachedAt: number;      // 缓存时间戳
  lastAccessAt: number;  // 最后访问时间
  fileSize: number;      // 文件大小（字节）
  title: string;         // 书名
}

export interface CacheStats {
  totalSize: number;     // 总占用空间
  totalBooks: number;    // 总书籍数
  books: Array<{
    bookId: string;
    title: string;
    fileSize: number;
    cachedAt: Date;
    lastAccessAt: Date;
  }>;
}

// WebDAV 客户端单例
let webdavClient: WebDAVClient | null = null;

const WEBDAV_URL = process.env.WEBDAV_URL || 'http://localhost:8080/webdav';
const WEBDAV_USERNAME = process.env.WEBDAV_USERNAME || 'admin';
const WEBDAV_PASSWORD = process.env.WEBDAV_PASSWORD || 'admin';
const WEBDAV_EBOOK_PATH = process.env.WEBDAV_EBOOK_PATH || '/ebooks';
const MAX_CACHE_SIZE = 200 * 1024 * 1024; // 200 MB
const CLEANUP_THRESHOLD = 0.9; // 90% 时触发清理
const CLEANUP_RATIO = 0.2; // 清理 20% 的书籍

/**
 * 初始化 WebDAV 客户端
 */
function initWebDAVClient(): WebDAVClient {
  if (webdavClient) {
    return webdavClient;
  }

  try {
    webdavClient = createClient(WEBDAV_URL, {
      username: WEBDAV_USERNAME,
      password: WEBDAV_PASSWORD,
    });
    console.log('[WebDAV] Client initialized successfully');
    return webdavClient;
  } catch (error) {
    console.error('[WebDAV] Failed to initialize client:', error);
    throw new Error('WebDAV client initialization failed');
  }
}

/**
 * 确保 WebDAV 目录存在
 */
async function ensureDirectoryExists(): Promise<void> {
  try {
    const client = initWebDAVClient();
    
    // 检查目录是否存在
    try {
      await client.stat(WEBDAV_EBOOK_PATH);
      console.log('[WebDAV] Directory exists:', WEBDAV_EBOOK_PATH);
    } catch (error) {
      // 目录不存在，创建它
      console.log('[WebDAV] Creating directory:', WEBDAV_EBOOK_PATH);
      await client.createDirectory(WEBDAV_EBOOK_PATH);
      console.log('[WebDAV] ✓ Directory created');
    }
  } catch (error) {
    console.error('[WebDAV] Failed to ensure directory exists:', error);
    throw error;
  }
}

/**
 * 获取缓存的书籍
 */
export async function getBook(bookId: string): Promise<Blob | null> {
  try {
    const client = initWebDAVClient();
    const fileName = `${bookId}.epub`;
    const filePath = `${WEBDAV_EBOOK_PATH}/${fileName}`;

    console.log('[WebDAV] Attempting to retrieve book:', bookId);

    // 检查文件是否存在
    try {
      // @ts-ignore - webdav library type definitions issue
      const stat = await client.stat(filePath);
      // @ts-ignore
      const fileSize = stat.size || stat.props?.getcontentlength;
      console.log('[WebDAV] ✓ Book found, size:', fileSize);

      // 获取文件内容
      const fileContent = await client.getFileContents(filePath, { format: 'binary' });
      
      // 更新最后访问时间（异步，不阻塞）
      updateLastAccess(bookId).catch(console.warn);

      return new Blob([fileContent as ArrayBuffer], { type: 'application/epub+zip' });
    } catch (error) {
      console.log('[WebDAV] Book not found in cache:', bookId);
      return null;
    }
  } catch (error) {
    console.error('[WebDAV] Failed to get book:', error);
    return null;
  }
}

/**
 * 缓存书籍
 */
export async function setBook(
  bookId: string,
  fileUrl: string,
  blob: Blob,
  title: string
): Promise<void> {
  try {
    await ensureDirectoryExists();
    
    const client = initWebDAVClient();
    const fileName = `${bookId}.epub`;
    const filePath = `${WEBDAV_EBOOK_PATH}/${fileName}`;

    console.log('[WebDAV] Caching book:', { bookId, title, size: blob.size });

    // 检查容量并清理
    await checkAndCleanup(blob.size);

    // 将 Blob 转换为 ArrayBuffer
    const arrayBuffer = await blob.arrayBuffer();

    // 上传文件到 WebDAV
    // @ts-ignore - webdav library type definitions issue
    await client.putFileContents(filePath, arrayBuffer, { format: 'binary' });
    
    console.log('[WebDAV] ✓ Book cached successfully');
  } catch (error) {
    console.error('[WebDAV] Failed to cache book:', error);
    throw error;
  }
}

/**
 * 更新最后访问时间
 */
export async function updateLastAccess(bookId: string): Promise<void> {
  try {
    const client = initWebDAVClient();
    const fileName = `${bookId}.epub`;
    const filePath = `${WEBDAV_EBOOK_PATH}/${fileName}`;

    // WebDAV 不直接支持修改访问时间，但我们可以通过元数据或单独的文件来跟踪
    // 这里我们创建一个 .meta 文件来存储元数据
    const metaPath = `${filePath}.meta`;
    const metadata = {
      lastAccessAt: Date.now(),
    };

    await client.putFileContents(metaPath, JSON.stringify(metadata));
    console.log('[WebDAV] ✓ Last access time updated');
  } catch (error) {
    console.warn('[WebDAV] Failed to update last access time:', error);
  }
}

/**
 * 获取所有缓存的书籍
 */
export async function getAllBooks(): Promise<CachedBook[]> {
  try {
    await ensureDirectoryExists();
    
    const client = initWebDAVClient();
    const books: CachedBook[] = [];

    console.log('[WebDAV] Listing all cached books...');

    // 列出目录中的所有文件
    const items = await client.getDirectoryContents(WEBDAV_EBOOK_PATH) as any[];

    for (const item of items) {
      // 跳过目录和元数据文件
      if (item.type === 'directory' || item.filename.endsWith('.meta')) {
        continue;
      }

      if (item.filename.endsWith('.epub')) {
        const bookId = item.filename.replace('.epub', '');
        
        // 尝试读取元数据
        let cachedAt = Date.now();
        let lastAccessAt = Date.now();
        
        try {
          const metaPath = `${WEBDAV_EBOOK_PATH}/${item.filename}.meta`;
          const metaContent = await client.getFileContents(metaPath, { format: 'text' });
          const metadata = JSON.parse(metaContent as string);
          lastAccessAt = metadata.lastAccessAt || Date.now();
        } catch (e) {
          // 元数据文件不存在，使用默认值
        }

        books.push({
          bookId,
          fileUrl: '',
          fileName: item.filename,
          cachedAt,
          lastAccessAt,
          fileSize: item.size || 0,
          title: bookId,
        });
      }
    }

    console.log('[WebDAV] Found', books.length, 'cached books');
    return books;
  } catch (error) {
    console.error('[WebDAV] Failed to get all books:', error);
    return [];
  }
}

/**
 * 删除单本书籍
 */
export async function deleteBook(bookId: string): Promise<void> {
  try {
    const client = initWebDAVClient();
    const fileName = `${bookId}.epub`;
    const filePath = `${WEBDAV_EBOOK_PATH}/${fileName}`;
    const metaPath = `${filePath}.meta`;

    console.log('[WebDAV] Deleting book:', bookId);

    // 删除主文件
    try {
      await client.deleteFile(filePath);
      console.log('[WebDAV] ✓ Book file deleted');
    } catch (e) {
      console.warn('[WebDAV] Book file not found:', filePath);
    }

    // 删除元数据文件
    try {
      await client.deleteFile(metaPath);
      console.log('[WebDAV] ✓ Metadata file deleted');
    } catch (e) {
      console.warn('[WebDAV] Metadata file not found:', metaPath);
    }
  } catch (error) {
    console.error('[WebDAV] Failed to delete book:', error);
    throw error;
  }
}

/**
 * 清空所有缓存
 */
export async function clearAllBooks(): Promise<void> {
  try {
    const books = await getAllBooks();
    
    console.log('[WebDAV] Clearing all cached books...');

    for (const book of books) {
      await deleteBook(book.bookId);
    }

    console.log('[WebDAV] ✓ All books cleared');
  } catch (error) {
    console.error('[WebDAV] Failed to clear all books:', error);
    throw error;
  }
}

/**
 * 获取总占用空间
 */
export async function getTotalSize(): Promise<number> {
  try {
    const books = await getAllBooks();
    return books.reduce((total, book) => total + book.fileSize, 0);
  } catch (error) {
    console.error('[WebDAV] Failed to get total size:', error);
    return 0;
  }
}

/**
 * 获取缓存统计信息
 */
export async function getCacheStats(): Promise<CacheStats> {
  try {
    const books = await getAllBooks();
    const totalSize = books.reduce((sum, book) => sum + book.fileSize, 0);

    return {
      totalSize,
      totalBooks: books.length,
      books: books.map((book) => ({
        bookId: book.bookId,
        title: book.title,
        fileSize: book.fileSize,
        cachedAt: new Date(book.cachedAt),
        lastAccessAt: new Date(book.lastAccessAt),
      })),
    };
  } catch (error) {
    console.error('[WebDAV] Failed to get cache stats:', error);
    return {
      totalSize: 0,
      totalBooks: 0,
      books: [],
    };
  }
}

/**
 * 检查容量并执行 LRU 清理
 */
async function checkAndCleanup(newFileSize: number): Promise<void> {
  const currentSize = await getTotalSize();
  const projectedSize = currentSize + newFileSize;

  if (projectedSize > MAX_CACHE_SIZE * CLEANUP_THRESHOLD) {
    console.log('[WebDAV] Cache space approaching limit, starting LRU cleanup...');
    await clearOldBooks();
  }
}

/**
 * 清理最旧的书籍（LRU 策略）
 */
async function clearOldBooks(): Promise<void> {
  try {
    const books = await getAllBooks();
    
    // 按最后访问时间排序（最旧的在前）
    const sortedBooks = books.sort((a, b) => a.lastAccessAt - b.lastAccessAt);
    
    // 计算要删除的数量
    const deleteCount = Math.ceil(sortedBooks.length * CLEANUP_RATIO);
    const booksToDelete = sortedBooks.slice(0, deleteCount);

    console.log('[WebDAV] Deleting', deleteCount, 'least recently accessed books');

    for (const book of booksToDelete) {
      await deleteBook(book.bookId);
      console.log('[WebDAV] Deleted:', book.title, `(${formatFileSize(book.fileSize)})`);
    }

    const newSize = await getTotalSize();
    console.log('[WebDAV] Cleanup complete, current usage:', formatFileSize(newSize));
  } catch (error) {
    console.error('[WebDAV] LRU cleanup failed:', error);
  }
}

/**
 * 检查书籍是否已缓存
 */
export async function isBookCached(bookId: string): Promise<boolean> {
  try {
    const blob = await getBook(bookId);
    return blob !== null;
  } catch {
    return false;
  }
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * 获取缓存使用百分比
 */
export async function getCacheUsagePercent(): Promise<number> {
  const totalSize = await getTotalSize();
  return (totalSize / MAX_CACHE_SIZE) * 100;
}

/**
 * 获取最大缓存容量
 */
export function getMaxCacheSize(): number {
  return MAX_CACHE_SIZE;
}

/**
 * 检查 WebDAV 是否可用
 */
export function isWebDAVSupported(): boolean {
  return typeof process !== 'undefined' && !!WEBDAV_URL;
}

/**
 * 测试 WebDAV 连接
 */
export async function testWebDAVConnection(): Promise<boolean> {
  try {
    const client = initWebDAVClient();
    await ensureDirectoryExists();
    console.log('[WebDAV] ✓ Connection test successful');
    return true;
  } catch (error) {
    console.error('[WebDAV] Connection test failed:', error);
    return false;
  }
}
