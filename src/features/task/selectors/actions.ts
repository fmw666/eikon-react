/**
 * @file actions.ts
 * @description Task action selectors
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

import { useStore } from 'zustand';
import { shallow } from 'zustand/shallow';
import { useStoreWithEqualityFn } from 'zustand/traditional';

import { taskStore } from '../store/taskStore';

// =================================================================================================
// Selectors
// =================================================================================================

function useTaskActions() {
  return useStoreWithEqualityFn(taskStore, state => ({
    initialize: state.initialize,
    addTask: state.addTask,
    getTaskById: state.getTaskById,
    reset: state.reset,
  }), shallow);
}

function useInitializeTasks() {
  return useStore(taskStore, state => state.initialize);
}

function useAddTask() {
  return useStore(taskStore, state => state.addTask);
}

function useGetTaskById() {
  return useStore(taskStore, state => state.getTaskById);
}

function useResetTasks() {
  return useStore(taskStore, state => state.reset);
}

// =================================================================================================
// Exports
// =================================================================================================

export { useTaskActions, useInitializeTasks, useAddTask, useGetTaskById, useResetTasks };
