/**
 * @file VirtualList.tsx
 * @description 虚拟滚动列表组件 - 优化大列表渲染性能
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

import React, { useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';

// =================================================================================================
// Types
// =================================================================================================

interface VirtualListProps<T> {
  items: T[];
  height: number;
  itemHeight: number;
  width?: number | string;
  overscanCount?: number;
  className?: string;
  renderItem: (item: T, index: number) => React.ReactNode;
  onScroll?: (scrollOffset: number) => void;
  onItemsRendered?: (startIndex: number, endIndex: number) => void;
}

// =================================================================================================
// Component
// =================================================================================================

export function VirtualList<T>({
  items,
  height,
  itemHeight,
  width = '100%',
  overscanCount = 5,
  className = '',
  renderItem,
  onScroll,
  onItemsRendered,
}: VirtualListProps<T>) {
  // 记忆化渲染函数
  const itemRenderer = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const item = items[index];
      if (!item) return null;

      return (
        <div style={style} className="virtual-list-item">
          {renderItem(item, index)}
        </div>
      );
    },
    [items, renderItem]
  );

  // 处理滚动事件
  const handleScroll = useCallback(
    ({ scrollOffset }: { scrollOffset: number }) => {
      onScroll?.(scrollOffset);
    },
    [onScroll]
  );

  // 处理渲染事件
  const handleItemsRendered = useCallback(
    ({ visibleStartIndex, visibleStopIndex }: { visibleStartIndex: number; visibleStopIndex: number }) => {
      onItemsRendered?.(visibleStartIndex, visibleStopIndex);
    },
    [onItemsRendered]
  );

  // 如果没有数据，显示空状态
  if (items.length === 0) {
    return (
      <div 
        className={`virtual-list-empty ${className}`}
        style={{ height, width, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <div className="text-gray-500 text-center">
          <div className="text-4xl mb-2">📭</div>
          <div>暂无数据</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`virtual-list-container ${className}`}>
      <List
        height={height}
        itemCount={items.length}
        itemSize={itemHeight}
        width={width}
        overscanCount={overscanCount}
        onScroll={handleScroll}
        onItemsRendered={handleItemsRendered}
      >
        {itemRenderer}
      </List>
    </div>
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export default VirtualList;
