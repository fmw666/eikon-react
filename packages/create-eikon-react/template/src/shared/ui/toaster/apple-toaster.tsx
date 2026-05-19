// @eikon:variant(toast=apple) file
/**
 * @file apple-toaster.tsx
 * @description Sonner-based "Apple notification banner" preset — top-center,
 * generous rounded-2xl corners, frosted-glass background (backdrop-blur on a
 * translucent card token), soft ring + shadow stack. Mirrors the macOS /
 * iOS notification banner visual language: the toast feels native, the
 * status colour comes from Sonner's icon (no full-card colour wash).
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

function AppleToaster() {
  return (
    <SonnerToaster
      position="top-center"
      duration={4500}
      offset={16}
      toastOptions={{
        classNames: {
          toast:
            'rounded-2xl border border-[var(--color-border)]/60 bg-[var(--color-card)]/70 text-[var(--color-card-foreground)] backdrop-blur-xl shadow-xl ring-1 ring-white/5 px-4 py-3',
          title: 'text-sm font-semibold',
          description: 'text-xs text-[var(--color-muted-foreground)]',
        },
      }}
    />
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export { AppleToaster };
