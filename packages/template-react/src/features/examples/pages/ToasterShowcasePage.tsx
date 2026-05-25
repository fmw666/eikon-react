/**
 * @file ToasterShowcasePage.tsx
 * @description Route-level component for `/examples/toaster`.
 *
 * Lets the developer preview the design-driven toast at each of the 4
 * supported positions without rerunning the CLI. The styling is always
 * controlled by the active design preset — this page only toggles
 * placement.
 *
 * IMPORTANT: only one Sonner `<Toaster>` should be mounted at any given
 * moment — multiple mounts produce duplicate toasts. We mount a single
 * `<SonnerToaster>` with the chosen position; the global Toaster in
 * providers.tsx is the production one.
 *
 * Note: this page only renders in dev — the routes import in
 * `app/router.tsx` is gated by `import.meta.env.DEV`, and the CLI strips
 * the entire showcase directory from scaffolded projects.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import * as React from 'react';

// --- Core-related Libraries ---
// @eikon:feature(i18n) begin
import { useTranslation } from 'react-i18next';
// @eikon:feature(i18n) end

// --- Third-party Libraries ---
import { toast, Toaster as SonnerToaster } from 'sonner';

// --- Absolute Imports ---
import { Button } from '@/shared/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs';

// --- Relative Imports ---
import { ShowcasePageHeader } from '../components/ShowcasePageHeader';

// =================================================================================================
// Constants
// =================================================================================================

type Position =
  | 'top-right'
  | 'top-center'
  | 'bottom-center'
  | 'bottom-right';

const POSITIONS: Position[] = [
  'top-right',
  'top-center',
  'bottom-center',
  'bottom-right',
];

// =================================================================================================
// Component
// =================================================================================================

function ToasterShowcasePage() {
  // @eikon:feature(i18n) begin
  const { t } = useTranslation('examples');
  // @eikon:feature(i18n) end

  // @eikon:feature(i18n:fallback) begin
  // const t = (_k: string, opts?: { defaultValue?: string }) =>
  //   opts?.defaultValue ?? _k;
  // @eikon:feature(i18n:fallback) end

  const [position, setPosition] = React.useState<Position>('top-right');

  const fireSuccess = React.useCallback(() => {
    toast.success(t('pages.toaster.successMessage'));
  }, [t]);
  const fireError = React.useCallback(() => {
    toast.error(t('pages.toaster.errorMessage'));
  }, [t]);
  const fireInfo = React.useCallback(() => {
    toast(t('pages.toaster.infoMessage'));
  }, [t]);
  const firePromise = React.useCallback(() => {
    const work = new Promise<void>((resolve, reject) =>
      setTimeout(() => (Math.random() < 0.7 ? resolve() : reject(new Error('fail'))), 1500)
    );
    toast.promise(work, {
      loading: t('pages.toaster.promiseLoading'),
      success: t('pages.toaster.promiseSuccess'),
      error: t('pages.toaster.promiseError'),
    });
  }, [t]);

  return (
    <div className="flex flex-col gap-8">
      <ShowcasePageHeader
        showBack
        title={t('pages.toaster.title')}
        subtitle={t('pages.toaster.description')}
      />

      <section
        aria-labelledby="toaster-controls"
        className="flex flex-col gap-6"
      >
        <h2 id="toaster-controls" className="sr-only">
          {t('pages.toaster.title')}
        </h2>
        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
            {t('pages.toaster.currentLabel')}
          </span>
          <Tabs value={position} onValueChange={(v) => setPosition(v as Position)}>
            <TabsList className="flex h-auto flex-wrap gap-1">
              {POSITIONS.map((p) => (
                <TabsTrigger
                  key={p}
                  value={p}
                  layoutId="examples-toaster-indicator"
                >
                  {p}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={fireSuccess}>{t('pages.toaster.fireSuccess')}</Button>
          <Button variant="destructive" onClick={fireError}>
            {t('pages.toaster.fireError')}
          </Button>
          <Button variant="secondary" onClick={fireInfo}>
            {t('pages.toaster.fireInfo')}
          </Button>
          <Button variant="outline" onClick={firePromise}>
            {t('pages.toaster.firePromise')}
          </Button>
        </div>
      </section>

      <SonnerToaster
        position={position}
        richColors
        closeButton
        toastOptions={{
          classNames: {
            toast:
              'rounded-[var(--radius-md)] border-[length:var(--surface-border-width)] border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-card-foreground)] shadow-lg',
            title: 'text-sm font-medium',
            description: 'text-xs text-[var(--color-muted-foreground)]',
          },
        }}
      />
    </div>
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export { ToasterShowcasePage };
