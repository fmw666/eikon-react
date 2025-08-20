/**
 * @file VirtualScrollDemo.tsx
 * @description Virtual list scrolling demo example
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import React, { useState, useCallback } from 'react';

// --- Absolute Imports ---
import { VirtualList } from '@/shared/components/VirtualList';

// =================================================================================================
// Component
// =================================================================================================

const VirtualScrollDemo: React.FC = () => {
  const [items] = useState(() => 
    Array.from({ length: 10000 }, (_, i) => ({
      id: i,
      title: `项目 ${i}`,
      description: `这是第 ${i} 个项目的描述，用于演示虚拟滚动性能。`,
    }))
  );

  const renderItem = useCallback((item: any) => (
    <div className="p-4 border-b border-gray-200 hover:bg-gray-50">
      <h4 className="font-medium">{item.title}</h4>
      <p className="text-sm text-gray-600">{item.description}</p>
    </div>
  ), []);

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
      <h3 className="text-lg font-semibold mb-4">虚拟滚动演示 (10,000 项)</h3>
      <div className="h-64 border rounded">
        <VirtualList
          items={items}
          height={256}
          itemHeight={80}
          renderItem={renderItem}
        />
      </div>
    </div>
  );
};

// =================================================================================================
// Exports
// =================================================================================================

export default VirtualScrollDemo;
