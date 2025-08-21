/**
 * @file CacheTestPanel.tsx
 * @description Cache service demo example
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import React, { useState, useCallback } from 'react';

// --- Absolute Imports ---
import { cacheService } from '@/shared/infrastructure/cache';

// =================================================================================================
// Component
// =================================================================================================

const CacheTestPanel: React.FC = () => {
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [testResult, setTestResult] = useState<string>('');

  const testCache = useCallback(async () => {
    const start = performance.now();
    await cacheService.get('test-data', async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { message: '这是缓存的数据', timestamp: Date.now() };
    });
    const end = performance.now();
    setTestResult(`缓存测试完成，耗时: ${(end - start).toFixed(2)}ms`);
    setCacheStats(cacheService.getStats());
  }, []);

  const clearCache = useCallback(() => {
    cacheService.clear();
    setCacheStats(cacheService.getStats());
    setTestResult('缓存已清除');
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
      <h3 className="text-lg font-semibold mb-4">缓存测试</h3>
      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            onClick={testCache}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            测试缓存
          </button>
          <button
            onClick={clearCache}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            清除缓存
          </button>
        </div>
        {testResult && (
          <div className="text-sm text-gray-600">{testResult}</div>
        )}
        {cacheStats && (
          <div className="text-sm">
            <div>缓存条目: {cacheStats.size}/{cacheStats.maxSize}</div>
            <div>过期时间: {cacheStats.maxAge}ms</div>
          </div>
        )}
      </div>
    </div>
  );
};

// =================================================================================================
// Exports
// =================================================================================================

export default CacheTestPanel;
