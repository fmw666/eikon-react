/**
 * @file ShowcasePageHeader.tsx
 * @description Shared chrome that sits at the top of every examples
 * page (index + the four standalone showcases).
 *
 * Three concerns, all optional:
 *
 *   - A "back to showcase" link, shown only when `showBack` is true
 *     (i.e. the standalone routes; the index page hides it).
 *   - A "Dev only" badge + one-line notice, always rendered so visitors
 *     immediately understand the route doesn't ship to production.
 *   - The page title + subtitle, also always rendered.
 *
 * Keeping this composable rather than hard-coding the slots lets the
 * index page render a richer hero (with a TOC alongside) while the
 * sub-pages stay tight and predictable.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core-related Libraries ---
// @eikon:feature(i18n) begin
import { useTranslation } from 'react-i18next';
// @eikon:feature(i18n) end
import { Link } from 'react-router-dom';

// --- Third-party Libraries ---
import { ArrowLeft, Sparkles } from 'lucide-react';

// =================================================================================================
// Types
// =================================================================================================

interface ShowcasePageHeaderProps {
  /** Page heading (h1). */
  title: string;
  /** Optional one-line subtitle directly under the heading. */
  subtitle?: string;
  /** Show the "← Back to showcase" link above the badge. */
  showBack?: boolean;
}

// =================================================================================================
// Component
// =================================================================================================

function ShowcasePageHeader({
  title,
  subtitle,
  showBack = false,
}: ShowcasePageHeaderProps) {
  // @eikon:feature(i18n) begin
  const { t } = useTranslation('examples');
  // @eikon:feature(i18n) end

  // @eikon:feature(i18n:fallback) begin
  // const t = (_k: string, opts?: { defaultValue?: string }) =>
  //   opts?.defaultValue ?? _k;
  // @eikon:feature(i18n:fallback) end

  return (
    <header className="flex flex-col gap-4">
      {showBack && (
        <Link
          to="/examples"
          className="inline-flex w-fit items-center gap-1 text-xs text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)]"
        >
          <ArrowLeft className="h-3 w-3" />
          {t('meta.backToIndex')}
        </Link>
      )}
      <div
        // The dev-only banner doubles as the eyebrow + status indicator.
        // Amber rather than the muted token so it visually pops out of the
        // page chrome — visitors should never wonder "is this a real route
        // I'm supposed to deploy?".
        className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300"
        role="status"
      >
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <div className="flex flex-col gap-0.5">
          <span className="font-medium uppercase tracking-wide">
            {t('meta.devOnlyBadge')}
          </span>
          <span className="text-amber-700/80 dark:text-amber-300/80">
            {t('meta.devOnlyNotice')}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>
        {subtitle && (
          <p className="max-w-2xl text-sm text-[var(--color-muted-foreground)]">
            {subtitle}
          </p>
        )}
      </div>
    </header>
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export { ShowcasePageHeader };
export type { ShowcasePageHeaderProps };
