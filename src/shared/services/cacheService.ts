/**
 * @file cacheService.ts
 * @description 智能缓存服务 - 实现请求缓存、合并和过期策略
 * @author fmw666@github
 */

// =================================================================================================
// Types
// =================================================================================================

interface CacheItem<T> {
  data: T;
  timestamp: number;
  promise?: Promise<T>;
}

interface CacheConfig {
  maxAge?: number; // 缓存过期时间（毫秒）
  maxSize?: number; // 最大缓存条目数
}

// =================================================================================================
// Cache Service
// =================================================================================================

class CacheService {
  private cache = new Map<string, CacheItem<any>>();
  private config: Required<CacheConfig>;

  constructor(config: CacheConfig = {}) {
    this.config = {
      maxAge: config.maxAge || 5 * 60 * 1000, // 默认5分钟
      maxSize: config.maxSize || 100, // 默认100条
    };
  }

  /**
   * 智能获取数据 - 支持缓存和请求合并
   */
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: { force?: boolean }
  ): Promise<T> {
    const cacheKey = this.normalizeKey(key);
    const now = Date.now();

    // 检查缓存是否存在且未过期
    if (!options?.force && this.cache.has(cacheKey)) {
      const item = this.cache.get(cacheKey)!;
      
      // 检查是否过期
      if (now - item.timestamp < this.config.maxAge) {
        return item.data;
      }
      
      // 如果过期但有进行中的请求，返回该请求
      if (item.promise) {
        return item.promise;
      }
    }

    // 创建新的请求
    const promise = fetcher().then(data => {
      // 请求成功后，更新缓存
      this.set(cacheKey, data);
      return data;
    });

    // 如果缓存中没有进行中的请求，先存储promise防止重复请求
    if (!this.cache.has(cacheKey) || !this.cache.get(cacheKey)?.promise) {
      this.cache.set(cacheKey, {
        data: null as any,
        timestamp: now,
        promise,
      });
    }

    return promise;
  }

  /**
   * 设置缓存
   */
  set<T>(key: string, data: T): void {
    const cacheKey = this.normalizeKey(key);
    
    // 检查缓存大小限制
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * 清除缓存
   */
  clear(key?: string): void {
    if (key) {
      this.cache.delete(this.normalizeKey(key));
    } else {
      this.cache.clear();
    }
  }

  /**
   * 清除过期缓存
   */
  clearExpired(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > this.config.maxAge) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      maxAge: this.config.maxAge,
    };
  }

  // =================================================================================================
  // Private Methods
  // =================================================================================================

  private normalizeKey(key: string): string {
    return key.toLowerCase().trim();
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.timestamp < oldestTime) {
        oldestTime = item.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}

// =================================================================================================
// Global Instance
// =================================================================================================

const cacheService = new CacheService();

// =================================================================================================
// Exports
// =================================================================================================

export { cacheService, CacheService };
export type { CacheConfig };
