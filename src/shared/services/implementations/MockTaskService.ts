/**
 * @file MockTaskService.ts
 * @description Mock task service implementation
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Absolute Imports ---
import type { Task } from '@/features/task';
import { mockTasks } from '@/mock/task';

// --- Relative Imports ---
import type { ITaskService } from '../interfaces/ITaskService';

// =================================================================================================
// Implementation
// =================================================================================================

class MockTaskService implements ITaskService {
  private tasks: Task[] = [...mockTasks];

  async getTasks(): Promise<Task[]> {
    await this.simulateLatency();
    return this.tasks.map(task => ({ ...task }));
  }

  async addTask(task: Task): Promise<Task> {
    await this.simulateLatency();
    const newTask = { ...task, id: this.generateId() };
    this.tasks.push(newTask);
    return newTask;
  }

  async getTaskById(id: string): Promise<Task | null> {
    await this.simulateLatency();
    const task = this.tasks.find(task => task.id === id);
    return task ? { ...task } : null;
  }

  async updateTask(id: string, taskUpdate: Partial<Task>): Promise<Task> {
    await this.simulateLatency();
    const index = this.tasks.findIndex(task => task.id === id);
    if (index === -1) {
      throw new Error('Task not found');
    }
    
    this.tasks[index] = { ...this.tasks[index], ...taskUpdate };
    return { ...this.tasks[index] };
  }

  async deleteTask(id: string): Promise<void> {
    await this.simulateLatency();
    const index = this.tasks.findIndex(task => task.id === id);
    if (index === -1) {
      throw new Error('Task not found');
    }
    
    this.tasks.splice(index, 1);
  }

  private async simulateLatency(): Promise<void> {
    // Simulate 1-2 seconds network latency
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
  }

  private generateId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// =================================================================================================
// Exports
// =================================================================================================

export { MockTaskService };
