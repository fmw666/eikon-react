/**
 * @file basic.ts
 * @description Basic task selectors
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

function useTasks() {
  return useStore(taskStore, state => state.tasks);
}

function useTaskLoading() {
  return useStore(taskStore, state => state.isLoading);
}

function useTaskInitialized() {
  return useStore(taskStore, state => state.isInitialized);
}

// =================================================================================================
// Exports
// =================================================================================================

export { useTasks, useTaskLoading, useTaskInitialized };
