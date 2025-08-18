/**
 * @file TaskIndexPage.tsx
 * @description Task index page component
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

import React, { useState } from 'react';

import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useOpenSignInModal } from '@/app/providers';
import { ROUTES } from '@/app/router/constants';
import { useUser, useAuthLoading, useAuthActions } from '@/features/auth';
import TaskLayout from '@/features/task/layout/TaskLayout';
import { Button } from '@/shared/components/Button';

import TaskCard from '../components/TaskCard';
import { useTasks, useTaskLoading } from '../selectors';

// =================================================================================================
// Component
// =================================================================================================

const TaskIndexPage: React.FC = () => {
  const tasks = useTasks();
  const isTaskLoading = useTaskLoading();
  const openSignInModal = useOpenSignInModal();
  const user = useUser();
  const isAuthLoading = useAuthLoading();
  const { logout } = useAuthActions();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    await logout();
    setIsLoading(false);
  };

  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <TaskLayout title={t('task.index.title')} buttonText={t('task.index.new')} buttonClick={() => navigate(ROUTES.TASK.NEW)}>
      {isAuthLoading || isTaskLoading ? (
        <div>{t('auth.loading')}</div>
      ) : user ? (
        <div className="flex flex-col gap-4">
          <div className="flex gap-4 items-center">
            <div>{t('auth.loggedIn')}: {user.email}</div>
            <Button variant="secondary" onClick={handleLogout} disabled={isLoading}>
              {isLoading ? t('auth.loggingOut') : t('auth.logout')}
            </Button>
          </div>

          {tasks.length === 0 ? (
            <div className="text-gray-500">{t('task.index.noTasks')}</div>
          ) : (
            <div className="flex flex-col gap-1 max-h-[500px] overflow-y-auto pr-2">
              {tasks.map(task => <TaskCard key={task.id} task={task} onClick={() => navigate(ROUTES.TASK.BY_ID.replace(':id', task.id))} />)}
            </div>
          )}
        </div>
      ) : (
        <div className="text-gray-500 flex gap-4 items-center">
          <div>{t('auth.notLoggedIn')}</div>
          <Button onClick={() => openSignInModal()}>{t('auth.login')}</Button>
        </div>
      )}
    </TaskLayout>
  );
};

// =================================================================================================
// Exports
// =================================================================================================

export default TaskIndexPage;
