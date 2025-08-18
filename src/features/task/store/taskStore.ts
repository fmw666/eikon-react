/**
 * @file taskStore.ts
 * @description Zustand store for task state management
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

import { subscribeWithSelector } from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';

import { taskService } from '../services/taskService';
import { Task } from '../types/taskTypes';

// =================================================================================================
// Types
// =================================================================================================

interface TaskStoreState {
  // -- State --
  isInitialized: boolean;
  isLoading: boolean;
  tasks: Task[];

  // -- State Setters --
  setIsInitialized: (isInitialized: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  setTasks: (tasks: Task[]) => void;

  // -- Operations --
  initialize: () => Promise<void>;
  addTask: (task: Task) => Promise<void>;
  getTaskById: (id: string) => Promise<Task | null>;
  reset: () => void;
}

// =================================================================================================
// Store
// =================================================================================================

const taskStore = createStore<TaskStoreState>()(
  subscribeWithSelector((set, get) => ({
    // -- State --
    isInitialized: false,
    isLoading: false,
    tasks: [],

    // -- State Setters --
    setIsInitialized: (isInitialized) => set({ isInitialized }),
    setIsLoading: (isLoading) => set({ isLoading }),
    setTasks: (tasks) => set({ tasks }),

    // -- Operations --
    initialize: async () => {
      if (get().isInitialized || get().isLoading) return;

      try {
        set(state => ({
          ...state,
          isLoading: true,
        }));

        const tasks = await taskService.getTasks();

        set(state => ({
          ...state,
          tasks,
          isLoading: false,
          isInitialized: true,
        }));
      } catch (error) {
        console.error('[TaskStore] Error initializing tasks:', error);
        set(state => ({
          ...state,
          tasks: [],
          isLoading: false,
          isInitialized: true,
        }));
      }
    },

    addTask: async (task) => {
      try {
        const newTask = await taskService.addTask(task);
        set((state) => ({
          ...state,
          tasks: [...state.tasks, newTask],
        }));
      } catch (error) {
        console.error('[TaskStore] Error adding task:', error);
        throw error;
      }
    },

    getTaskById: async (id: string): Promise<Task | null> => {
      try {
        const task = await taskService.getTaskById(id);
        return task;
      } catch (error) {
        console.error('[TaskStore] Error getting task by id:', error);
        throw error;
      }
    },

    reset: () => {
      set(() => ({
        isInitialized: false,
        isLoading: false,
        tasks: [],
      }));
    },
  }))
);

// =================================================================================================
// Exports
// =================================================================================================

export { taskStore };
