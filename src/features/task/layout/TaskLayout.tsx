/**
 * @file TaskLayout.tsx
 * @description Task layout component
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import React from 'react';

// --- Core-related Libraries ---
import { useTranslation } from 'react-i18next';

// --- Absolute Imports ---
import { TaskInitializer } from '@/app/providers/initializers';
import { Button } from '@/shared/components/Button';
import { serviceConfig } from '@/shared/services';

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
  const modeKey = serviceConfig.useMock ? 'task.layout.modes.mock' : 'task.layout.modes.supabase';
  const isOnline = !serviceConfig.useMock;
  const modeBadgeClass = isOnline
    ? 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset bg-green-100 text-green-700 ring-green-300'
    : 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset bg-slate-100 text-slate-700 ring-slate-300';
  
  return (
    <div className="p-6 sm:w-128 w-full h-[30vh] -translate-y-16">
      <TaskInitializer />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{title}</h1>
        <Button radius="pill" onClick={buttonClick}>{buttonText}</Button>
      </div>
      <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
        <p className="text-sm font-medium text-amber-900">{t('task.layout.simulatedDelayNotice')}</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-sm text-amber-900">{t('task.layout.serviceMode')}</span>
          <span className={modeBadgeClass}>{t(modeKey)}</span>
        </div>
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
