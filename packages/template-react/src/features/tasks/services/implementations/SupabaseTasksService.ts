// @eikon:feature(supabase) file
/**
 * @file SupabaseTasksService.ts
 * @description Supabase-backed implementation of ITasksService.
 *
 * Whole file is gated by `@eikon:feature(supabase) file`: when the
 * CLI runs with `--no-supabase` it gets deleted, and the factory's
 * supabase branch (also marker-gated) collapses to nothing.
 *
 * Expects a `tasks` table with columns matching the Task type. The
 * Supabase project must also expose RLS that allows the anon role to
 * read/write — adjust to your auth model in real apps.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Absolute Imports ---
import { supabase } from '@/shared/supabase';

// --- Relative Imports ---
import type { CreateTaskInput, Task, UpdateTaskInput } from '../../types';
import type { ITasksService } from '../interfaces/ITasksService';

// =================================================================================================
// Constants
// =================================================================================================

const TABLE = 'tasks';

// =================================================================================================
// Implementation
// =================================================================================================

class SupabaseTasksService implements ITasksService {
  async getTasks(): Promise<Task[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('createdAt', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Task[];
  }

  async getTaskById(id: string): Promise<Task | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data as Task | null) ?? null;
  }

  async addTask(input: CreateTaskInput): Promise<Task> {
    const payload = {
      title: input.title,
      description: input.description ?? '',
      status: input.status ?? 'pending',
      createdAt: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from(TABLE)
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as Task;
  }

  async updateTask(id: string, patch: UpdateTaskInput): Promise<Task> {
    const { data, error } = await supabase
      .from(TABLE)
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Task;
  }

  async deleteTask(id: string): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
  }
}

// =================================================================================================
// Exports
// =================================================================================================

export { SupabaseTasksService };
