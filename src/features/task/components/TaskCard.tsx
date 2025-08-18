import React from 'react';

import { Task } from '../types/taskTypes';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onClick }) => {
  return (
    <div
      className="p-4 border rounded shadow break-words cursor-pointer hover:bg-gray-50"
      onClick={onClick}
    >
      <div className="font-bold text-lg mb-1">{task.title}</div>
      <div className="text-gray-600 text-sm">{task.description}</div>
    </div>
  );
};

export default TaskCard;
