/**
 * @file TaskDetailsPage.tsx
 * @description Route-level component for `/tasks/:id`.
 *
 * Prefers the memoized in-store lookup (`useTaskById`) for instant
 * paint; falls back to the action `getTaskById` when the user lands
 * here via a deep link and the store hasn't been hydrated yet.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import { useEffect, useState } from 'react';

// --- Core-related Libraries ---
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

// --- Third-party Libraries ---
import { AlertTriangle, Loader2 } from 'lucide-react';

// --- Absolute Imports ---
import { cn } from '@/shared/lib/cn';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';

// --- Relative Imports ---
import { TasksScreen } from '../components/TasksScreen';
import {
  useTaskActions,
  useTaskById,
  useTaskInitialized,
} from '../selectors';

import type { Task, TaskStatus } from '../types';

// =================================================================================================
// Constants
// =================================================================================================

const STATUS_CLASS: Record<TaskStatus, string> = {
  pending:
    'bg-slate-100 text-slate-700 ring-slate-300 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-500/30',
  in_progress:
    'bg-sky-100 text-sky-700 ring-sky-300 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30',
  completed:
    'bg-emerald-100 text-emerald-700 ring-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30',
};

// =================================================================================================
// Component
// =================================================================================================

function TaskDetailsPage() {
  const { t, i18n } = useTranslation('tasks');


  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { initialize, getTaskById } = useTaskActions();
  const cached = useTaskById(id);
  const isInitialized = useTaskInitialized();

  const [task, setTask] = useState<Task | null>(cached ?? null);
  const [isFetching, setIsFetching] = useState(!cached);

  // Hydrate the list in the background so a Back-to-list click is
  // instant after a deep-link entry.
  useEffect(() => {
    if (!isInitialized) void initialize();
  }, [isInitialized, initialize]);

  useEffect(() => {
    if (cached) {
      setTask(cached);
      setIsFetching(false);
      return;
    }
    let cancelled = false;
    if (!id) {
      setTask(null);
      setIsFetching(false);
      return;
    }
    setIsFetching(true);
    void getTaskById(id)
      .then((next) => {
        if (cancelled) return;
        setTask(next);
      })
      .finally(() => {
        if (cancelled) return;
        setIsFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, cached, getTaskById]);

  return (
    <TasksScreen
      title={t('details.title')}
      actionLabel={t('details.back')}
      onAction={() => navigate('/tasks')}
    >
      {isFetching ? (
        <div className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('details.loading')}
        </div>
      ) : !task ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          <AlertTriangle className="h-10 w-10 text-[var(--color-muted-foreground)]/60" />
          <h3 className="text-lg font-medium">{t('details.notFound')}</h3>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {t('details.notFoundDescription')}
          </p>
        </div>
      ) : (
        <Card>
          <CardHeader className="gap-2">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-xl">{task.title}</CardTitle>
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
                  STATUS_CLASS[task.status]
                )}
              >
                {t(`status.${task.status}`)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--color-muted-foreground)]">
              <span>
                {t('details.id')}: <span className="font-mono">{task.id}</span>
              </span>
              <span>
                {t('details.createdAt')}:{' '}
                {new Date(task.createdAt).toLocaleString(i18n.language)}
              </span>
            </div>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap leading-relaxed text-sm text-[var(--color-foreground)]">
            {task.description || '—'}
          </CardContent>
        </Card>
      )}
    </TasksScreen>
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export { TaskDetailsPage };
