/**
 * @file TaskDetailsPage.tsx
 * @description Task details page component
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

import React, { useEffect, useState } from 'react';

import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';

import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

import { ROUTES } from '@/app/router/constants';

import { useTaskActions, useTaskLoading } from '../selectors';
import TaskLayout from '../layout/TaskLayout';
import { type Task } from '../types/taskTypes';

// =================================================================================================
// Component
// =================================================================================================


const TaskDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isTaskLoading = useTaskLoading();
  const { getTaskById } = useTaskActions();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const { t } = useTranslation();
  const [isFetchingTask, setIsFetchingTask] = useState<boolean>(true);

  useEffect(() => {
    const fetchTask = async () => {
      setIsFetchingTask(true);
      try {
        const task = await getTaskById(id ?? '');
        setTask(task);
      } finally {
        setIsFetchingTask(false);
      }
    };
    fetchTask();
  }, [id, getTaskById]);

  if (isTaskLoading || isFetchingTask) {
    return (
      <TaskLayout 
        title={t('task.details.title')} 
        buttonText={t('task.details.back')} 
        buttonClick={() => navigate(ROUTES.TASK.ROOT)}
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">{t('task.details.loading')}</span>
        </div>
      </TaskLayout>
    );
  }

  if (!task) {
    return (
      <TaskLayout 
        title={t('task.details.title')} 
        buttonText={t('task.details.back')} 
        buttonClick={() => navigate(ROUTES.TASK.ROOT)}
      >
        <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500">
          <ExclamationTriangleIcon className="h-16 w-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium mb-2">{t('task.details.notFound')}</h3>
          <p className="text-sm text-gray-400">任务不存在或已被删除</p>
        </div>
      </TaskLayout>
    );
  }

  return (
    <TaskLayout 
      title={t('task.details.title')} 
      buttonText={t('task.details.back')} 
      buttonClick={() => navigate(ROUTES.TASK.ROOT)}
    >
      <div className="max-w-2xl mx-auto max-h-[600px] overflow-y-auto pr-2">
        <div className="bg-white break-words rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{task.title}</h1>
          <p className="text-sm text-gray-500">#{task.id}</p>
          <p className="text-gray-700 mt-4 leading-relaxed whitespace-pre-wrap">
            {task.description || '暂无描述'}
          </p>
        </div>
      </div>
    </TaskLayout>
  );
};

// =================================================================================================
// Exports
// =================================================================================================

export default TaskDetailsPage;
