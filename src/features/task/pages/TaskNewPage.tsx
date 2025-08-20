/**
 * @file TaskNewPage.tsx
 * @description Task new page component
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

// --- Absolute Imports ---
import { ROUTES } from '@/app/router/constants';
import TaskLayout from '@/features/task/layout/TaskLayout';

// --- Relative Imports ---
import TaskForm from '../components/TaskForm';
import { useTaskActions } from '../selectors';
import { Task } from '../types/taskTypes';

// =================================================================================================
// Component
// =================================================================================================

const TaskNewPage: React.FC = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const { addTask } = useTaskActions();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await addTask({
        id: Date.now().toString(),
        title,
        description,
        status: 'pending',
        userId: '1',
        createdAt: new Date().toISOString(),
      } as Task);
      navigate(ROUTES.TASK.ROOT);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TaskLayout title={t('task.new.title')} buttonText={t('task.new.back')} buttonClick={() => navigate(ROUTES.TASK.ROOT)}>
      <TaskForm
        title={title}
        description={description}
        onTitleChange={setTitle}
        onDescriptionChange={setDescription}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </TaskLayout>
  );
};

// =================================================================================================
// Exports
// =================================================================================================

export default TaskNewPage;
