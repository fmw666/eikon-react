/**
 * @file tasksServiceFactory.ts
 * @description Picks the concrete Tasks service implementation.
 *
 * Strategy:
 *   - Always have the Mock impl available (it's the demo / test default).
 *   - When the Supabase feature is present AND `serviceConfig.useMock`
 *     is false, return the Supabase impl instead.
 *
 * The supabase import + branch are bracketed by `@eikon:feature(supabase)`
 * markers so the CLI's `--no-supabase` strip collapses both the import
 * and the conditional. After stripping, the factory unconditionally
 * returns the Mock impl with no dangling references.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Absolute Imports ---
import { serviceConfig } from '@/shared/services';

// --- Relative Imports ---

import { MockTasksService } from '../implementations/MockTasksService';
// @eikon:feature(supabase) begin
import { SupabaseTasksService } from '../implementations/SupabaseTasksService';

import type { ITasksService } from '../interfaces/ITasksService';
// @eikon:feature(supabase) end

// =================================================================================================
// Factory
// =================================================================================================

class TasksServiceFactory {
  /**
   * Cached instance — services are stateful (the Mock impl holds the
   * in-memory list) so we want every caller to observe the same writes.
   */
  private instance: ITasksService | null = null;

  getTasksService(): ITasksService {
    if (this.instance) return this.instance;

    // @eikon:feature(supabase) begin
    if (!serviceConfig.useMock) {
      this.instance = new SupabaseTasksService();
      return this.instance;
    }
    // @eikon:feature(supabase) end

    this.instance = new MockTasksService();
    return this.instance;
  }

  /**
   * Test-only: drop the cached instance so the next `getTasksService()`
   * call returns a fresh impl with seed data.
   */
  __resetForTests(): void {
    this.instance = null;
  }
}

// =================================================================================================
// Exports
// =================================================================================================

export const tasksServiceFactory = new TasksServiceFactory();
export { TasksServiceFactory };
