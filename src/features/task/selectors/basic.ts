/**
 * @file basic.ts
 * @description Basic task selectors
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Third-party Libraries ---
import { useStore } from 'zustand';

// --- Relative Imports ---
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
