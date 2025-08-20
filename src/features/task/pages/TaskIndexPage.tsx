/**
 * @file TaskIndexPage.tsx
 * @description Task index page component
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import React, { useState } from 'react';

// --- Core-related Libraries ---
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

// --- Third-party Libraries ---
import { ArrowRightStartOnRectangleIcon, UserIcon } from '@heroicons/react/24/solid';

// --- Absolute Imports ---
import { useOpenSignInModal } from '@/app/providers';
import { ROUTES } from '@/app/router/constants';
import { useUser, useAuthLoading, useAuthActions } from '@/features/auth';
import TaskCard from '@/features/task/components/TaskCard';
import TaskLayout from '@/features/task/layout/TaskLayout';
import { useTasks, useTaskLoading } from '@/features/task/selectors';
import { Button } from '@/shared/components/Button';

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
            <Button
              variant="danger"
              radius="pill"
              size="sm"
              onClick={handleLogout}
              disabled={isLoading}
              isIcon
              icon={
                isLoading ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                  </svg>
                ) : (
                  <ArrowRightStartOnRectangleIcon className="h-5 w-5" />
                )
              }
              title={isLoading ? t('auth.loggingOut') : t('auth.logout')}
            />
          </div>

          {tasks.length === 0 ? (
            <div className="text-muted-foreground">{t('task.index.noTasks')}</div>
          ) : (
            <div className="flex flex-col gap-1 max-h-[30vh] overflow-y-auto pr-2">
              {tasks.map(task => <TaskCard key={task.id} task={task} onClick={() => navigate(ROUTES.TASK.BY_ID.replace(':id', task.id))} />)}
            </div>
          )}
        </div>
      ) : (
        <div className="text-muted-foreground flex gap-4 items-center">
          <div>{t('auth.notLoggedIn')}</div>
          <Button
            variant="primary"
            radius="pill"
            size="sm"
            onClick={() => openSignInModal()}
            leftIcon={<UserIcon className="h-4 w-4" />}
            title={t('auth.login')}
          >
            {t('auth.login')}
          </Button>
        </div>
      )}
    </TaskLayout>
  );
};

// =================================================================================================
// Exports
// =================================================================================================

export default TaskIndexPage;
