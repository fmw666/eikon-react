/**
 * @file TasksIndexPage.tsx
 * @description Route-level component for `/tasks`.
 *
 * Reads tasks list state via selectors, fires `initialize` once on
 * mount, and renders TaskCards inside TasksScreen. All write ops go
 * through the `useTaskActions` bundle.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import { useEffect } from 'react';

// --- Core-related Libraries ---
// @eikon:feature(i18n) begin
import { useTranslation } from 'react-i18next';
// @eikon:feature(i18n) end
import { useNavigate } from 'react-router-dom';

// --- Third-party Libraries ---
import { Loader2 } from 'lucide-react';

// --- Relative Imports ---
import { TaskCard } from '../components/TaskCard';
import { TasksScreen } from '../components/TasksScreen';
import {
  useTaskActions,
  useTaskError,
  useTaskInitialized,
  useTaskLoading,
  useTasks,
} from '../selectors';

// =================================================================================================
// Component
// =================================================================================================

function TasksIndexPage() {
  // @eikon:feature(i18n) begin
  const { t } = useTranslation();
  // @eikon:feature(i18n) end

  // @eikon:feature(i18n:fallback) begin
  // const t = (k: string) =>
  //   ({
  //     'tasks.index.title': 'Tasks',
  //     'tasks.index.new': 'New task',
  //     'tasks.index.loading': 'Loading tasks…',
  //     'tasks.index.empty': 'No tasks yet — create the first one.',
  //   })[k] ?? k;
  // @eikon:feature(i18n:fallback) end

  const navigate = useNavigate();
  const tasks = useTasks();
  const isLoading = useTaskLoading();
  const isInitialized = useTaskInitialized();
  const error = useTaskError();
  const { initialize } = useTaskActions();

  useEffect(() => {
    void initialize();
  }, [initialize]);

  return (
    <TasksScreen
      title={t('tasks.index.title')}
      actionLabel={t('tasks.index.new')}
      onAction={() => navigate('/tasks/new')}
    >
      {!isInitialized || isLoading ? (
        <div className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('tasks.index.loading')}
        </div>
      ) : error ? (
        <p className="text-sm text-[var(--color-destructive)]">{error}</p>
      ) : tasks.length === 0 ? (
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {t('tasks.index.empty')}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tasks.map((task) => (
            <li key={task.id}>
              <TaskCard
                task={task}
                onClick={() => navigate(`/tasks/${task.id}`)}
              />
            </li>
          ))}
        </ul>
      )}
    </TasksScreen>
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export { TasksIndexPage };
