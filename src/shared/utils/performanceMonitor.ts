/**
 * @file performanceMonitor.ts
 * @description 性能监控工具 - 监控应用性能指标
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

import React from 'react';

// =================================================================================================
// Types
// =================================================================================================

interface PerformanceMetrics {
  // 页面加载性能
  pageLoadTime: number;
  domContentLoaded: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  
  // 交互性能
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  
  // 内存使用
  memoryUsage?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
  
  // 自定义指标
  customMetrics: Record<string, number>;
}

interface PerformanceObserver {
  observe: (options: PerformanceObserverInit) => void;
  disconnect: () => void;
}

// =================================================================================================
// Performance Monitor Class
// =================================================================================================

class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private observers: PerformanceObserver[] = [];
  private customMetrics: Map<string, number> = new Map();

  constructor() {
    this.metrics = {
      pageLoadTime: 0,
      domContentLoaded: 0,
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      firstInputDelay: 0,
      cumulativeLayoutShift: 0,
      customMetrics: {},
    };

    this.initializeMetrics();
    this.setupObservers();
  }

  /**
   * 初始化性能指标
   */
  private initializeMetrics(): void {
    // 页面加载时间
    if (performance.timing) {
      this.metrics.pageLoadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
    }

    // DOM 内容加载时间
    if (performance.timing) {
      this.metrics.domContentLoaded = performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart;
    }

    // 内存使用情况
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      };
    }
  }

  /**
   * 设置性能观察器
   */
  private setupObservers(): void {
    // First Contentful Paint
    this.observePaint('first-contentful-paint', (entry) => {
      this.metrics.firstContentfulPaint = entry.startTime;
    });

    // Largest Contentful Paint
    this.observeLCP((entry) => {
      this.metrics.largestContentfulPaint = entry.startTime;
    });

    // First Input Delay
    this.observeFID((entry: any) => {
      this.metrics.firstInputDelay = entry.processingStart - entry.startTime;
    });

    // Cumulative Layout Shift
    this.observeCLS((entry: any) => {
      this.metrics.cumulativeLayoutShift += entry.value;
    });
  }

  /**
   * 观察绘制性能
   */
  private observePaint(name: string, callback: (entry: PerformanceEntry) => void): void {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new (window as any).PerformanceObserver((list: PerformanceObserverEntryList) => {
          for (const entry of list.getEntries()) {
            if (entry.name === name) {
              callback(entry);
            }
          }
        });

        observer.observe({ entryTypes: ['paint'] });
        this.observers.push(observer);
      } catch (error) {
        console.warn('PerformanceObserver not supported for paint:', error);
      }
    }
  }

  /**
   * 观察最大内容绘制
   */
  private observeLCP(callback: (entry: PerformanceEntry) => void): void {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new (window as any).PerformanceObserver((list: PerformanceObserverEntryList) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          callback(lastEntry);
        });

        observer.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(observer);
      } catch (error) {
        console.warn('PerformanceObserver not supported for LCP:', error);
      }
    }
  }

  /**
   * 观察首次输入延迟
   */
  private observeFID(callback: (entry: PerformanceEntry) => void): void {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new (window as any).PerformanceObserver((list: PerformanceObserverEntryList) => {
          for (const entry of list.getEntries()) {
            callback(entry);
          }
        });

        observer.observe({ entryTypes: ['first-input'] });
        this.observers.push(observer);
      } catch (error) {
        console.warn('PerformanceObserver not supported for FID:', error);
      }
    }
  }

  /**
   * 观察累积布局偏移
   */
  private observeCLS(callback: (entry: PerformanceEntry) => void): void {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new (window as any).PerformanceObserver((list: PerformanceObserverEntryList) => {
          for (const entry of list.getEntries()) {
            callback(entry);
          }
        });

        observer.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(observer);
      } catch (error) {
        console.warn('PerformanceObserver not supported for CLS:', error);
      }
    }
  }

  /**
   * 记录自定义性能指标
   */
  recordCustomMetric(name: string, value: number): void {
    this.customMetrics.set(name, value);
    this.metrics.customMetrics[name] = value;
  }

  /**
   * 测量函数执行时间
   */
  measureFunction<T>(name: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    
    this.recordCustomMetric(`${name}_duration`, end - start);
    return result;
  }

  /**
   * 异步测量函数执行时间
   */
  async measureAsyncFunction<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    
    this.recordCustomMetric(`${name}_duration`, end - start);
    return result;
  }

  /**
   * 获取当前性能指标
   */
  getMetrics(): PerformanceMetrics {
    // 更新内存使用情况
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      };
    }

    return { ...this.metrics };
  }

  /**
   * 获取性能报告
   */
  getPerformanceReport(): string {
    const metrics = this.getMetrics();
    const report = {
      '页面加载时间': `${metrics.pageLoadTime}ms`,
      'DOM内容加载': `${metrics.domContentLoaded}ms`,
      '首次内容绘制': `${metrics.firstContentfulPaint}ms`,
      '最大内容绘制': `${metrics.largestContentfulPaint}ms`,
      '首次输入延迟': `${metrics.firstInputDelay}ms`,
      '累积布局偏移': metrics.cumulativeLayoutShift.toFixed(3),
      '内存使用': metrics.memoryUsage ? {
        '已使用': `${Math.round(metrics.memoryUsage.usedJSHeapSize / 1024 / 1024)}MB`,
        '总内存': `${Math.round(metrics.memoryUsage.totalJSHeapSize / 1024 / 1024)}MB`,
        '限制': `${Math.round(metrics.memoryUsage.jsHeapSizeLimit / 1024 / 1024)}MB`,
      } : '不可用',
      '自定义指标': metrics.customMetrics,
    };

    return JSON.stringify(report, null, 2);
  }

  /**
   * 清理观察器
   */
  destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// =================================================================================================
// Global Instance
// =================================================================================================

export const performanceMonitor = new PerformanceMonitor();

// =================================================================================================
// Utility Functions
// =================================================================================================

/**
 * 性能装饰器 - 用于测量函数执行时间
 */
export function measurePerformance(name?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const metricName = name || `${target.constructor.name}_${propertyName}`;

    descriptor.value = function (...args: any[]) {
      const start = performance.now();
      const result = method.apply(this, args);
      const end = performance.now();
      
      performanceMonitor.recordCustomMetric(metricName, end - start);
      return result;
    };
  };
}

/**
 * React 组件性能监控 HOC
 */
export function withPerformanceMonitoring<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  return React.forwardRef<any, P>((props, ref) => {
    const name = componentName || WrappedComponent.displayName || WrappedComponent.name;
    
    React.useEffect(() => {
      const start = performance.now();
      
      return () => {
        const end = performance.now();
        performanceMonitor.recordCustomMetric(`${name}_render_time`, end - start);
      };
    });

    return React.createElement(WrappedComponent, { ...props, ref } as any);
  });
}

// =================================================================================================
// Exports
// =================================================================================================

export { PerformanceMonitor };
export type { PerformanceMetrics };
