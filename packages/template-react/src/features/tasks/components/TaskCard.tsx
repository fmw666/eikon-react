/**
 * @file TaskCard.tsx
 * @description Compact card for a single task in the index list.
 *
 * Surfaces title, description and a translated status badge. Activates
 * via mouse click or keyboard (Enter / Space) when `onClick` is given.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core-related Libraries ---
// @eikon:feature(i18n) begin
import { useTranslation } from 'react-i18next';
// @eikon:feature(i18n) end

// --- Absolute Imports ---
import { cn } from '@/shared/lib/cn';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';

// --- Relative Imports ---
import type { Task, TaskStatus } from '../types';

// =================================================================================================
// Types
// =================================================================================================

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  className?: string;
}

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

function TaskCard({ task, onClick, className }: TaskCardProps) {
  // @eikon:feature(i18n) begin
  const { t } = useTranslation('tasks');
  // @eikon:feature(i18n) end

  // @eikon:feature(i18n:fallback) begin
  // const t = (k: string) =>
  //   ({
  //     'status.pending': 'Pending',
  //     'status.in_progress': 'In progress',
  //     'status.completed': 'Completed',
  //   })[k] ?? k;
  // @eikon:feature(i18n:fallback) end

  return (
    <Card
      hoverable
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!onClick) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        'cursor-pointer transition-colors hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)]',
        !onClick && 'cursor-default',
        className
      )}
    >
      <CardHeader className="gap-2 pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">{task.title}</CardTitle>
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
              STATUS_CLASS[task.status]
            )}
          >
            {t(`status.${task.status}`)}
          </span>
        </div>
      </CardHeader>
      {task.description && (
        <CardContent className="pt-0 text-sm text-[var(--color-muted-foreground)]">
          {task.description}
        </CardContent>
      )}
    </Card>
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export { TaskCard };
export type { TaskCardProps };
