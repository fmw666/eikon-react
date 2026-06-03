/**
 * @file ChangelogPage.tsx
 * @description Top-level layout for the `/changelog` route. Composes
 * VersionPicker, ChangedFilesTree, DiffView around the data hooks and
 * the persistent zustand store.
 *
 * LAYOUT (desktop, lg+)
 *
 *   ┌──────────────── Changelog ─────────────────────────────────────┐
 *   │  Compare changes between releases                              │
 *   │  ┌──────────┐  ┌────────────┐  ┌────────────┐  ┌──────────┐    │
 *   │  │ Base ▼   │⇄ │ Head ▼     │  │ Stats:     │  │ Refresh  │    │
 *   │  │ v0.1.0   │  │ v0.2.0     │  │ +234 −56   │  │          │    │
 *   │  └──────────┘  └────────────┘  └────────────┘  └──────────┘    │
 *   ├────────────────────────────────────────────────────────────────┤
 *   │ ┌────────────┐  ┌────────────────────────────────────────────┐ │
 *   │ │ Changed    │  │ src/foo.ts            +12 −3   github      │ │
 *   │ │ files (5)  │  │ ──────────────────────────────────────────  │ │
 *   │ │            │  │ @@ -10,5 +12,7 @@                          │ │
 *   │ │ ▾ src      │  │  unchanged...                              │ │
 *   │ │   foo.ts   │  │ - removed                                  │ │
 *   │ │            │  │ + added                                    │ │
 *   │ └────────────┘  └────────────────────────────────────────────┘ │
 *   └────────────────────────────────────────────────────────────────┘
 *
 * BOOTSTRAP HEURISTIC
 *
 *   When the user lands without a previously-saved compare pair, we
 *   default to (latest-1, latest) — the freshest "what's new in the
 *   most recent release" diff. If only one release exists, both sides
 *   are pinned to it (the empty-diff fast path in `useCompare`
 *   short-circuits the network call). If zero releases exist, the
 *   page renders an empty-state CTA pointing at the GitHub repo.
 */

import { useEffect } from 'react';

import { isGithubConfigured, SITE } from '@/landing/site-config';

import { useI18n } from '../theme/i18n';

import { ChangedFilesTree } from './ChangedFilesTree';
import { DiffView } from './DiffView';
import { ChangelogPersistSync, useChangelogStore } from './store';
import {
  isDemoMode,
  useCompare,
  useReleases,
  type Async,
} from './use-changelog-data';
import { VersionPicker } from './VersionPicker';

import type { CompareResult, GitHubRelease } from '@/lib/github';

export default function ChangelogPage() {
  // Page is a flex column that owns the entire viewport-below-nav.
  // Children stack with a generous gap so each card reads as its own
  // "block" rather than blurring into the next. Each card is now
  // content-sized (workspace + release notes both hug their data),
  // so we add a trailing `flex-1` spacer to soak up any leftover
  // vertical space — that keeps the page at least one viewport tall
  // without forcing the workspace card to grow into a tall empty
  // box on big monitors.
  return (
    <main
      className="eikon-landing mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 pb-12 sm:gap-8 sm:px-6 sm:pb-16 lg:px-8"
      // `100dvh` honours iOS Safari's collapsing toolbar so the page
      // never overshoots the visible viewport on first paint. The
      // 5rem subtraction matches the floating Nav region height.
      style={{ minHeight: 'calc(100dvh - 5rem)' }}
    >
      <ChangelogPersistSync />
      <ChangelogContent />
      <div aria-hidden="true" className="flex-1" />
    </main>
  );
}

function ChangelogContent() {
  const { state: releasesState, refresh: refreshReleases } = useReleases();

  const baseTag = useChangelogStore((s) => s.baseTag);
  const headTag = useChangelogStore((s) => s.headTag);
  const setPair = useChangelogStore((s) => s.setPair);
  const setBaseTag = useChangelogStore((s) => s.setBaseTag);
  const setHeadTag = useChangelogStore((s) => s.setHeadTag);
  const selectedFile = useChangelogStore((s) => s.selectedFile);
  const setSelectedFile = useChangelogStore((s) => s.setSelectedFile);

  const releases = releasesState.status === 'ready' ? releasesState.data : [];

  // Bootstrap default selection: always show the latest pair
  // (previous version → newest version) on page load.
  useEffect(() => {
    if (releases.length < 2) return;
    const defaultHead = releases[0]!.tagName;
    const defaultBase = releases[1]!.tagName;
    setPair(defaultBase, defaultHead);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [releases]);

  const { state: compareState, refresh: refreshCompare } = useCompare(
    baseTag,
    headTag
  );

  // Auto-pick the first changed file when a fresh compare lands and
  // nothing's selected yet. Saves the user a click on the most common
  // workflow (open changelog → see what changed in the first file).
  useEffect(() => {
    if (compareState.status !== 'ready') return;
    if (selectedFile) return;
    const first = compareState.data.files[0];
    if (first) setSelectedFile(first.filename);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compareState]);

  const handleRefresh = () => {
    refreshReleases();
    refreshCompare();
  };

  return (
    <>
      <ChangelogHeader />

      {/* Demo-mode banner — only renders when site-config has no real
          GitHub repo. Tells the visitor the page is showing example
          data so they don't mistake a "v0.3.0" preview release for
          something the maintainer actually shipped. The banner is
          intentionally subtle (slate background, no shouting colour)
          to avoid stealing focus from the diff itself, but it does
          carry enough copy to point the maintainer at the file they
          need to edit to wire a real repo. */}
      {isDemoMode && <DemoBanner />}

      <section
        aria-label="Compare selector"
        className="rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] p-4 sm:p-5"
      >
        <VersionPicker
          releases={releases}
          baseTag={baseTag}
          headTag={headTag}
          onChangeBase={setBaseTag}
          onChangeHead={setHeadTag}
          onRefresh={handleRefresh}
          refreshing={
            releasesState.status === 'loading' ||
            compareState.status === 'loading'
          }
          // The "Refresh" pill is meaningless in demo mode — the
          // dataset is static. Hide it instead of leaving a no-op
          // affordance that visitors might click expecting feedback.
          showRefresh={!isDemoMode}
        />
        <CompareSummary state={compareState} releases={releases} />
      </section>

      {/* Releases-list error / empty surfaces. We render these BEFORE
          the workspace so the visitor isn't shown an empty diff pane
          while the cause is "we couldn't load the release list".
          GitHub 404 (typically: the configured repo doesn't exist
          or is private) is intentionally NOT a hard error — it
          surfaces as the same "no releases yet" empty state, with a
          tweaked subtitle, so a misconfigured site-config.ts doesn't
          look broken to the visitor. */}
      {releasesState.status === 'error' && releasesState.notFound && (
        <EmptyState repoMissing />
      )}
      {releasesState.status === 'error' && !releasesState.notFound && (
        <ErrorPanel state={releasesState} onRetry={handleRefresh} />
      )}
      {releasesState.status === 'ready' && releases.length === 0 && (
        <EmptyState />
      )}

      {releasesState.status === 'ready' &&
        releases.length > 0 &&
        // Hide the workspace card entirely on `identical` compares —
        // the CompareSummary already tells the visitor "These two
        // versions are identical.", and an empty workspace card on
        // top of that just adds a redundant "No file differences"
        // box that visually shouts louder than the actual message.
        // For `loading` / `idle` / error pre-states we keep the
        // workspace so the spinner has a home.
        !(
          compareState.status === 'ready' &&
          compareState.data.status === 'identical'
        ) && (
          // Workspace card is content-sized. Both children — the
          // file tree and the diff body — own their own height now
          // (tree sums its visible rows; diff caps at 70vh and
          // scrolls internally past that). Avoiding `flex-1` +
          // `min-h` here means a 13-line diff no longer leaves a
          // 260px black void beneath the patch, while a multi-
          // thousand-line diff still can't push the card past the
          // viewport. The `min-h-[280px]` floor keeps the loading /
          // first-paint state from collapsing to a sliver that
          // reads as broken UI. `bg-[#1e1e1e]` matches the tree's
          // and diff's own background so the card reads as a single
          // dark surface even when one side is shorter than the
          // other (the leftover gutter is filled by the section's
          // own background instead of looking like a separate empty
          // box).
          <section
            aria-label="Diff workspace"
            className="flex min-h-[280px] overflow-hidden rounded-xl border border-[var(--border-1)] shadow-[0_1px_0_rgb(255_255_255/0.02)_inset,0_8px_24px_-12px_rgb(0_0_0/0.35)]"
            style={{ background: '#1e1e1e' }}
          >
            <Workspace
              compareState={compareState}
              selectedFile={selectedFile}
              onSelectFile={setSelectedFile}
              baseTag={baseTag}
              headTag={headTag}
            />
          </section>
        )}

      {/* Compare-side errors that don't deserve to demolish the whole
          page. A deleted upstream tag, a one-off network blip, or a
          rate-limit retry hint shows up here without nuking the
          version picker the user might want to fix the selection in. */}
      {releasesState.status === 'ready' &&
        releases.length > 0 &&
        compareState.status === 'error' && (
          <ErrorPanel state={compareState} onRetry={handleRefresh} />
        )}

      {/* Release notes block. Sits below the diff workspace because the
          visitor's primary intent on /changelog is "what changed in the
          code"; the marketing-style notes are secondary context that
          benefits from being scrollable rather than always-on-top. */}
      {compareState.status === 'ready' && (
        <ReleaseNotes
          base={
            releases.find((r) => r.tagName === baseTag) ?? null
          }
          head={
            releases.find((r) => r.tagName === headTag) ?? null
          }
        />
      )}
    </>
  );
}

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
function DemoBanner() {
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
// Header band
// ===========================================================================

function ChangelogHeader() {
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

function CompareSummary({
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

// ===========================================================================
// Workspace (tree + diff)
// ===========================================================================

function Workspace({
  compareState,
  selectedFile,
  onSelectFile,
  baseTag,
  headTag,
}: {
  compareState: Async<CompareResult>;
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
  baseTag: string | null;
  headTag: string | null;
}) {
  const { t } = useI18n();

  // Fallback states need an explicit `min-h-[240px]` because the
  // surrounding workspace card is now content-sized (no more
  // `flex-1 min-h-[560px]`), so an empty/loading state without its
  // own minimum would collapse to the height of the spinner alone
  // and the card would look broken between requests.
  if (compareState.status === 'loading') {
    return <WorkspaceSpinner label={t('changelog.compare.loading')} />;
  }
  if (compareState.status === 'idle') {
    return (
      <div className="flex min-h-[240px] flex-1 items-center justify-center text-sm text-[var(--fg-3)]">
        {t('changelog.compare.pick')}
      </div>
    );
  }
  if (compareState.status === 'error') {
    return (
      <div className="flex min-h-[240px] flex-1 items-center justify-center px-4 py-6 text-sm text-red-400">
        {compareState.message}
      </div>
    );
  }

  const compare = compareState.data;
  const file = compare.files.find((f) => f.filename === selectedFile) ?? null;

  // Build the URL pointing at the head ref's blob so the user can
  // open the file in its post-change form on github.com from the
  // diff view's "github" pill.
  const headBlobUrl =
    file && headTag
      ? `https://github.com/${SITE.github.owner}/${SITE.github.repo}/blob/${encodeURIComponent(
          headTag
        )}/${file.filename}`
      : undefined;

  return (
    // RESPONSIVE LAYOUT CONTRACT
    //
    //   `<md` (mobile/tablet) : VERTICAL stack — file tree on top,
    //                            diff below. The page owns vertical
    //                            scrolling here so a long patch reads
    //                            naturally instead of being trapped
    //                            inside a short nested pane.
    //   `md+` (tablet/desktop): horizontal split — tree column on
    //                            the left (288px → 320px), diff
    //                            fills the rest. This is the
    //                            original GitHub-style layout.
    //
    // `items-stretch` (the default) lets the shorter side's
    // background paint to match the taller one — usually the tree
    // extending its `#1e1e1e` strip down past a tiny diff, or vice
    // versa. Either way both panes appear as one continuous
    // workspace.
    <div className="flex w-full min-w-0 flex-col md:flex-row">
      {/* File tree.
            <md : full-width and content-height so the page, not the
                  file pane, owns vertical scrolling.
            md+ : 288px column, 320px on lg, fills row height. */}
      <div
        // On mobile this must not become a nested scroll area: the
        // directory sits above the selected patch, so a visible
        // scrollbar here makes the top half feel fixed while the
        // diff below keeps growing. Desktop keeps the natural
        // split-pane behaviour.
        className="eikon-changelog-file-pane w-full min-w-0 shrink-0 overflow-visible border-b border-[var(--border-1)] md:w-72 md:border-b-0 md:border-r lg:w-80"
      >
        <ChangedFilesTree
          files={compare.files}
          selectedFile={selectedFile}
          onSelectFile={onSelectFile}
        />
      </div>
      <div className="eikon-changelog-diff-pane min-w-0 flex-1">
        <DiffView
          file={file}
          baseLabel={baseTag}
          headLabel={headTag}
          headBlobUrl={headBlobUrl}
        />
      </div>
    </div>
  );
}

function WorkspaceSpinner({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-busy="true"
      className="flex min-h-[240px] flex-1 items-center justify-center text-sm text-[var(--fg-3)]"
    >
      <span
        aria-hidden="true"
        className="mr-2 inline-block h-3 w-3 rounded-full border-2 border-[var(--border-2)] border-t-[var(--fg-1)]"
        style={{ animation: 'eikon-preview-spin 0.8s linear infinite' }}
      />
      {label}
    </div>
  );
}

// ===========================================================================
// Release notes (markdown body, rendered as plain text with line breaks)
// ===========================================================================

function ReleaseNotes({
  base,
  head,
}: {
  base: GitHubRelease | null;
  head: GitHubRelease | null;
}) {
  const { t } = useI18n();
  if (!head) return null;
  // We only show the HEAD release's notes — the base release is just
  // the comparison anchor, the visitor cares about what landed in head.
  // If we want to show both in the future, add a tabbed accordion here.
  if (!head.body.trim()) return null;
  void base;
  return (
    <section
      aria-label="Release notes"
      className="rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] p-5 sm:p-6"
    >
      <header className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-base font-semibold text-[var(--fg-1)]">
          {t('changelog.notes.title')} {head.name}
        </h2>
        <a
          href={head.htmlUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-brand-300 underline-offset-2 hover:underline"
        >
          {t('changelog.notes.openOnGithub')}
        </a>
      </header>
      <pre
        className="max-h-80 overflow-auto whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--fg-2)]"
        style={{ fontFamily: 'inherit' }}
      >
        {head.body.trim()}
      </pre>
    </section>
  );
}

// ===========================================================================
// Error / empty states (for the releases-list bootstrap)
// ===========================================================================

function ErrorPanel({
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
function EmptyState({ repoMissing }: { repoMissing?: boolean } = {}) {
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
