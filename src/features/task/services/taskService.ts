/**
 * @file taskService.ts
 * @description Task service
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Absolute Imports ---
import { mockTasks } from '@/mock/task';
import { supabase } from '@/shared/services/supabase';

// --- Relative Imports ---
import { Task } from '../types/taskTypes';

// =================================================================================================
// Services
// =================================================================================================

const taskService = {
  getTasks: async (): Promise<Task[]> => {
    if (!supabase) {
      console.warn('Supabase client is not initialized, returning mock data.');
      // wait 1~2 seconds to simulate network latency
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
      return mockTasks.map(task => ({ ...task }));
    }

    const { data, error } = await supabase.from('tasks').select('*');
    if (error) throw error;

    return data;
  },

  addTask: async (task: Task): Promise<Task> => {
    if (!supabase) {
      console.warn('Supabase client is not initialized, returning mock data.');
      // wait 1~2 seconds to simulate network latency
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
      mockTasks.push(task);
      return task;
    }

    const { data, error } = await supabase.from('tasks').insert(task).select().single();
    if (error) throw error;

    return data;
  },

  getTaskById: async (id: string): Promise<Task | null> => {
    if (!supabase) {
      console.warn('Supabase client is not initialized, returning mock data.');
      // wait 1~2 seconds to simulate network latency
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
      return mockTasks.find(task => task.id === id) || null;
    }

    const { data, error } = await supabase.from('tasks').select('*').eq('id', id).single();
    if (error) throw error;

    return data;
  },
};

// =================================================================================================
// Exports
// =================================================================================================

export { taskService };
