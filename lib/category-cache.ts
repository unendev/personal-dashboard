// 全局分类数据缓存
type CategoryNode = {
  id: string;
  name: string;
  children?: CategoryNode[];
};

let categoriesCache: CategoryNode[] = [];
let isCacheReady = false;
let cachePromise: Promise<CategoryNode[]> | null = null;

export const CategoryCache = {
  // 从本地存储加载缓存 (删除)
  // saveToStorage(data: CategoryNode[]): void (删除)

  // 预加载分类数据
  async preload(): Promise<CategoryNode[]> {
    if (cachePromise) {
      return cachePromise;
    }

    cachePromise = fetch('/api/log-categories')
      .then(res => res.json())
      .then((data: CategoryNode[]) => {
        categoriesCache = data;
        isCacheReady = true;
        console.log('分类数据缓存已准备就绪');
        return data;
      })
      .catch(error => {
        console.error('预加载分类数据失败:', error);
        isCacheReady = true; // 即使失败也标记为ready
        return [];
      });

    return cachePromise;
  },

  // 获取缓存的分类数据
  getCategories(): CategoryNode[] {
    return categoriesCache;
  },

  // 检查缓存是否准备就绪
  isReady(): boolean {
    return isCacheReady;
  },

  // 更新缓存
  updateCategories(categories: CategoryNode[]): void {
    categoriesCache = categories;
  },

  // 清除缓存
  clear(): void {
    categoriesCache = [];
    isCacheReady = false;
    cachePromise = null;
  }
};


