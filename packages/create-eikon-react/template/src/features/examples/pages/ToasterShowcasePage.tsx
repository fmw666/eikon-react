/**
 * @file ToasterShowcasePage.tsx
 * @description Route-level component for `/examples/toaster`.
 *
 * Lets the developer preview all seven Sonner-based toast presets that
 * ship with the template without rerunning the CLI. The page side-steps
 * the dispatcher at `shared/ui/toaster.tsx` and imports each sibling
 * directly so they can be toggled at runtime.
 *
 * IMPORTANT: only one Sonner `<Toaster>` should be mounted at any given
 * moment — multiple mounts produce duplicate toasts. We rotate the chosen
 * preset and mount only that one, which mirrors the post-strip production
 * shape.
 *
 * Note: this page only renders in dev — the routes import in
 * `app/router.tsx` is gated by `import.meta.env.DEV`, and the CLI strips
 * the entire showcase directory from scaffolded projects. The global
 * production Toaster (the one mounted in providers.tsx) is unaffected
 * either way.
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
import { toast } from 'sonner';

// --- Absolute Imports ---
import { Button } from '@/shared/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { AppleToaster } from '@/shared/ui/toaster/apple-toaster';
import { DefaultToaster } from '@/shared/ui/toaster/default-toaster';
import { FloatingBarToaster } from '@/shared/ui/toaster/floating-bar-toaster';
import { GlassToaster } from '@/shared/ui/toaster/glass-toaster';
import { MinimalToaster } from '@/shared/ui/toaster/minimal-toaster';
import { StackedCardsToaster } from '@/shared/ui/toaster/stacked-cards-toaster';
import { TerminalToaster } from '@/shared/ui/toaster/terminal-toaster';

// --- Relative Imports ---
import { ShowcasePageHeader } from '../components/ShowcasePageHeader';

// =================================================================================================
// Constants
// =================================================================================================

interface PresetSpec {
  id: string;
  label: string;
  /** The matching Sonner toaster component. */
  Component: React.ComponentType;
}

const PRESETS: PresetSpec[] = [
  { id: 'default', label: 'default', Component: DefaultToaster },
  { id: 'minimal', label: 'minimal', Component: MinimalToaster },
  { id: 'apple', label: 'apple', Component: AppleToaster },
  { id: 'glass', label: 'glass', Component: GlassToaster },
  { id: 'terminal', label: 'terminal', Component: TerminalToaster },
  { id: 'floating-bar', label: 'floating-bar', Component: FloatingBarToaster },
  { id: 'stacked-cards', label: 'stacked-cards', Component: StackedCardsToaster },
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

  // Default to the same preset Sonner ships at scaffold time so the
  // first render matches the production look.
  const [activeId, setActiveId] = React.useState<string>('default');
  const ActiveToaster =
    PRESETS.find((p) => p.id === activeId)?.Component ?? DefaultToaster;

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
          <Tabs value={activeId} onValueChange={setActiveId}>
            <TabsList className="flex h-auto flex-wrap gap-1">
              {PRESETS.map((p) => (
                <TabsTrigger
                  key={p.id}
                  value={p.id}
                  layoutId="examples-toaster-indicator"
                >
                  {p.label}
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

      {/*
        Mount the selected preset. We DON'T remount on every tab change
        via `key` — Sonner manages its own state and remounting would
        wipe in-flight toasts. Swapping the component is enough; Sonner's
        portal reconciles position + classNames on the next render.
      */}
      <ActiveToaster />
    </div>
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export { ToasterShowcasePage };
