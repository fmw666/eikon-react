/**
 * @file RootLayout.tsx
 * @description Thin dispatcher for the layout axis. The template ships
 * four sibling layout files — Stacked / Sidebar / TopbarSidebar / Centered
 * — and this file picks exactly one to re-export as `RootLayout`.
 *
 * How the picking works:
 *
 *   - At CLI strip time (`stripFeatures`), every `@eikon:variant(layout=X)`
 *     block below collapses to ONE entry (the chosen variant) and the
 *     three unchosen sibling files are deleted whole-file by their own
 *     `@eikon:variant(layout=X) file` markers. So the final scaffolded
 *     project ships only ONE `*RootLayout.tsx` next to this dispatcher.
 *
 *   - In the unstripped template (when you `pnpm dev` template-react
 *     directly, or run tests against `src/`), all four imports coexist and
 *     `.at(0)` returns the first entry — which is the schema default
 *     (`stacked`). Edit the order if you want a different default in the
 *     unstripped dev experience.
 *
 * Callers (router, tests) keep their import stable:
 *
 *     import { RootLayout } from '@/app/layouts/RootLayout';
 *
 * — regardless of which variant was chosen.
 */

// =================================================================================================
// Imports
// =================================================================================================

// @eikon:variant(layout=stacked) begin
import { StackedRootLayout } from './StackedRootLayout';
// @eikon:variant(layout=stacked) end
// @eikon:variant(layout=sidebar) begin
import { SidebarRootLayout } from './SidebarRootLayout';
// @eikon:variant(layout=sidebar) end
// @eikon:variant(layout=topbar-sidebar) begin
import { TopbarSidebarRootLayout } from './TopbarSidebarRootLayout';
// @eikon:variant(layout=topbar-sidebar) end
// @eikon:variant(layout=centered) begin
import { CenteredRootLayout } from './CenteredRootLayout';
// @eikon:variant(layout=centered) end

// =================================================================================================
// Dispatch
// =================================================================================================

/**
 * The chosen layout component. `.at(0)` is load-bearing for the unstripped
 * template — after strip, the array is guaranteed to have exactly one
 * entry, so the non-null assertion is safe.
 */
const RootLayout = [
  // @eikon:variant(layout=stacked) begin
  StackedRootLayout,
  // @eikon:variant(layout=stacked) end
  // @eikon:variant(layout=sidebar) begin
  SidebarRootLayout,
  // @eikon:variant(layout=sidebar) end
  // @eikon:variant(layout=topbar-sidebar) begin
  TopbarSidebarRootLayout,
  // @eikon:variant(layout=topbar-sidebar) end
  // @eikon:variant(layout=centered) begin
  CenteredRootLayout,
  // @eikon:variant(layout=centered) end
].at(0)!;

// =================================================================================================
// Exports
// =================================================================================================

export { RootLayout };
