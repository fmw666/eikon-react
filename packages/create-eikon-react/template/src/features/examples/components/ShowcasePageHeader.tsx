/**
 * @file ShowcasePageHeader.tsx
 * @description Shared chrome at the top of every examples sub-page.
 *
 * Two concerns:
 *
 *   - An optional "back to showcase" link (`showBack`), used by the
 *     standalone routes that predate the persistent sidebar.
 *   - The page title + subtitle, always rendered.
 *
 * The "Dev only" notice is NOT rendered here — it lives once in
 * `ExamplesLayout` so the persistent shell shows it a single time
 * instead of repeating a loud banner on all ~25 sub-pages.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core-related Libraries ---
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

// --- Third-party Libraries ---
import { ArrowLeft } from 'lucide-react';

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
  const { t } = useTranslation('examples');


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
