// @eikon:variant(toast=floating-bar) file
/**
 * @file floating-bar-toaster.tsx
 * @description Sonner-based "floating bar" preset — bottom-center wide
 * horizontal pill (min 20rem, max 2xl), single-line by default, tight
 * vertical padding. Mirrors VSCode's bottom-of-window notification slot:
 * unobtrusive but reads at a glance.
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

function FloatingBarToaster() {
  return (
    <SonnerToaster
      position="bottom-center"
      duration={3500}
      toastOptions={{
        classNames: {
          toast:
            'min-w-80 max-w-2xl rounded-lg border-[length:var(--surface-border-width)] border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-card-foreground)] shadow-lg px-4 py-2.5',
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

export { FloatingBarToaster };
