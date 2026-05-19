/**
 * @file NotFoundPage.tsx
 * @description Catch-all `*` route — shown when no feature route matched.
 *
 * Pulls copy from the `common` namespace (the default), which is
 * pre-loaded as part of `initI18n()` before the first paint, so this
 * page never needs to suspend for an i18n bundle.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core-related Libraries ---
// @eikon:feature(i18n) begin
import { useTranslation } from 'react-i18next';
// @eikon:feature(i18n) end
import { Link } from 'react-router-dom';

// --- Absolute Imports ---
import { Button } from '@/shared/ui/button';

// =================================================================================================
// Component
// =================================================================================================

function NotFoundPage() {
  // @eikon:feature(i18n) begin
  const { t } = useTranslation();
  // @eikon:feature(i18n) end

  // @eikon:feature(i18n:fallback) begin
  // const t = (k: string) =>
  //   ({
  //     'notFound.code': '404',
  //     'notFound.title': 'Page not found',
  //     'notFound.description':
  //       'The page you are looking for does not exist or has been moved.',
  //     'notFound.back': 'Go home',
  //   })[k] ?? k;
  // @eikon:feature(i18n:fallback) end

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
        {t('notFound.code')}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        {t('notFound.title')}
      </h1>
      <p className="mt-2 max-w-md text-sm text-[var(--color-muted-foreground)]">
        {t('notFound.description')}
      </p>
      <Button asChild className="mt-6">
        <Link to="/">{t('notFound.back')}</Link>
      </Button>
    </div>
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export { NotFoundPage };
