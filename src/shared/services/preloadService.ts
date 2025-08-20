/**
 * @file preloadService.ts
 * @description 预加载服务 - 实现 React 18 use() hook 的数据预加载
 * @author fmw666@github
 */

// =================================================================================================
// Types
// =================================================================================================

interface PreloadConfig {
  cacheTime?: number;
  staleTime?: number;
}

// =================================================================================================
// Preload Service
// =================================================================================================

class PreloadService {
  private preloadCache = new Map<string, Promise<any>>();
  // private config: Required<PreloadConfig>;

  constructor(_: PreloadConfig = {}) {
    // this.config = {
    //   cacheTime: config.cacheTime || 5 * 60 * 1000, // 5分钟
    //   staleTime: config.staleTime || 30 * 1000, // 30秒
    // };
  }

  /**
   * 预加载数据 - 返回一个可以被 React 18 use() hook 使用的 promise
   */
  preload<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: { force?: boolean }
  ): Promise<T> {
    const cacheKey = this.normalizeKey(key);

    // 如果强制刷新或缓存中没有，创建新的请求
    if (options?.force || !this.preloadCache.has(cacheKey)) {
      const promise = fetcher().catch(error => {
        // 请求失败时从缓存中移除
        this.preloadCache.delete(cacheKey);
        throw error;
      });

      this.preloadCache.set(cacheKey, promise);
    }

    return this.preloadCache.get(cacheKey)!;
  }

  /**
   * 预加载多个数据
   */
  preloadMultiple<T extends Record<string, () => Promise<any>>>(
    fetchers: T
  ): Promise<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }> {
    const promises = Object.entries(fetchers).map(([key, fetcher]) =>
      this.preload(key, fetcher).then(data => [key, data])
    );

    return Promise.all(promises).then(results => {
      return Object.fromEntries(results) as any;
    });
  }

  /**
   * 清除预加载缓存
   */
  clear(key?: string): void {
    if (key) {
      this.preloadCache.delete(this.normalizeKey(key));
    } else {
      this.preloadCache.clear();
    }
  }

  /**
   * 获取预加载统计信息
   */
  getStats() {
    return {
      size: this.preloadCache.size,
      keys: Array.from(this.preloadCache.keys()),
    };
  }

  // =================================================================================================
  // Private Methods
  // =================================================================================================

  private normalizeKey(key: string): string {
    return key.toLowerCase().trim();
  }
}

// =================================================================================================
// Global Instance
// =================================================================================================

export const preloadService = new PreloadService();

// =================================================================================================
// Utility Functions
// =================================================================================================

/**
 * 创建预加载函数 - 用于 React 18 use() hook
 */
export function createPreloader<T>(
  key: string,
  fetcher: () => Promise<T>
) {
  return () => preloadService.preload(key, fetcher);
}

/**
 * 预加载用户数据
 */
export const preloadUser = createPreloader('user', async () => {
  // 这里可以调用实际的用户服务
  const response = await fetch('/api/user');
  return response.json();
});

/**
 * 预加载任务列表
 */
export const preloadTasks = createPreloader('tasks', async () => {
  // 这里可以调用实际的任务服务
  const response = await fetch('/api/tasks');
  return response.json();
});

// =================================================================================================
// Exports
// =================================================================================================

export { PreloadService };
export type { PreloadConfig };
