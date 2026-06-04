/**
 * @file ChangelogPage.tsx
 * @description Top-level layout for the `/changelog` route. Composes
 * VersionPicker, ChangedFilesTree, DiffView around the data hooks and
 * the persistent zustand store.
 *
 * Presentational sub-components live in sibling files to keep this
 * composition file focused on layout + data wiring:
 *   - ChangelogSummary.tsx   → ChangelogHeader, CompareSummary
 *   - ChangelogWorkspace.tsx → Workspace, ReleaseNotes
 *   - ChangelogStates.tsx    → DemoBanner, ErrorPanel, EmptyState
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

import { DemoBanner, EmptyState, ErrorPanel } from './ChangelogStates';
import { ChangelogHeader, CompareSummary } from './ChangelogSummary';
import { ReleaseNotes, Workspace } from './ChangelogWorkspace';
import { ChangelogPersistSync, useChangelogStore } from './store';
import { isDemoMode, useCompare, useReleases } from './use-changelog-data';
import { VersionPicker } from './VersionPicker';

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
          base={releases.find((r) => r.tagName === baseTag) ?? null}
          head={releases.find((r) => r.tagName === headTag) ?? null}
        />
      )}
    </>
  );
}
