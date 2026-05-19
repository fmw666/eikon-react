// @eikon:variant(toast=glass) file
/**
 * @file glass-toaster.tsx
 * @description Sonner-based glassmorphism preset — top-right, half-opacity
 * card on top of a heavy backdrop-blur, with a hair-thin highlight ring on
 * the leading edge. Reads as "Arc / Raycast / Linear command palette" and
 * looks best in dark mode against a busy background. Keeps the close
 * button because the longer duration deserves a manual escape hatch.
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

function GlassToaster() {
  return (
    <SonnerToaster
      position="top-right"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            'rounded-xl border border-[var(--color-border)]/40 bg-[var(--color-card)]/50 text-[var(--color-card-foreground)] backdrop-blur-2xl shadow-2xl ring-1 ring-white/10',
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

export { GlassToaster };
