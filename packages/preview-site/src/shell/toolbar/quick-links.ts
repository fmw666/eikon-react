// Internal to the shell Toolbar — not part of the feature index barrel.
// Quick-jump navigation targets rendered by both the desktop strip and
// the compact overflow menu.

export interface QuickLink {
  /** Sub-route inside the previewed app (no `/preview/<hash>` prefix). */
  target: string;
  label: string;
  /** Optional supplementary tooltip; falls back to "Navigate to <label>". */
  title?: string;
}

export const QUICK_LINKS: ReadonlyArray<QuickLink> = [
  { target: '/', label: 'Home' },
  { target: '/counter', label: 'Counter' },
  { target: '/tasks', label: 'Tasks' },
  {
    target: '/examples',
    label: 'Examples',
    title: 'Component showcase (dev-only feature, stripped from scaffolded projects)',
  },
  {
    target: '/examples/performance',
    label: 'Performance',
    title: 'Web Vitals + virtual list + lazy-load demos',
  },
  // Intentionally unmatched path. The template router has a `*` catch-all
  // wired to `<NotFoundPage />`, so any URL that no feature claims falls
  // through to the 404 view — this button is the easiest way to preview
  // that state without typing into the iframe's address bar.
  {
    target: '/404',
    label: 'Not Found',
    title: 'Preview the 404 catch-all page (any unmatched route works)',
  },
];
