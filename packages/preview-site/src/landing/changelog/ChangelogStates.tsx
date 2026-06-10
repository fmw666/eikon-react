/**
 * @file ChangelogStates.tsx
 * @description Internal presentational sub-components for {@link ChangelogPage}
 * that cover the page's "out of band" surfaces: the demo-mode notice
 * strip, the releases-list error panel, and the empty / repo-missing
 * state. Extracted from ChangelogPage.tsx to keep the page composition
 * file focused on layout + data wiring. NOT a public barrel export —
 * consumed only by ChangelogPage.
 */

import { isGithubConfigured, SITE } from '@/lib/site-config';

import { useI18n } from '../theme/i18n';

import type { Async } from './use-changelog-data';

// ===========================================================================
// Demo-mode banner
// ===========================================================================

/**
 * Slim notice strip rendered above the version picker when the site
 * has no real GitHub repo wired up. Two responsibilities:
 *
 *   1. Tell the visitor the page is showing example data — otherwise
 *      they'd reasonably assume v0.1.0/v0.2.0/v0.3.0 are real
 *      releases of the live project.
 *   2. Tell the maintainer exactly which file to edit to swap in the
 *      real repo, so getting out of demo mode is one diff away.
 *
 * Uses `surface-2` background + a subtle dashed border instead of a
 * loud accent colour so the banner reads as an "info pill" rather
 * than a warning — nothing's broken, this is the intended fallback.
 */
export function DemoBanner() {
  const { t } = useI18n();
  return (
    <div
      role="note"
      className="flex items-start gap-3 rounded-xl border border-dashed border-[var(--border-2)] bg-[var(--surface-2)] px-5 py-3.5 text-xs text-[var(--fg-2)]"
    >
      <span
        aria-hidden="true"
        className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--surface-3)] font-mono text-[11px] font-bold text-[var(--fg-1)]"
      >
        i
      </span>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-[var(--fg-1)]">
          {t('changelog.demo.title')}
        </span>
        <span className="leading-relaxed text-[var(--fg-3)]">
          {t('changelog.demo.subtitle')}{' '}
          <code className="break-all rounded border border-[var(--border-1)] bg-[var(--surface-1)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--fg-2)]">
            src/landing/site-config.ts
          </code>
        </span>
      </div>
    </div>
  );
}

// ===========================================================================
// Error / empty states (for the releases-list bootstrap)
// ===========================================================================

export function ErrorPanel({
  state,
  onRetry,
}: {
  state: Extract<Async<unknown>, { status: 'error' }>;
  onRetry: () => void;
}) {
  const { t } = useI18n();
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-300 sm:p-6"
    >
      <div className="mb-2 font-semibold">{t('changelog.error.title')}</div>
      <div className="font-mono text-xs leading-relaxed">{state.message}</div>
      {state.rateLimitedUntil && (
        <div className="mt-2 text-xs">
          {t('changelog.error.rateLimitUntil')}{' '}
          {state.rateLimitedUntil.toLocaleTimeString()}
        </div>
      )}
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 cursor-pointer rounded-md border border-red-500/50 px-3 py-1.5 text-xs text-red-200 transition-colors hover:bg-red-500/20"
      >
        {t('changelog.error.retry')}
      </button>
    </div>
  );
}

/**
 * Empty / "we have nothing to show you" state.
 *
 *   - Default variant   → repo exists, just hasn't published any
 *                         tagged release yet.
 *   - `repoMissing`     → GitHub returned 404 for the repo path.
 *                         Most often this means the configured
 *                         `SITE.github.{owner,repo}` points at a
 *                         repository that doesn't exist (or is
 *                         private / has been renamed). We expose the
 *                         exact path we tried so the maintainer can
 *                         fix `site-config.ts` without diffing the
 *                         network panel.
 */
export function EmptyState({ repoMissing }: { repoMissing?: boolean } = {}) {
  const { t } = useI18n();
  // Three-way slug:
  //   - configured + 404 from GitHub  → show the actual `owner/repo`
  //     so the maintainer can verify the typo.
  //   - not configured at all         → show a placeholder so the
  //     row reads as "fill these in" rather than as "/".
  //   - configured + repo exists      → fall through; not used here.
  const configured = isGithubConfigured();
  const slug = configured
    ? `${SITE.github.owner}/${SITE.github.repo}`
    : '<owner>/<repo>';
  return (
    <div className="flex flex-col items-center rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] px-6 py-12 text-center sm:py-16">
      <h2 className="text-lg font-semibold text-[var(--fg-1)] sm:text-xl">
        {repoMissing
          ? t('changelog.empty.missingTitle')
          : t('changelog.empty.title')}
      </h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--fg-3)]">
        {repoMissing
          ? t('changelog.empty.missingSubtitle')
          : t('changelog.empty.subtitle')}
      </p>
      {repoMissing && (
        <code className="mt-4 inline-block rounded-md border border-[var(--border-1)] bg-[var(--surface-2)] px-2.5 py-1 font-mono text-xs text-[var(--fg-2)]">
          {slug}
        </code>
      )}
      {/* Only surface the "Open the GitHub repo" CTA when there's a
          real destination behind it — pointing visitors at github.com
          when site-config is empty would be worse than no CTA. */}
      {configured && (
        <a
          href={SITE.github.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-block text-sm text-brand-300 underline-offset-2 hover:underline"
        >
          {t('changelog.empty.cta')}
        </a>
      )}
    </div>
  );
}
