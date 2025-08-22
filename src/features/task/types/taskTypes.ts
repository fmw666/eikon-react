/**
 * @file taskTypes.ts
 * @description Task types
 * @author fmw666@github
 */

// =================================================================================================
// Types
// =================================================================================================

// 任务状态枚举
const TaskStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed'
} as const;

type TaskStatusType = typeof TaskStatus[keyof typeof TaskStatus];

interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatusType;
  userId: string;
  createdAt: string;
}

// 创建任务的输入类型
interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatusType;
}

// 更新任务的输入类型
interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatusType;
}

// =================================================================================================
// Exports
// =================================================================================================

export type { TaskStatus, TaskStatusType, Task, CreateTaskInput, UpdateTaskInput };
