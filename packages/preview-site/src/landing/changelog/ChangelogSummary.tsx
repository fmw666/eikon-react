/**
 * @file ChangelogSummary.tsx
 * @description Internal sub-components for {@link ChangelogPage}'s header
 * band and the compare-stats summary line that sits inside the version
 * picker card. Extracted from ChangelogPage.tsx to keep the page
 * composition file focused on layout + data wiring. NOT a public
 * barrel export — consumed only by ChangelogPage.
 */

import { useI18n } from '../theme/i18n';

import type { Async } from './use-changelog-data';
import type { CompareResult, GitHubRelease } from '@/lib/github';

// ===========================================================================
// Header band
// ===========================================================================

export function ChangelogHeader() {
  const { t } = useI18n();
  // Header sits directly under the floating Nav pill. The pill's
  // bottom padding is only ~1rem, so we add `pt-6 sm:pt-10` here to
  // open up real breathing room before the eyebrow — without this
  // the title visually collides with the pill on common laptop
  // viewports.
  return (
    <header className="flex flex-col gap-3 pt-6 sm:pt-10">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--fg-3)]">
        {t('changelog.eyebrow')}
      </span>
      <h1 className="text-3xl font-semibold tracking-tight text-[var(--fg-1)] sm:text-4xl">
        {t('changelog.title')}
      </h1>
      <p className="max-w-2xl text-sm leading-relaxed text-[var(--fg-3)] sm:text-base">
        {t('changelog.subtitle')}
      </p>
    </header>
  );
}

// ===========================================================================
// Compare summary — sits in the picker card, above the workspace
// ===========================================================================

export function CompareSummary({
  state,
  releases,
}: {
  state: Async<CompareResult>;
  releases: GitHubRelease[];
}) {
  const { t } = useI18n();
  if (state.status === 'idle') return null;
  if (state.status === 'loading') {
    return (
      <SummaryRow>
        <span className="text-[var(--fg-3)]">{t('changelog.compare.loading')}</span>
      </SummaryRow>
    );
  }
  if (state.status === 'error') {
    return (
      <SummaryRow>
        <span className="text-red-400">{state.message}</span>
      </SummaryRow>
    );
  }
  const c = state.data;
  if (c.status === 'identical') {
    return (
      <SummaryRow>
        <span className="text-[var(--fg-3)]">{t('changelog.compare.identical')}</span>
      </SummaryRow>
    );
  }
  const additions = c.files.reduce((s, f) => s + f.additions, 0);
  const deletions = c.files.reduce((s, f) => s + f.deletions, 0);
  void releases;
  return (
    <SummaryRow>
      <span className="text-[var(--fg-2)]">
        <strong>{c.files.length}</strong> {t('changelog.compare.files')}
      </span>
      <span className="text-[var(--fg-3)]">·</span>
      <span className="font-mono text-[var(--fg-2)]">
        <span className="text-emerald-400">+{additions}</span>{' '}
        <span className="text-rose-400">−{deletions}</span>
      </span>
      <span className="text-[var(--fg-3)]">·</span>
      <span className="text-[var(--fg-3)]">
        {c.totalCommits} {t('changelog.compare.commits')}
      </span>
      {c.htmlUrl && (
        <>
          <span className="text-[var(--fg-3)]">·</span>
          <a
            href={c.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-300 underline-offset-2 hover:underline"
          >
            {t('changelog.compare.viewOnGithub')}
          </a>
        </>
      )}
    </SummaryRow>
  );
}

function SummaryRow({ children }: { children: React.ReactNode }) {
  // A thin top border separates the stats line from the picker row
  // above it. Without the border the two rows blur into one visual
  // block; with `pt-3 mt-4` we get a deliberate "header / summary"
  // rhythm inside the same card.
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 border-t border-[var(--border-1)] pt-3 text-xs">
      {children}
    </div>
  );
}
