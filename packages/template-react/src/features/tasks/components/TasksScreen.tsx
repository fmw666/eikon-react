/**
 * @file TasksScreen.tsx
 * @description Shared layout shell for every Tasks page.
 *
 * Renders the title row with a pill-shaped action button on the right
 * plus the amber Mock/Supabase notice that explains which backend the
 * page is talking to. v1's `TaskLayout` rolled this into the page; we
 * expose it as a component so callers can wrap a <Suspense> or
 * <Outlet/> without paying for an extra route element.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import type { ReactNode } from 'react';

// --- Core-related Libraries ---
import { useTranslation } from 'react-i18next';

// --- Absolute Imports ---
import { serviceConfig } from '@/shared/services';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';

// =================================================================================================
// Types
// =================================================================================================

interface TasksScreenProps {
  title: string;
  actionLabel: string;
  onAction: () => void;
  children: ReactNode;
  className?: string;
}

// =================================================================================================
// Component
// =================================================================================================

function TasksScreen({
  title,
  actionLabel,
  onAction,
  children,
  className,
}: TasksScreenProps) {
  const { t } = useTranslation('tasks');


  const isOnline = !serviceConfig.useMock;
  const modeLabel = isOnline
    ? t('layout.modeSupabase')
    : t('layout.modeMock');

  return (
    <section className={cn('mx-auto w-full max-w-2xl', className)}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <Button onClick={onAction} className="rounded-full">
          {actionLabel}
        </Button>
      </div>

      <div className="mb-6 rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200">
        <p className="text-sm font-medium">{t('layout.notice')}</p>
        <div className="mt-1 flex items-center gap-2 text-sm">
          <span>{t('layout.mode')}</span>
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
              isOnline
                ? 'bg-green-100 text-green-700 ring-green-300 dark:bg-green-500/10 dark:text-green-300 dark:ring-green-500/30'
                : 'bg-slate-100 text-slate-700 ring-slate-300 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-500/30'
            )}
          >
            {modeLabel}
          </span>
        </div>
      </div>

      <div className="space-y-4">{children}</div>
    </section>
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export { TasksScreen };
export type { TasksScreenProps };
