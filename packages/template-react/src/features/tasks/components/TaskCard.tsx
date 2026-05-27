/**
 * @file TaskCard.tsx
 * @description Compact card for a single task in the index list.
 *
 * Surfaces title, description and a translated status badge. Activates
 * via mouse click or keyboard (Enter / Space) when `onClick` is given.
 *
 * When `onDelete` is supplied, the card additionally renders a Trash icon
 * button in the header row that opens a destructive confirmation dialog;
 * confirming awaits the parent-supplied callback (the parent typically
 * pairs it with `useTaskActions().deleteTask` + a success toast). The
 * trash button stops propagation so it never triggers the card's own
 * `onClick` navigation.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import * as React from 'react';

// --- Core-related Libraries ---
import { useTranslation } from 'react-i18next';

// --- Third-party Libraries ---
import { Loader2, Trash2 } from 'lucide-react';

// --- Absolute Imports ---
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle, cardHoverableClass } from '@/shared/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';

// --- Relative Imports ---
import type { Task, TaskStatus } from '../types';

// =================================================================================================
// Types
// =================================================================================================

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  /**
   * Intent callback fired AFTER the user confirms deletion in the
   * built-in confirmation dialog. The card owns the dialog UI and the
   * pending state; the parent owns the actual store mutation + any
   * post-delete side effects (toast, navigation, …).
   *
   * If the callback throws / rejects, the dialog stays open so the user
   * can retry or cancel; the card simply clears its own busy flag.
   */
  onDelete?: () => void | Promise<void>;
  className?: string;
}

// =================================================================================================
// Constants
// =================================================================================================

const STATUS_CLASS: Record<TaskStatus, string> = {
  pending:
    'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300',
  in_progress:
    'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  completed:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
};

// =================================================================================================
// Component
// =================================================================================================

function TaskCard({ task, onClick, onDelete, className }: TaskCardProps) {
  const { t } = useTranslation('tasks');


  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleConfirm = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete();
      setConfirmOpen(false);
    } catch {
      // Swallow here so the dialog stays open; the parent already owns
      // any user-facing error reporting (toast, inline message, …).
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card
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
          cardHoverableClass,
          'cursor-pointer transition-colors hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)]',
          !onClick && 'cursor-default',
          className
        )}
      >
        <CardHeader className="gap-2 pb-2">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="min-w-0 flex-1 truncate text-base">
              {task.title}
            </CardTitle>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[0.6875rem] font-medium tracking-tight',
                  STATUS_CLASS[task.status]
                )}
              >
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-75"
                />
                {t(`status.${task.status}`)}
              </span>
              {onDelete && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={t('delete.button')}
                  className="h-7 w-7 text-[var(--color-muted-foreground)] hover:text-[var(--color-destructive)]"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation();
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        {task.description && (
          <CardContent className="pt-0 text-sm text-[var(--color-muted-foreground)]">
            {task.description}
          </CardContent>
        )}
      </Card>

      {onDelete && (
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('delete.confirmTitle')}</DialogTitle>
              <DialogDescription>
                {t('delete.confirmBody', { title: task.title })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={isDeleting}>
                  {t('delete.cancel')}
                </Button>
              </DialogClose>
              <Button
                variant="destructive"
                onClick={handleConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('delete.confirm')}
                  </>
                ) : (
                  t('delete.confirm')
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export { TaskCard };
export type { TaskCardProps };
