/**
 * @file TaskInitializer.tsx
 * @description Initializes task state after auth is ready
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import React, { useEffect } from 'react';

// --- Absolute Imports ---
import { useAuthInitialized, useAuthLoading, useUser } from '@/features/auth';
import { useTaskActions, useTaskInitialized, useTaskLoading } from '@/features/task/selectors';

// =================================================================================================
// Component
// =================================================================================================

const TaskInitializer: React.FC = () => {
  const isAuthInitialized = useAuthInitialized();
  const isAuthLoading = useAuthLoading();
  const user = useUser();

  const isTaskInitialized = useTaskInitialized();
  const isTaskLoading = useTaskLoading();
  const { initialize, reset } = useTaskActions();

  useEffect(() => {
    if (!isAuthInitialized || isAuthLoading) return;

    if (!user) {
      reset();
      return;
    }

    if (!isTaskInitialized && !isTaskLoading) {
      void initialize();
    }
  }, [isAuthInitialized, isAuthLoading, user, isTaskInitialized, isTaskLoading, initialize, reset]);

  return null;
};

// =================================================================================================
// Exports
// =================================================================================================

export { TaskInitializer };


