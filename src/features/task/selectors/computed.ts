/**
 * @file computed.ts
 * @description Computed task selectors
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

import { useStore } from 'zustand';

import { taskStore } from '../store/taskStore';

// =================================================================================================
// Selectors
// =================================================================================================

function useTaskStats() {
  return useStore(taskStore, state => {
    const tasks = state.tasks;
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const pending = total - completed;

    return {
      total,
      completed,
      pending,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
    };
  });
}

function useTaskCompletionRate() {
  return useStore(taskStore, state => {
    const tasks = state.tasks;
    if (tasks.length === 0) return 0;
    const completed = tasks.filter(t => t.status === 'completed').length;
    return (completed / tasks.length) * 100;
  });
}

function useRecentTasks(limit: number = 5) {
  return useStore(taskStore, state =>
    state.tasks
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit)
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export { useTaskStats, useTaskCompletionRate, useRecentTasks };
