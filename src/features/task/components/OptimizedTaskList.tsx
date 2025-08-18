/**
 * @file OptimizedTaskList.tsx
 * @description 优化的任务列表组件 - 使用虚拟滚动和性能优化技术
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

import { useState, useCallback, useMemo, startTransition } from 'react';

import { VirtualList } from '@/shared/components/VirtualList';

import { useTaskSearch, useTaskStats } from '../selectors';
import { Task } from '../types/taskTypes';
import TaskCard from './TaskCard';

// =================================================================================================
// Types
// =================================================================================================

interface OptimizedTaskListProps {
  className?: string;
  height?: number;
  itemHeight?: number;
  showStats?: boolean;
  enableSearch?: boolean;
  enableFiltering?: boolean;
}

// =================================================================================================
// Component
// =================================================================================================

export function OptimizedTaskList({
  className = '',
  height = 600,
  itemHeight = 120,
  showStats = true,
  enableSearch = true,
  enableFiltering = true,
}: OptimizedTaskListProps) {
  // 搜索状态 - 使用 startTransition 优化
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // 使用优化的搜索 hook
  const filteredTasks = useTaskSearch(searchQuery);
  
  // 获取任务统计信息
  const stats = useTaskStats();

  // 处理搜索输入 - 使用 startTransition 避免阻塞
  const handleSearchChange = useCallback((value: string) => {
    startTransition(() => {
      setSearchQuery(value);
    });
  }, []);

  // 处理状态过滤
  const handleStatusFilter = useCallback((status: string) => {
    startTransition(() => {
      setFilterStatus(status);
    });
  }, []);

  // 最终过滤的任务列表
  const finalTasks = useMemo(() => {
    if (filterStatus === 'all') return filteredTasks;
    return filteredTasks.filter(task => task.status === filterStatus);
  }, [filteredTasks, filterStatus]);

  // 渲染单个任务项
  const renderTaskItem = useCallback((task: Task) => {
    return (
      <div className="p-2">
        <TaskCard task={task} />
      </div>
    );
  }, []);

  // 状态过滤选项
  const statusOptions = useMemo(() => [
    { value: 'all', label: '全部' },
    { value: 'pending', label: '待处理' },
    { value: 'in-progress', label: '进行中' },
    { value: 'completed', label: '已完成' },
  ], []);

  return (
    <div className={`optimized-task-list ${className}`}>
      {/* 统计信息 */}
      {showStats && (
        <div className="mb-4 p-4 bg-white rounded-lg shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-600">总任务</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-sm text-gray-600">已完成</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
              <div className="text-sm text-gray-600">待处理</div>
            </div>
          </div>
          <div className="mt-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>完成率</span>
              <span>{stats.completionRate.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${stats.completionRate}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 搜索和过滤控件 */}
      <div className="mb-4 flex flex-col sm:flex-row gap-4">
        {enableSearch && (
          <div className="flex-1">
            <input
              type="text"
              placeholder="搜索任务..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}
        
        {enableFiltering && (
          <div className="flex gap-2">
            {statusOptions.map(option => (
              <button
                key={option.value}
                onClick={() => handleStatusFilter(option.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === option.value
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 虚拟滚动列表 */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <VirtualList
          items={finalTasks}
          height={height}
          itemHeight={itemHeight}
          renderItem={renderTaskItem}
          className="virtual-task-list"
          onItemsRendered={(startIndex, endIndex) => {
            // 可以在这里添加性能监控
            console.log(`Rendered items ${startIndex} to ${endIndex}`);
          }}
        />
      </div>

      {/* 空状态 */}
      {finalTasks.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📝</div>
          <div className="text-xl font-medium text-gray-600 mb-2">
            {searchQuery ? '没有找到匹配的任务' : '暂无任务'}
          </div>
          <div className="text-gray-500">
            {searchQuery ? '尝试调整搜索条件' : '创建你的第一个任务吧！'}
          </div>
        </div>
      )}
    </div>
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export default OptimizedTaskList;
