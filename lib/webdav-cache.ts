/**
 * WebDAV 电子书完整管理系统
 * 本地优先 + 云端同步，完全不依赖数据库
 * 
 * 存储结构：
 * /ebooks/
 *   ├── {bookId}.epub              # 书籍文件
 *   ├── {bookId}.meta.json         # 元数据（标题、作者、封面等）
 *   ├── {bookId}/
 *   │   ├── progress.json          # 阅读进度
 *   │   ├── notes.json             # 笔记和高亮
 *   │   └── bookmarks.json         # 书签
 */

import { createClient, WebDAVClient } from 'webdav';
import { getWebDAVConfig } from './webdav-config';

export interface BookMetadata {
  id: string;
  title: string;
  author?: string;
  coverUrl?: string;
  fileSize: number;
  uploadDate: number;
  lastModified: number;
}

export interface BookProgress {
  bookId: string;
  currentCfi: string;
  progress: number;
  currentChapter: string;
  lastReadAt: number;
}

export interface BookNote {
  id: string;
  cfi: string;
  text: string;
  note: string;
  createdAt: number;
  updatedAt: number;
}

export interface BookBookmark {
  id: string;
  cfi: string;
  label: string;
  createdAt: number;
}

// WebDAV 客户端单例
let webdavClient: WebDAVClient | null = null;
let lastConfig: string = '';
let dbVersion = 3; // 增加版本号以支持新的 stores
let dbUpgradeAttempts = 0; // 防止无限循环

// 本地存储键
const LOCAL_DB_NAME = 'webread-books';
const LOCAL_STORE_BOOKS = 'books';
const LOCAL_STORE_COVERS = 'covers';
const LOCAL_STORE_METADATA = 'metadata';
const LOCAL_STORE_PROGRESS = 'progress';
const LOCAL_STORE_NOTES = 'notes';
const LOCAL_STORE_ORDER = 'bookOrder';

/**
 * 初始化 WebDAV 客户端
 */
function initWebDAVClient(): WebDAVClient {
  const config = getWebDAVConfig();
  const configHash = JSON.stringify(config);
  
  if (lastConfig !== configHash) {
    webdavClient = null;
    lastConfig = configHash;
  }

  if (webdavClient) {
    return webdavClient;
  }

  try {
    webdavClient = createClient(config.url, {
      username: config.username,
      password: config.password,
    });
    return webdavClient;
  } catch (error) {
    throw new Error('WebDAV client initialization failed');
  }
}

/**
 * 重置 WebDAV 客户端
 */
export function resetWebDAVClient(): void {
  webdavClient = null;
  lastConfig = '';
  
}

/**
 * 获取 IndexedDB 实例
 */
function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(LOCAL_DB_NAME, dbVersion);
    
    request.onerror = () => {
      console.error('[WebDAV] Error opening database:', request.error);
      reject(request.error);
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    
    request.onupgradeneeded = (event) => {
      
      const db = (event.target as IDBOpenDBRequest).result;
      
      // 只创建不存在的 store，不删除现有的
      if (!db.objectStoreNames.contains(LOCAL_STORE_BOOKS)) {
        db.createObjectStore(LOCAL_STORE_BOOKS, { keyPath: 'id' });
        
      }
      if (!db.objectStoreNames.contains(LOCAL_STORE_COVERS)) {
        db.createObjectStore(LOCAL_STORE_COVERS, { keyPath: 'id' });
        
      }
      if (!db.objectStoreNames.contains(LOCAL_STORE_METADATA)) {
        db.createObjectStore(LOCAL_STORE_METADATA, { keyPath: 'id' });
        
      }
      if (!db.objectStoreNames.contains(LOCAL_STORE_PROGRESS)) {
        db.createObjectStore(LOCAL_STORE_PROGRESS, { keyPath: 'bookId' });
        
      }
      if (!db.objectStoreNames.contains(LOCAL_STORE_NOTES)) {
        const notesStore = db.createObjectStore(LOCAL_STORE_NOTES, { keyPath: 'id' });
        notesStore.createIndex('bookId', 'bookId', { unique: false });
        
      }
      if (!db.objectStoreNames.contains(LOCAL_STORE_ORDER)) {
        db.createObjectStore(LOCAL_STORE_ORDER, { keyPath: 'id' });
        
      }
      
      
    };
  });
}

/**
 * 安全地获取 transaction，确保所有 store 都存在
 */
async function safeTransaction<T>(
  storeNames: string[],
  mode: IDBTransactionMode,
  callback: (transaction: IDBTransaction) => Promise<T>
): Promise<T> {
  const db = await getDB();
  
  // 检查所有 store 是否存在
  let missingStores = false;
  for (const storeName of storeNames) {
    if (!db.objectStoreNames.contains(storeName)) {
      console.warn(`[WebDAV] Store not found: ${storeName}`);
      missingStores = true;
      break;
    }
  }
  
  // 如果有缺失的 store，关闭 DB 并增加版本号
  if (missingStores) {
    dbUpgradeAttempts++;
    if (dbUpgradeAttempts > 3) {
      console.error('[WebDAV] Too many upgrade attempts, giving up');
      dbUpgradeAttempts = 0;
      throw new Error('Failed to create required database stores');
    }
    
    db.close();
    dbVersion++;
    
    // 重新打开 DB，这次会触发 onupgradeneeded
    const newDb = await getDB();
    const transaction = newDb.transaction(storeNames, mode);
    return callback(transaction);
  }
  
  dbUpgradeAttempts = 0; // 重置计数器
  const transaction = db.transaction(storeNames, mode);
  return callback(transaction);
}

/**
 * 解码 bookId（处理 URL 编码）
 */
function decodeBookId(bookId: string): string {
  let decoded = bookId;
  // 尝试多次解码，直到不再变化（处理双重编码）
  for (let i = 0; i < 3; i++) {
    try {
      const newDecoded = decodeURIComponent(decoded);
      if (newDecoded === decoded) break;
      decoded = newDecoded;
    } catch {
      break;
    }
  }
  return decoded;
}

/**
 * 从本地获取书籍文件
 */
async function getBookFromLocal(bookId: string): Promise<Blob | null> {
  try {
    const decodedId = decodeBookId(bookId);
    const result = await safeTransaction(
      [LOCAL_STORE_BOOKS],
      'readonly',
      (transaction) => new Promise<Blob | null>((resolve, reject) => {
        const store = transaction.objectStore(LOCAL_STORE_BOOKS);
        const request = store.get(decodedId);
        
        // 添加超时保护
        const timeout = setTimeout(() => {
          reject(new Error('IndexedDB transaction timeout'));
        }, 5000);
        
        request.onerror = () => {
          clearTimeout(timeout);
          reject(request.error);
        };
        request.onsuccess = () => {
          clearTimeout(timeout);
          const result = request.result;
          if (result?.blob) {
            resolve(result.blob);
          } else {
            resolve(null);
          }
        };
      })
    );
    return result;
  } catch (error) {
    console.warn('[WebDAV] getBookFromLocal failed:', error);
    return null;
  }
}

/**
 * 保存书籍到本地
 */
async function saveBookToLocal(bookId: string, blob: Blob): Promise<void> {
  try {
    const decodedId = decodeBookId(bookId);
    
    return await safeTransaction(
      [LOCAL_STORE_BOOKS],
      'readwrite',
      (transaction) => new Promise<void>((resolve, reject) => {
        const store = transaction.objectStore(LOCAL_STORE_BOOKS);
        const request = store.put({
          id: decodedId,
          blob,
          savedAt: Date.now(),
        });
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          
          resolve();
        };
      })
    );
  } catch (error) {
    console.error('[WebDAV] Failed to save book to local:', error);
    throw error;
  }
}

/**
 * 保存封面到本地
 */
export async function saveCoverToLocal(bookId: string, blob: Blob): Promise<void> {
  try {
    const decodedId = decodeBookId(bookId);
    
    return await safeTransaction(
      [LOCAL_STORE_COVERS],
      'readwrite',
      (transaction) => new Promise<void>((resolve, reject) => {
        const store = transaction.objectStore(LOCAL_STORE_COVERS);
        const request = store.put({
          id: decodedId,
          blob,
          savedAt: Date.now(),
        });
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          
          resolve();
        };
      })
    );
  } catch (error) {
    console.error('[WebDAV] Failed to save cover to local:', error);
    throw error;
  }
}

/**
 * 从本地获取封面
 */
export async function getCoverFromLocal(bookId: string): Promise<Blob | null> {
  try {
    const decodedId = decodeBookId(bookId);
    const result = await safeTransaction(
      [LOCAL_STORE_COVERS],
      'readonly',
      (transaction) => new Promise<Blob | null>((resolve, reject) => {
        const store = transaction.objectStore(LOCAL_STORE_COVERS);
        const request = store.get(decodedId);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const result = request.result;
          if (result?.blob) {
            resolve(result.blob);
          } else {
            resolve(null);
          }
        };
      })
    );
    return result;
  } catch (error) {
    console.warn('[WebDAV] getCoverFromLocal failed:', error);
    return null;
  }
}

/**
 * 从 WebDAV 获取书籍
 */
async function getBookFromCloud(bookId: string): Promise<Blob | null> {
  try {
    const decodedId = decodeBookId(bookId);
    const config = getWebDAVConfig();
    const client = initWebDAVClient();
    
    // 确保路径正确构建（避免双斜杠）
    const ebookPath = config.ebookPath.endsWith('/') ? config.ebookPath.slice(0, -1) : config.ebookPath;
    const filePath = `${ebookPath}/${decodedId}.epub`;
    

    try {
      const fileContent = await client.getFileContents(filePath);
      const blob = new Blob([fileContent as ArrayBuffer], { type: 'application/epub+zip' });
      
      return blob;
    } catch (error) {
      
      return null;
    }
  } catch (error) {
    console.error('[WebDAV] getBookFromCloud failed:', error);
    return null;
  }
}

/**
 * 上传书籍到 WebDAV
 */
async function uploadBookToCloud(bookId: string, blob: Blob): Promise<void> {
  try {
    const config = getWebDAVConfig();
    const client = initWebDAVClient();
    
    // 确保目录存在
    try {
      await client.stat(config.ebookPath);
    } catch {
      
      await client.createDirectory(config.ebookPath);
    }

    const filePath = `${config.ebookPath}/${bookId}.epub`;
    const arrayBuffer = await blob.arrayBuffer();

    await client.putFileContents(filePath, arrayBuffer);
    
  } catch (error) {
    console.error('[WebDAV] Failed to upload to cloud:', error);
    throw error;
  }
}

/**
 * 获取书籍（本地优先，本地无则从云端下载）
 */
export async function getBook(bookId: string): Promise<Blob | null> {
  try {
    const decodedId = decodeBookId(bookId);
    
    
    // 1. 先从本地获取（带超时）
    let blob: Blob | null = null;
    try {
      blob = await Promise.race([
        getBookFromLocal(decodedId),
        new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('Local fetch timeout')), 3000)
        )
      ]);
    } catch (e) {
      blob = null;
    }
    
    if (blob) {
      
      return blob;
    }

    // 2. 本地无，从云端下载（带超时）
    
    try {
      blob = await Promise.race([
        getBookFromCloud(decodedId),
        new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('Cloud fetch timeout')), 10000)
        )
      ]);
    } catch (e) {
      console.error('[WebDAV] Cloud fetch failed:', e);
      return null;
    }
    
    if (blob) {
      
      // 3. 保存到本地以供下次使用
      await saveBookToLocal(decodedId, blob).catch(() => {});
      return blob;
    }

    console.warn('[WebDAV] Book not found');
    return null;
  } catch (error) {
    console.error('[WebDAV] getBook error:', error);
    return null;
  }
}

/**
 * 上传新书籍（同时写入本地和云端）
 */
export async function setBook(
  bookId: string,
  blob: Blob,
  metadata: BookMetadata
): Promise<void> {
  try {
    

    // 1. 保存到本地
    await saveBookToLocal(bookId, blob);
    await saveMetadataToLocal(metadata);

    // 2. 上传到云端（异步，不阻塞）
    uploadBookToCloud(bookId, blob).catch(e => {
      console.warn('[WebDAV] Failed to upload to cloud:', e);
    });
    uploadMetadataToCloud(bookId, metadata).catch(e => {
      console.warn('[WebDAV] Failed to upload metadata:', e);
    });
  } catch (error) {
    console.error('[WebDAV] Failed to sync book:', error);
    throw error;
  }
}

/**
 * 删除书籍
 */
export async function deleteBook(bookId: string): Promise<void> {
  try {
    

    // 1. 从本地删除
    try {
      await safeTransaction(
        [LOCAL_STORE_BOOKS, LOCAL_STORE_METADATA, LOCAL_STORE_PROGRESS, LOCAL_STORE_NOTES],
        'readwrite',
        (transaction) => new Promise<void>((resolve, reject) => {
          transaction.objectStore(LOCAL_STORE_BOOKS).delete(bookId);
          transaction.objectStore(LOCAL_STORE_METADATA).delete(bookId);
          transaction.objectStore(LOCAL_STORE_PROGRESS).delete(bookId);
          
          // 删除该书籍的所有笔记
          const notesStore = transaction.objectStore(LOCAL_STORE_NOTES);
          const notesIndex = notesStore.index('bookId');
          notesIndex.openCursor(IDBKeyRange.only(bookId)).onsuccess = (event: any) => {
            const cursor = event.target.result;
            if (cursor) {
              cursor.delete();
              cursor.continue();
            }
          };
          
          transaction.onerror = () => reject(transaction.error);
          transaction.oncomplete = () => {
            
            resolve();
          };
        })
      );
    } catch (error) {
      console.warn('[WebDAV] Failed to delete from local:', error);
    }

    // 2. 从云端删除
    try {
      const config = getWebDAVConfig();
      const client = initWebDAVClient();
      
      await client.deleteFile(`${config.ebookPath}/${bookId}.epub`);
      await client.deleteFile(`${config.ebookPath}/${bookId}.meta.json`);
      
      
    } catch (error) {
      console.warn('[WebDAV] Failed to delete from cloud:', error);
    }
  } catch (error) {
    console.error('[WebDAV] Failed to delete book:', error);
    throw error;
  }
}

/**
 * 获取所有本地书籍列表
 */
export async function getAllLocalBooks(): Promise<BookMetadata[]> {
  try {
    return await safeTransaction(
      [LOCAL_STORE_METADATA],
      'readonly',
      (transaction) => new Promise((resolve, reject) => {
        const store = transaction.objectStore(LOCAL_STORE_METADATA);
        const request = store.getAll();
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          resolve(request.result);
        };
      })
    );
  } catch (error) {
    console.error('[WebDAV] Failed to get all local books:', error);
    return [];
  }
}

/**
 * 保存书籍顺序
 */
export async function saveBookOrder(bookIds: string[]): Promise<void> {
  try {
    return await safeTransaction(
      [LOCAL_STORE_ORDER],
      'readwrite',
      (transaction) => new Promise<void>((resolve, reject) => {
        const store = transaction.objectStore(LOCAL_STORE_ORDER);
        const request = store.put({
          id: 'bookOrder',
          order: bookIds,
          savedAt: Date.now(),
        });
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          
          resolve();
        };
      })
    );
  } catch (error) {
    console.error('[WebDAV] Failed to save book order:', error);
    throw error;
  }
}

/**
 * 获取书籍顺序
 */
export async function getBookOrder(): Promise<string[]> {
  try {
    const result = await safeTransaction(
      [LOCAL_STORE_ORDER],
      'readonly',
      (transaction) => new Promise<string[]>((resolve, reject) => {
        const store = transaction.objectStore(LOCAL_STORE_ORDER);
        const request = store.get('bookOrder');
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const result = request.result;
          resolve(result?.order || []);
        };
      })
    );
    return result;
  } catch (error) {
    console.error('[WebDAV] Failed to get book order:', error);
    return [];
  }
}

/**
 * 保存元数据到本地
 */
async function saveMetadataToLocal(metadata: BookMetadata): Promise<void> {
  try {
    return await safeTransaction(
      [LOCAL_STORE_METADATA],
      'readwrite',
      (transaction) => new Promise((resolve, reject) => {
        const store = transaction.objectStore(LOCAL_STORE_METADATA);
        const request = store.put(metadata);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      })
    );
  } catch (error) {
    console.error('[WebDAV] Failed to save metadata:', error);
    throw error;
  }
}

/**
 * 更新书籍封面 URL
 */
export async function updateBookCover(bookId: string, coverUrl: string): Promise<void> {
  try {
    const decodedId = decodeBookId(bookId);
    const metadata = await getMetadataFromLocal(decodedId);
    if (metadata) {
      metadata.coverUrl = coverUrl;
      await saveMetadataToLocal(metadata);
    }
  } catch (error) {
    console.error('[WebDAV] Failed to update cover:', error);
  }
}

/**
 * 刷新所有书籍的封面 URL
 */
export async function refreshAllCovers(): Promise<void> {
  try {
    const config = getWebDAVConfig();
    const books = await getAllLocalBooks();
    
    for (const book of books) {
      const coverPath = config.ebookPath.replace('/file', '/cover').replace(/\/$/, '');
      const baseUrl = config.url.replace(/\/$/, '');
      const coverUrl = `${baseUrl}${coverPath}/${book.id}.jpg`;
      await updateBookCover(book.id, coverUrl);
    }
  } catch (error) {
    console.error('[WebDAV] Failed to refresh covers:', error);
  }
}

/**
 * 从本地获取元数据
 */
export async function getMetadataFromLocal(bookId: string): Promise<BookMetadata | null> {
  try {
    const decodedId = decodeBookId(bookId);
    const result = await safeTransaction(
      [LOCAL_STORE_METADATA],
      'readonly',
      (transaction) => new Promise<BookMetadata | null>((resolve, reject) => {
        const store = transaction.objectStore(LOCAL_STORE_METADATA);
        const request = store.get(decodedId);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || null);
      })
    );
    return result;
  } catch (error) {
    console.error('[WebDAV] getMetadataFromLocal failed:', error);
    return null;
  }
}

/**
 * 上传元数据到 WebDAV
 */
async function uploadMetadataToCloud(bookId: string, metadata: BookMetadata): Promise<void> {
  try {
    const config = getWebDAVConfig();
    const client = initWebDAVClient();
    const filePath = `${config.ebookPath}/${bookId}.meta.json`;

    const content = JSON.stringify(metadata, null, 2);
    await client.putFileContents(filePath, content);
    
  } catch (error) {
    console.error('[WebDAV] Failed to upload metadata:', error);
    throw error;
  }
}

/**
 * 从 WebDAV 获取元数据
 */
async function getMetadataFromCloud(bookId: string): Promise<BookMetadata | null> {
  try {
    const config = getWebDAVConfig();
    const client = initWebDAVClient();
    const filePath = `${config.ebookPath}/${bookId}.meta.json`;

    try {
      const content = await client.getFileContents(filePath);
      const metadata = JSON.parse(content as string);
      return metadata;
    } catch (error) {
      
      return null;
    }
  } catch (error) {
    console.error('[WebDAV] Failed to fetch metadata from cloud:', error);
    return null;
  }
}

/**
 * 保存阅读进度
 */
export async function saveProgress(progress: BookProgress): Promise<void> {
  try {
    // 规范化 bookId（解码 URL 编码）
    const decodedBookId = decodeBookId(progress.bookId);
    const normalizedProgress = {
      ...progress,
      bookId: decodedBookId,
    };
    
    // 1. 保存到本地
    await safeTransaction(
      [LOCAL_STORE_PROGRESS],
      'readwrite',
      (transaction) => new Promise<void>((resolve, reject) => {
        const store = transaction.objectStore(LOCAL_STORE_PROGRESS);
        const request = store.put(normalizedProgress);
        
        request.onerror = () => {
          console.error('[WebDAV] Error saving progress:', request.error);
          reject(request.error);
        };
        request.onsuccess = () => {
          resolve();
        };
      })
    );

    // 2. 上传到 WebDAV（异步）
    uploadProgressToCloud(decodedBookId, normalizedProgress).catch(e => {
      console.warn('[WebDAV] Failed to upload progress:', e);
    });
  } catch (error) {
    console.error('[WebDAV] Failed to save progress:', error);
    throw error;
  }
}

/**
 * 获取阅读进度
 */
export async function getProgress(bookId: string): Promise<BookProgress | null> {
  try {
    // 规范化 bookId（解码 URL 编码）
    const decodedBookId = decodeBookId(bookId);
    
    const result = await safeTransaction(
      [LOCAL_STORE_PROGRESS],
      'readonly',
      (transaction) => new Promise<BookProgress | null>((resolve, reject) => {
        const store = transaction.objectStore(LOCAL_STORE_PROGRESS);
        // 使用解码后的 bookId 查询，与 saveProgress 保持一致
        const request = store.get(decodedBookId);
        
        request.onerror = () => {
          reject(request.error);
        };
        request.onsuccess = () => {
          const result = request.result as BookProgress | undefined;
          resolve(result || null);
        };
      })
    );
    return result;
  } catch (error) {
    return null;
  }
}

/**
 * 上传进度到 WebDAV
 */
async function uploadProgressToCloud(bookId: string, progress: BookProgress): Promise<void> {
  try {
    const config = getWebDAVConfig();
    const client = initWebDAVClient();
    const dirPath = `${config.ebookPath}/${bookId}`;
    const filePath = `${dirPath}/progress.json`;

    // 确保目录存在
    try {
      await client.stat(dirPath);
    } catch {
      await client.createDirectory(dirPath);
    }

    const content = JSON.stringify(progress, null, 2);
    await client.putFileContents(filePath, content);
    
  } catch (error) {
    // 静默处理 - 进度已保存到本地，云端同步失败不影响用户体验
    // 常见错误：405 Method Not Allowed（浏览器 CORS 限制）
  }
}

/**
 * 保存笔记
 */
export async function saveNote(bookId: string, note: BookNote): Promise<void> {
  try {
    // 1. 保存到本地
    await safeTransaction(
      [LOCAL_STORE_NOTES],
      'readwrite',
      (transaction) => new Promise<void>((resolve, reject) => {
        const store = transaction.objectStore(LOCAL_STORE_NOTES);
        const request = store.put({ ...note, bookId });
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          
          resolve();
        };
      })
    );

    // 2. 上传到 WebDAV（异步）
    uploadNotesToCloud(bookId).catch(e => {
      console.warn('[WebDAV] Failed to upload notes:', e);
    });
  } catch (error) {
    console.error('[WebDAV] Failed to save note:', error);
    throw error;
  }
}

/**
 * 获取书籍的所有笔记
 */
export async function getNotes(bookId: string): Promise<BookNote[]> {
  try {
    return await safeTransaction(
      [LOCAL_STORE_NOTES],
      'readonly',
      (transaction) => new Promise((resolve, reject) => {
        const store = transaction.objectStore(LOCAL_STORE_NOTES);
        const request = store.getAll();
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const notes = request.result.filter((n: any) => n.bookId === bookId);
          resolve(notes);
        };
      })
    );
  } catch (error) {
    console.error('[WebDAV] Failed to get notes:', error);
    return [];
  }
}

/**
 * 上传笔记到 WebDAV
 */
async function uploadNotesToCloud(bookId: string): Promise<void> {
  try {
    const config = getWebDAVConfig();
    const client = initWebDAVClient();
    const dirPath = `${config.ebookPath}/${bookId}`;
    const filePath = `${dirPath}/notes.json`;

    // 获取所有笔记
    const notes = await getNotes(bookId);

    // 确保目录存在
    try {
      await client.stat(dirPath);
    } catch {
      await client.createDirectory(dirPath);
    }

    const content = JSON.stringify(notes, null, 2);
    await client.putFileContents(filePath, content);
    
  } catch (error) {
    // 静默处理 - 笔记已保存到本地，云端同步失败不影响用户体验
  }
}

/**
 * 从云端同步书籍到本地
 */
export async function syncBooksFromCloud(): Promise<{
  synced: number;
  failed: number;
  total: number;
}> {
  try {
    const config = getWebDAVConfig();
    const client = initWebDAVClient();
    
    // 获取云端所有书籍
    let cloudBooks: Array<{ bookId: string; filename: string }> = [];
    try {
      const items = await client.getDirectoryContents(config.ebookPath) as any[];
      cloudBooks = items
        .filter((item: any) => item.type === 'file' && item.filename.endsWith('.epub'))
        .map((item: any) => {
          const filename = item.filename.split('/').pop() || item.filename;
          const bookId = filename.replace('.epub', '');
          return { bookId, filename };
        });
    } catch (error) {
      return { synced: 0, failed: 0, total: 0 };
    }

    // 获取本地已有的书籍
    const localBooks = await getAllLocalBooks();
    const localBookIds = new Set(localBooks.map(b => b.id));

    // 找出需要同步的书籍
    const booksToSync = cloudBooks.filter(book => !localBookIds.has(book.bookId));

    // 逐个下载并保存到本地
    let synced = 0;
    let failed = 0;

    for (const book of booksToSync) {
      try {
        const blob = await getBookFromCloud(book.bookId);
        if (!blob) {
          failed++;
          continue;
        }

        let metadata = await getMetadataFromCloud(book.bookId);
        if (!metadata) {
          const coverPath = config.ebookPath.replace('/file', '/cover').replace(/\/$/, '');
          const baseUrl = config.url.replace(/\/$/, '');
          const coverUrl = `${baseUrl}${coverPath}/${book.bookId}.jpg`;
          
          metadata = {
            id: book.bookId,
            title: book.bookId.replace(/-\d+$/, ''),
            author: 'Unknown',
            coverUrl: coverUrl,
            fileSize: blob.size,
            uploadDate: Date.now(),
            lastModified: Date.now(),
          };
        }

        await saveBookToLocal(book.bookId, blob);
        await saveMetadataToLocal(metadata);
        synced++;
      } catch (error) {
        failed++;
      }
    }

    return { synced, failed, total: cloudBooks.length };
  } catch (error) {
    console.error('[WebDAV] Sync failed:', error);
    return { synced: 0, failed: 0, total: 0 };
  }
}

/**
 * 清空本地所有数据
 */
export async function clearAllLocalData(): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([LOCAL_STORE_BOOKS, LOCAL_STORE_METADATA, LOCAL_STORE_PROGRESS, LOCAL_STORE_NOTES], 'readwrite');
      
      transaction.objectStore(LOCAL_STORE_BOOKS).clear();
      transaction.objectStore(LOCAL_STORE_METADATA).clear();
      transaction.objectStore(LOCAL_STORE_PROGRESS).clear();
      transaction.objectStore(LOCAL_STORE_NOTES).clear();
      
      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => {
        
        resolve();
      };
    });
  } catch (error) {
    console.error('[WebDAV] Failed to clear local data:', error);
    throw error;
  }
}

/**
 * 测试 WebDAV 连接
 */
export async function testWebDAVConnection(): Promise<boolean> {
  try {
    const client = initWebDAVClient();
    const config = getWebDAVConfig();
    
    try {
      await client.stat(config.ebookPath);
    } catch {
      await client.createDirectory(config.ebookPath);
    }
    
    
    return true;
  } catch (error) {
    console.error('[WebDAV] Connection test failed:', error);
    return false;
  }
}

/**
 * 刷新所有书籍的封面 URL（使用 API 代理）
 */
export async function refreshAllCoversWithProxy(): Promise<void> {
  try {
    const books = await getAllLocalBooks();
    
    for (const book of books) {
      const coverUrl = `/api/webread/cover?bookId=${encodeURIComponent(book.id)}`;
      await updateBookCover(book.id, coverUrl);
    }
  } catch (error) {
    console.error('[WebDAV] Failed to refresh covers with proxy:', error);
  }
}

/**
 * 刷新所有书籍的封面 URL（客户端直接加载）
 */
export async function refreshAllCoversClientSide(): Promise<void> {
  try {
    const config = getWebDAVConfig();
    const books = await getAllLocalBooks();
    
    for (const book of books) {
      const coverPath = config.ebookPath.replace('/file', '/cover').replace(/\/$/, '');
      const baseUrl = config.url.replace(/\/$/, '');
      const coverUrl = `${baseUrl}${coverPath}/${book.id}.jpg`;
      await updateBookCover(book.id, coverUrl);
    }
  } catch (error) {
    console.error('[WebDAV] Failed to refresh covers:', error);
  }
}
