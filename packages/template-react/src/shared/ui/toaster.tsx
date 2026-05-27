/**
 * @file toaster.tsx
 * @description Single design-driven Toaster built on sonner. Styling is
 * derived from the active design preset via CSS tokens (--color-card,
 * --color-border, --surface-border-width, etc.) — no separate files per
 * design. The user picks the toast *position* at scaffold time via the
 * `--toast-position` CLI flag.
 *
 * In the unstripped template (workspace `pnpm dev`, playground iframe,
 * tests) all four `@eikon:variant(toastPosition=...)` blocks coexist
 * and `INITIAL_POSITION` is the first entry — the schema default. The
 * playground swaps positions live via the `eikon:set-variant`
 * postMessage bridge with no rebuild.
 *
 * After CLI strip, the position array collapses to ONE entry; the
 * runtime swap effect is dropped at compile time by Rollup
 * (`import.meta.env.DEV` evaluates `false` in user-built scaffolds), so
 * `INITIAL_POSITION` is the only value the component ever sees.
 *
 * Callers keep their import stable:
 *
 *     import { Toaster, toast } from '@/shared/ui/toaster';
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import { useEffect, useState } from 'react';

// --- Third-party Libraries ---
import { toast, Toaster as SonnerToaster } from 'sonner';

// =================================================================================================
// Position dispatch
// =================================================================================================

type Position =
  | 'top-left'
  | 'top-right'
  | 'top-center'
  | 'bottom-left'
  | 'bottom-right'
  | 'bottom-center';

const INITIAL_POSITION = ([
  // @eikon:variant(toastPosition=top-right) begin
  'top-right',
  // @eikon:variant(toastPosition=top-right) end
  // @eikon:variant(toastPosition=top-center) begin
  'top-center',
  // @eikon:variant(toastPosition=top-center) end
  // @eikon:variant(toastPosition=bottom-center) begin
  'bottom-center',
  // @eikon:variant(toastPosition=bottom-center) end
  // @eikon:variant(toastPosition=bottom-right) begin
  'bottom-right',
  // @eikon:variant(toastPosition=bottom-right) end
].at(0) ?? 'top-right') as Position;

// =================================================================================================
// Component
// =================================================================================================

function Toaster() {
  const [position, setPosition] = useState<Position>(INITIAL_POSITION);

  useEffect(() => {
    // Same gating as the design/ui bridge in main.tsx — in a built
    // scaffold this whole block is dead-code-eliminated.
    if (!import.meta.env.DEV || window.parent === window) return;
    function onMessage(e: MessageEvent) {
      // P4.15: same-origin guard — see main.tsx for the rationale.
      if (e.origin !== window.location.origin) return;
      const data = e.data as
        | { type?: string; toastPosition?: string }
        | null;
      if (!data || data.type !== 'eikon:set-variant') return;
      if (typeof data.toastPosition !== 'string') return;
      setPosition(data.toastPosition as Position);
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <SonnerToaster
      position={position}
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            'rounded-[var(--radius-md)] border-[length:var(--surface-border-width)] border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-card-foreground)] shadow-lg',
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

export { Toaster };
// eslint-disable-next-line react-refresh/only-export-components
export { toast };
