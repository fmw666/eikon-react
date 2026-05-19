/**
 * @file toaster.tsx
 * @description Thin dispatcher for the `toast` variant axis. The template
 * ships seven sibling Toaster implementations — default / minimal / apple /
 * glass / terminal / floating-bar / stacked-cards — and this file picks
 * exactly one to re-export as `Toaster`. The imperative `toast.*` API is
 * re-exported from `sonner` unchanged regardless of preset, so business
 * code (`toast.success('...')`, `toast.error('...')`, ...) is preset-agnostic.
 *
 * How the picking works (same mechanic as `app/layouts/RootLayout.tsx`):
 *
 *   - At CLI strip time (`stripFeatures`), every `@eikon:variant(toast=X)`
 *     block below collapses to ONE entry (the chosen preset) and the six
 *     unchosen sibling files in `./toaster/` are deleted whole-file by
 *     their own `@eikon:variant(toast=X) file` markers. So the final
 *     scaffolded project ships only ONE `*Toaster.tsx` next to this
 *     dispatcher.
 *
 *   - In the unstripped template (when you `pnpm dev` template-react
 *     directly, or run tests against `src/`), all seven imports coexist
 *     and `.at(0)` returns the first entry — which is the schema default
 *     (`default`). Edit the order if you want a different default in the
 *     unstripped dev experience.
 *
 * Callers keep their import stable:
 *
 *     import { Toaster, toast } from '@/shared/ui/toaster';
 *
 * — regardless of which preset was chosen.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Third-party Libraries ---
import { toast } from 'sonner';

// --- Relative Imports ---
// @eikon:variant(toast=default) begin
import { DefaultToaster } from './toaster/default-toaster';
// @eikon:variant(toast=default) end
// @eikon:variant(toast=minimal) begin
import { MinimalToaster } from './toaster/minimal-toaster';
// @eikon:variant(toast=minimal) end
// @eikon:variant(toast=apple) begin
import { AppleToaster } from './toaster/apple-toaster';
// @eikon:variant(toast=apple) end
// @eikon:variant(toast=glass) begin
import { GlassToaster } from './toaster/glass-toaster';
// @eikon:variant(toast=glass) end
// @eikon:variant(toast=terminal) begin
import { TerminalToaster } from './toaster/terminal-toaster';
// @eikon:variant(toast=terminal) end
// @eikon:variant(toast=floating-bar) begin
import { FloatingBarToaster } from './toaster/floating-bar-toaster';
// @eikon:variant(toast=floating-bar) end
// @eikon:variant(toast=stacked-cards) begin
import { StackedCardsToaster } from './toaster/stacked-cards-toaster';
// @eikon:variant(toast=stacked-cards) end

// =================================================================================================
// Dispatch
// =================================================================================================

/**
 * The chosen Toaster component. `.at(0)` is load-bearing for the unstripped
 * template — after strip, the array is guaranteed to have exactly one entry,
 * so the non-null assertion is safe.
 */
const Toaster = [
  // @eikon:variant(toast=default) begin
  DefaultToaster,
  // @eikon:variant(toast=default) end
  // @eikon:variant(toast=minimal) begin
  MinimalToaster,
  // @eikon:variant(toast=minimal) end
  // @eikon:variant(toast=apple) begin
  AppleToaster,
  // @eikon:variant(toast=apple) end
  // @eikon:variant(toast=glass) begin
  GlassToaster,
  // @eikon:variant(toast=glass) end
  // @eikon:variant(toast=terminal) begin
  TerminalToaster,
  // @eikon:variant(toast=terminal) end
  // @eikon:variant(toast=floating-bar) begin
  FloatingBarToaster,
  // @eikon:variant(toast=floating-bar) end
  // @eikon:variant(toast=stacked-cards) begin
  StackedCardsToaster,
  // @eikon:variant(toast=stacked-cards) end
].at(0)!;

// =================================================================================================
// Exports
// =================================================================================================

export { Toaster };
// eslint-disable-next-line react-refresh/only-export-components
export { toast };
