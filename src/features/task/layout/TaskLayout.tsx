/**
 * @file TaskLayout.tsx
 * @description Task layout component
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

import React from 'react';

import { useTranslation } from 'react-i18next';

import { TaskInitializer } from '@/app/providers/initializers';

import { Button } from '@/shared/components/Button';

// =================================================================================================
// Types
// =================================================================================================

interface TaskLayoutProps {
  title: string;
  buttonText: string;
  children: React.ReactNode;
  buttonClick: () => void;
}

// =================================================================================================
// Component
// =================================================================================================

const TaskLayout: React.FC<TaskLayoutProps> = ({ title, buttonText, buttonClick, children }) => {
  const { t } = useTranslation();
  
  return (
    <div className="p-6 sm:w-128 w-full h-[30vh] -translate-y-16">
      <TaskInitializer />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{title}</h1>
        <Button radius="pill" onClick={buttonClick}>{buttonText}</Button>
      </div>
      <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        <p>{t('task.layout.simulatedDelayNotice')}</p>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
};

// =================================================================================================
// Exports
// =================================================================================================

export default TaskLayout;
