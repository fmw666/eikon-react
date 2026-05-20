/**
 * @file demo-data.ts
 * @description Synthetic releases + compare payloads used when the
 * site has no real GitHub repo wired up yet (`!isGithubConfigured()`).
 *
 * WHY THIS EXISTS
 *
 *   The `/changelog` page is the project's main "what does this thing
 *   actually look like?" surface. An empty page hides every feature
 *   we built (version pickers, file tree with status badges, hunk-
 *   level diff renderer, rename arrows, binary-file fallback, etc.).
 *   A static demo dataset lets visitors evaluate the experience
 *   immediately and lets maintainers verify visual changes without
 *   having to spin up a fixture repo on github.com.
 *
 * SHAPES
 *
 *   `DEMO_RELEASES`       — three fake releases ordered newest-first
 *                           to mirror GitHub's `/releases` response.
 *                           Dates are computed at module load
 *                           relative to "now" so the relative-time
 *                           labels never go stale.
 *
 *   `getDemoCompare(b,h)` — returns a `CompareResult` for a known
 *                           (base, head) pair, or `null` when the
 *                           pair isn't covered. The hook layer falls
 *                           back to the "identical" fast path on
 *                           `null`, so user-driven swaps that we
 *                           didn't pre-author still render cleanly.
 *
 * DEMO COVERAGE MATRIX
 *
 *   Pair               coverage
 *   ─────────────────────────────────────────────────────────────────
 *   v0.2.0 → v0.3.0    DEFAULT — exercises every renderer feature:
 *                       modified file w/ multi-hunk patch,
 *                       added file, removed file, renamed file,
 *                       binary file (no patch fallback).
 *   v0.1.0 → v0.2.0    Smaller, modify-only set with multi-hunk.
 *   v0.1.0 → v0.3.0    Cumulative aggregate of the two above.
 *
 *   Anything else (reversed pairs, out-of-range refs) returns null
 *   and the UI shows "These two versions are identical" — fine for
 *   a demo, no need to author 6 directions.
 *
 * REPLACEMENT
 *
 *   When you wire `SITE.github` in `site-config.ts`, this module
 *   stops being consulted automatically — `isGithubConfigured()`
 *   flips to `true` and the live GitHub API takes over. No need to
 *   delete this file; it's a passive demo asset.
 */

import type { CompareResult, GitHubRelease } from '@/lib/github';

const DAY = 24 * 60 * 60 * 1000;

/**
 * Compute an ISO date relative to "now". Used for the
 * `published_at` field so a visit on any day still surfaces
 * sensible "2 days ago" / "3 weeks ago" relative labels.
 */
function daysAgo(days: number): string {
  return new Date(Date.now() - days * DAY).toISOString();
}

// ---------------------------------------------------------------------------
// Releases — newest first, matching GitHub's ordering
// ---------------------------------------------------------------------------

export const DEMO_RELEASES: GitHubRelease[] = [
  {
    tagName: 'v0.3.0',
    name: 'v0.3.0 — Changelog viewer',
    publishedAt: daysAgo(2),
    body:
      [
        '## Highlights',
        '',
        '- New `/changelog` route with a live GitHub-powered diff browser',
        '- Version picker supports left/right swap and inline relative dates',
        '- Hunk renderer matches the GitHub palette (red/green per row)',
        '',
        '## Internal',
        '',
        '- Added a 3-layer cache (memory → localStorage → network) for the GitHub client',
        '- Extracted `<EmptyState>` so misconfigured repos no longer flash a red error',
      ].join('\n'),
    htmlUrl: 'https://example.com/releases/v0.3.0',
    prerelease: false,
    draft: false,
  },
  {
    tagName: 'v0.2.0',
    name: 'v0.2.0 — Playground polish',
    publishedAt: daysAgo(16),
    body: [
      '- Hot-reload the playground iframe on every variant switch',
      '- Resizable Files / Code / Preview panes',
      '- 6 design presets across Light/Dark mode',
    ].join('\n'),
    htmlUrl: 'https://example.com/releases/v0.2.0',
    prerelease: false,
    draft: false,
  },
  {
    tagName: 'v0.1.0',
    name: 'v0.1.0 — Initial release',
    publishedAt: daysAgo(34),
    body: 'First public preview of the Eikon-React scaffold.',
    htmlUrl: 'https://example.com/releases/v0.1.0',
    prerelease: false,
    draft: false,
  },
];

// ---------------------------------------------------------------------------
// Compare payloads
//
// Each `patch` string is a hand-authored unified diff; the line counts
// in the `@@ -...,+...` headers are kept consistent with the actual
// add/del rows in the body so `parsePatch` produces sane line numbers.
// ---------------------------------------------------------------------------

const PATCH_HERO_TSX = `@@ -38,6 +38,7 @@ import type { CSSProperties } from 'react';
 
 import { CtaButton } from '../components/CtaButton';
+import { isGithubConfigured, SITE } from '../site-config';
 import { useI18n } from '../theme/i18n';
 
 /** Anchor id used by Nav's "Home" link to scroll back to the top. */
@@ -150,15 +151,18 @@ export function Hero({
           <div className="mt-12 flex flex-wrap items-center justify-start gap-x-5 gap-y-4">
             <CtaButton variant="primary" onClick={onPrimaryCta}>
               {t('hero.cta.primary')}
             </CtaButton>
-            <CtaButton
-              variant="secondary"
-              href="https://github.com/fmw666/eikon-react"
-              target="_blank"
-              rel="noreferrer"
-              leadingIcon={<GithubIcon className="h-3.5 w-3.5" />}
-            >
-              {t('hero.cta.secondary')}
-            </CtaButton>
+            {isGithubConfigured() && (
+              <CtaButton
+                variant="secondary"
+                href={SITE.github.url}
+                target="_blank"
+                rel="noreferrer"
+                leadingIcon={<GithubIcon className="h-3.5 w-3.5" />}
+              >
+                {t('hero.cta.secondary')}
+              </CtaButton>
+            )}
           </div>`;

const PATCH_CHANGELOG_PAGE_NEW = `@@ -0,0 +1,12 @@
+import { useEffect } from 'react';
+
+import { ChangedFilesTree } from './ChangedFilesTree';
+import { DiffView } from './DiffView';
+import { VersionPicker } from './VersionPicker';
+
+export default function ChangelogPage() {
+  return (
+    <main className="mx-auto max-w-[1400px] px-4">
+      {/* Compose VersionPicker + ChangedFilesTree + DiffView */}
+    </main>
+  );
+}`;

const PATCH_OLD_HELPER_REMOVED = `@@ -1,8 +0,0 @@
-export function legacyMerge(a: object, b: object) {
-  return Object.assign({}, a, b);
-}
-
-export function unusedHelper() {
-  // Replaced by Object.fromEntries elsewhere.
-  return null;
-}`;

const PATCH_RENAME_BUTTON = `@@ -1,6 +1,8 @@
-export function Button({ label }: { label: string }) {
+export function CtaButton({ label, variant = 'primary' }: { label: string; variant?: 'primary' | 'secondary' }) {
   return (
-    <button type="button" className="rounded-md px-3 py-1.5">
+    <button type="button" className={\`rounded-md px-3.5 py-1.5 \${variant === 'primary' ? 'bg-emerald-400' : 'bg-zinc-800'}\`}>
       {label}
     </button>
   );
 }`;

const PATCH_I18N = `@@ -180,6 +180,16 @@
     'changelog.comingSoon': '更新日志即将上线',
     'changelog.back': '← 返回首页',
+
+    'changelog.eyebrow': '版本对比',
+    'changelog.title': '更新日志',
+    'changelog.subtitle':
+      '从 GitHub 实时拉取每个 Tag 的发行包，并以左右双侧版本可视化代码差异。',
+    'changelog.picker.base': '基线',
+    'changelog.picker.head': '目标',
+    'changelog.picker.swap': '互换基线与目标',
+    'changelog.picker.refresh': '刷新',
+    'changelog.compare.identical': '所选两个版本完全一致。',
   },
   en: {
     'nav.home': 'Home',`;

const PATCH_PLAYGROUND_HOT_RELOAD = `@@ -210,7 +210,9 @@ export function PreviewFrame() {
   const reloadKey = useUiStore((s) => s.reloadKey);
 
-  const src = currentHash ? \`/preview/\${currentHash}/\` : 'about:blank';
+  const src = currentHash
+    ? \`/preview/\${currentHash}/?_=\${reloadKey}\`
+    : 'about:blank';
 
   useEffect(() => {
     if (!ref.current) return;
@@ -225,6 +227,8 @@ export function PreviewFrame() {
   return (
     <iframe
       ref={ref}
+      key={reloadKey}
       src={src}
       title="preview"
       sandbox="allow-scripts allow-same-origin"`;

// ---------------------------------------------------------------------------
// Compose into compare results
// ---------------------------------------------------------------------------

/** Sum additions / deletions of a patch by counting +/- lines. */
function tally(patch: string): { additions: number; deletions: number } {
  let additions = 0;
  let deletions = 0;
  for (const line of patch.split('\n')) {
    if (line.startsWith('@@')) continue;
    if (line.startsWith('+++') || line.startsWith('---')) continue;
    if (line.startsWith('+')) additions++;
    else if (line.startsWith('-')) deletions++;
  }
  return { additions, deletions };
}

const COMPARE_V020_V030: CompareResult = {
  base: 'v0.2.0',
  head: 'v0.3.0',
  status: 'ahead',
  aheadBy: 4,
  behindBy: 0,
  totalCommits: 4,
  htmlUrl: 'https://example.com/compare/v0.2.0...v0.3.0',
  files: [
    {
      filename: 'src/landing/changelog/ChangelogPage.tsx',
      status: 'added',
      ...tally(PATCH_CHANGELOG_PAGE_NEW),
      changes: 12,
      patch: PATCH_CHANGELOG_PAGE_NEW,
    },
    {
      filename: 'src/landing/components/CtaButton.tsx',
      previousFilename: 'src/landing/components/Button.tsx',
      status: 'renamed',
      ...tally(PATCH_RENAME_BUTTON),
      changes: 4,
      patch: PATCH_RENAME_BUTTON,
    },
    {
      filename: 'src/landing/sections/Hero.tsx',
      status: 'modified',
      ...tally(PATCH_HERO_TSX),
      changes: 11,
      patch: PATCH_HERO_TSX,
    },
    {
      filename: 'src/landing/theme/i18n.ts',
      status: 'modified',
      ...tally(PATCH_I18N),
      changes: 10,
      patch: PATCH_I18N,
    },
    {
      filename: 'src/lib/legacy-helper.ts',
      status: 'removed',
      ...tally(PATCH_OLD_HELPER_REMOVED),
      changes: 8,
      patch: PATCH_OLD_HELPER_REMOVED,
    },
    {
      // Demonstrates the binary / oversized fallback. GitHub omits
      // `patch` in these cases; the DiffView shows a "no preview
      // available" panel + an "Open on GitHub" link.
      filename: 'public/icons/logo.png',
      status: 'modified',
      additions: 0,
      deletions: 0,
      changes: 0,
      patch: undefined,
    },
  ],
};

const COMPARE_V010_V020: CompareResult = {
  base: 'v0.1.0',
  head: 'v0.2.0',
  status: 'ahead',
  aheadBy: 2,
  behindBy: 0,
  totalCommits: 2,
  htmlUrl: 'https://example.com/compare/v0.1.0...v0.2.0',
  files: [
    {
      filename: 'src/shell/PreviewFrame.tsx',
      status: 'modified',
      ...tally(PATCH_PLAYGROUND_HOT_RELOAD),
      changes: 5,
      patch: PATCH_PLAYGROUND_HOT_RELOAD,
    },
  ],
};

const COMPARE_V010_V030: CompareResult = {
  base: 'v0.1.0',
  head: 'v0.3.0',
  status: 'ahead',
  aheadBy: 6,
  behindBy: 0,
  totalCommits: 6,
  htmlUrl: 'https://example.com/compare/v0.1.0...v0.3.0',
  // Combine v0.1→v0.2 and v0.2→v0.3, sorted by filename to match the
  // sort the real client applies on the server response.
  files: [...COMPARE_V010_V020.files, ...COMPARE_V020_V030.files].sort(
    (a, b) => a.filename.localeCompare(b.filename)
  ),
};

const TABLE: Record<string, CompareResult> = {
  'v0.2.0...v0.3.0': COMPARE_V020_V030,
  'v0.1.0...v0.2.0': COMPARE_V010_V020,
  'v0.1.0...v0.3.0': COMPARE_V010_V030,
};

export function getDemoCompare(
  base: string,
  head: string
): CompareResult | null {
  return TABLE[`${base}...${head}`] ?? null;
}
