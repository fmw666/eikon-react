/**
 * @file memoized.ts
 * @description Memoized task selectors
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Third-party Libraries ---
import { useStore } from 'zustand';
import { useStoreWithEqualityFn } from 'zustand/traditional';

// --- Relative Imports ---
import { taskStore } from '../store/taskStore';

import type { Task } from '../types/taskTypes';

// =================================================================================================
// Selectors
// =================================================================================================

/**
 * 记忆化的任务搜索
 */
function useTaskSearch(query: string) {
  return useStoreWithEqualityFn(
    taskStore,
    state => {
      if (!query.trim()) return state.tasks;

      const searchTerm = query.toLowerCase();
      return state.tasks.filter(task =>
        task.title.toLowerCase().includes(searchTerm) ||
        task.description?.toLowerCase().includes(searchTerm)
      );
    },
    (prev, next) => {
      // 简单相等性检查：长度相等且 id 顺序一致则认为未变化
      if (prev === next) return true;
      if (!Array.isArray(prev) || !Array.isArray(next)) return false;
      if (prev.length !== next.length) return false;
      for (let i = 0; i < prev.length; i++) {
        const a = prev[i] as Task | undefined;
        const b = next[i] as Task | undefined;
        if (a?.id !== b?.id) return false;
      }
      return true;
    }
  );
}

/**
 * 记忆化的任务分组
 */
function useTaskGrouping(groupBy: 'status' | 'user') {
  return useStore(
    taskStore,
    state => {
      const groups: Record<string, Task[]> = {};

      state.tasks.forEach(task => {
        let key: string;
        switch (groupBy) {
          case 'status':
            key = task.status;
            break;
          case 'user':
            key = task.userId;
            break;
          default:
            key = 'unknown';
        }

        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(task);
      });

      return groups;
    }
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export { useTaskSearch, useTaskGrouping };
