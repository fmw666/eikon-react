// @eikon:variant(toast=default) file
/**
 * @file default-toaster.tsx
 * @description Sonner-based default toast preset — top-right with rich colors
 * (semantic green/red/orange for success/error/warning), a close button, and
 * a single-card border + shadow built on design tokens. The recommended
 * starting point for most apps; matches Sonner's documented defaults.
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

function DefaultToaster() {
  return (
    <SonnerToaster
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            'rounded-md border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-card-foreground)] shadow-lg',
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

export { DefaultToaster };
