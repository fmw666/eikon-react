/**
 * @file ITaskService.ts
 * @description Task service interface
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Absolute Imports ---
import type { Task } from '@/features/task';

// =================================================================================================
// Interface
// =================================================================================================

interface ITaskService {
  getTasks(): Promise<Task[]>;
  addTask(task: Task): Promise<Task>;
  getTaskById(id: string): Promise<Task | null>;
  updateTask(id: string, task: Partial<Task>): Promise<Task>;
  deleteTask(id: string): Promise<void>;
}

// =================================================================================================
// Exports
// =================================================================================================

export type { ITaskService };
