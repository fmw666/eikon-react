/**
 * @file ChangelogWorkspace.tsx
 * @description Internal sub-components for {@link ChangelogPage}'s diff
 * workspace (file tree + diff body, with its loading / idle / error
 * fallbacks) and the HEAD release-notes block beneath it. Extracted
 * from ChangelogPage.tsx to keep the page composition file focused on
 * layout + data wiring. NOT a public barrel export — consumed only by
 * ChangelogPage.
 */

import { SITE } from '@/lib/site-config';

import { useI18n } from '../theme/i18n';

import { ChangedFilesTree } from './ChangedFilesTree';
import { DiffView } from './DiffView';

import type { Async } from './use-changelog-data';
import type { CompareResult, GitHubRelease } from '@/lib/github';

// ===========================================================================
// Workspace (tree + diff)
// ===========================================================================

export function Workspace({
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

export function ReleaseNotes({
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
