// @eikon:variant(toast=terminal) file
/**
 * @file terminal-toaster.tsx
 * @description Sonner-based "terminal" preset — bottom-left, near-zero
 * radius, monospace typeface on a fixed dark-neutral background. Designed
 * for developer-facing tools (CLIs, devtools panels, in-IDE assistants)
 * where notifications should read like a tail of log lines and stay out
 * of the user's content area. Deliberately ignores light/dark theme — the
 * card is always dark so it never blends into the editor below.
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

function TerminalToaster() {
  return (
    <SonnerToaster
      position="bottom-left"
      duration={5000}
      toastOptions={{
        classNames: {
          toast:
            'rounded-sm border border-neutral-700 bg-neutral-900 text-neutral-100 font-mono shadow-lg px-3 py-2',
          title: 'text-xs',
          description: 'text-xs text-neutral-400',
        },
      }}
    />
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export { TerminalToaster };
