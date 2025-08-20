/**
 * @file PerformancePanel.tsx
 * @description Performance metrics panel example
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import React, { useState, useCallback, useEffect } from 'react';

// --- Absolute Imports ---
import { performanceMonitor } from '@/shared/utils/performanceMonitor';

// =================================================================================================
// Component
// =================================================================================================

const PerformancePanel: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);

  const updateMetrics = useCallback(() => {
    const currentMetrics = performanceMonitor.getMetrics();
    setMetrics(currentMetrics);
  }, []);

  useEffect(() => {
    updateMetrics();
    const interval = setInterval(updateMetrics, 2000);
    return () => clearInterval(interval);
  }, [updateMetrics]);

  if (!metrics) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
      <h3 className="text-lg font-semibold mb-4">性能监控面板</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-gray-600">页面加载</div>
          <div className="font-mono">{metrics.pageLoadTime}ms</div>
        </div>
        <div>
          <div className="text-gray-600">DOM加载</div>
          <div className="font-mono">{metrics.domContentLoaded}ms</div>
        </div>
        <div>
          <div className="text-gray-600">首次绘制</div>
          <div className="font-mono">{metrics.firstContentfulPaint}ms</div>
        </div>
        <div>
          <div className="text-gray-600">内存使用</div>
          <div className="font-mono">
            {metrics.memoryUsage ? 
              `${Math.round(metrics.memoryUsage.usedJSHeapSize / 1024 / 1024)}MB` : 
              'N/A'
            }
          </div>
        </div>
      </div>
    </div>
  );
};

// =================================================================================================
// Exports
// =================================================================================================

export default PerformancePanel;
