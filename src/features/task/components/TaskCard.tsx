import React from 'react';

import { Task } from '../types/taskTypes';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onClick }) => {
  return (
    <div
      className="p-4 border border-border rounded shadow-sm bg-card text-card-foreground break-words cursor-pointer hover:bg-accent hover:text-accent-foreground transition-all duration-200 ease-out"
      onClick={onClick}
    >
      <div className="font-bold text-lg mb-1">{task.title}</div>
      <div className="text-muted-foreground text-sm">{task.description}</div>
    </div>
  );
};

export default TaskCard;
