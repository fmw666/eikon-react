// @eikon:variant(toast=stacked-cards) file
/**
 * @file stacked-cards-toaster.tsx
 * @description Sonner-based "stacked cards" preset — bottom-right with
 * `expand` enabled so concurrent toasts fan out into a small stack of
 * cards (the Discord / Slack desktop look) instead of compressing into
 * Sonner's collapsed bell. Keeps rich colours and the close button so
 * each card carries enough affordance on its own.
 *
 * One of the seven toast variants selected via `--toast` at scaffold time;
 * the dispatcher at `../toaster.tsx` re-exports whichever variant won.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Third-party Libraries ---
import { Toaster as SonnerToaster } from 'sonner';

// =================================================================================================
// Component
// =================================================================================================

function StackedCardsToaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      richColors
      closeButton
      expand
      duration={5000}
      toastOptions={{
        classNames: {
          toast:
            'rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-card-foreground)] shadow-2xl',
          title: 'text-sm font-medium',
          description: 'text-xs text-[var(--color-muted-foreground)]',
        },
      }}
    />
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export { StackedCardsToaster };
