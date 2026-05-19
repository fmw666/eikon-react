/**
 * @file TaskNewPage.tsx
 * @description Route-level component for `/tasks/new`.
 *
 * Owns transient form state locally (useState — per the i18n /
 * state-management rules, transient form state stays out of the
 * store). Persistence flows through the `addTask` action; success
 * toasts via the shared `toast` helper.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import { useState } from 'react';

// --- Core-related Libraries ---
// @eikon:feature(i18n) begin
import { useTranslation } from 'react-i18next';
// @eikon:feature(i18n) end
import { useNavigate } from 'react-router-dom';

// --- Absolute Imports ---
import { toast } from '@/shared/ui/toaster';

// --- Relative Imports ---
import { TaskForm } from '../components/TaskForm';
import { TasksScreen } from '../components/TasksScreen';
import { useTaskActions } from '../selectors';

// =================================================================================================
// Component
// =================================================================================================

function TaskNewPage() {
  // @eikon:feature(i18n) begin
  const { t } = useTranslation();
  // @eikon:feature(i18n) end

  // @eikon:feature(i18n:fallback) begin
  // const t = (k: string) =>
  //   ({
  //     'tasks.new.title': 'New task',
  //     'tasks.new.back': 'Back to list',
  //     'tasks.new.created': 'Task created',
  //     'tasks.new.error': 'Failed to create task',
  //   })[k] ?? k;
  // @eikon:feature(i18n:fallback) end

  const navigate = useNavigate();
  const { addTask } = useTaskActions();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(): Promise<void> {
    setIsSubmitting(true);
    try {
      await addTask({ title, description });
      toast.success(t('tasks.new.created'));
      navigate('/tasks');
    } catch (e) {
      toast.error(t('tasks.new.error'), {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <TasksScreen
      title={t('tasks.new.title')}
      actionLabel={t('tasks.new.back')}
      onAction={() => navigate('/tasks')}
    >
      <TaskForm
        title={title}
        description={description}
        onTitleChange={setTitle}
        onDescriptionChange={setDescription}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </TasksScreen>
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export { TaskNewPage };
