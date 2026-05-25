// @eikon:variant(toast=minimal) file
/**
 * @file minimal-toaster.tsx
 * @description Sonner-based minimal toast preset — bottom-center, no rich
 * colours, no close button, short duration. The Linear / Vercel / Notion
 * aesthetic: short text-only confirmation that gets out of the way fast.
 * Status (success / error) is conveyed by the Sonner-rendered icon only;
 * the card itself stays neutral.
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

function MinimalToaster() {
  return (
    <SonnerToaster
      position="bottom-center"
      duration={3000}
      toastOptions={{
        classNames: {
          toast:
            'rounded-md border-[length:var(--surface-border-width)] border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)] shadow-sm px-3 py-2',
          title: 'text-xs font-medium tracking-tight',
          description: 'text-xs text-[var(--color-muted-foreground)]',
        },
      }}
    />
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export { MinimalToaster };
