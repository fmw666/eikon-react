/**
 * @file SupabaseTaskService.ts
 * @description Supabase task service implementation
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Absolute Imports ---
import type { Task } from '@/features/task';
import { supabase } from '@/shared/infrastructure';

// --- Relative Imports ---
import type { ITaskService } from '../interfaces/ITaskService';

// =================================================================================================
// Implementation
// =================================================================================================

class SupabaseTaskService implements ITaskService {
  async getTasks(): Promise<Task[]> {
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }

    const { data, error } = await supabase.from('tasks').select('*');
    if (error) throw error;

    return data || [];
  }

  async addTask(task: Task): Promise<Task> {
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }

    const { data, error } = await supabase.from('tasks').insert(task).select().single();
    if (error) throw error;

    return data;
  }

  async getTaskById(id: string): Promise<Task | null> {
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }

    const { data, error } = await supabase.from('tasks').select('*').eq('id', id).single();
    if (error) throw error;

    return data;
  }

  async updateTask(id: string, task: Partial<Task>): Promise<Task> {
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }

    const { data, error } = await supabase.from('tasks').update(task).eq('id', id).select().single();
    if (error) throw error;

    return data;
  }

  async deleteTask(id: string): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }

    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw error;
  }
}

// =================================================================================================
// Exports
// =================================================================================================

export { SupabaseTaskService };
