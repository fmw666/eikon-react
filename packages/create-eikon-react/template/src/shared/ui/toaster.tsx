/**
 * @file toaster.tsx
 * @description Single design-driven Toaster built on sonner. Styling is
 * derived from the active design preset via CSS tokens (--color-card,
 * --color-border, --surface-border-width, etc.) — no separate files per
 * design. The user only selects the toast *position* at scaffold time via
 * the `--toast-position` CLI flag; the `@eikon:variant(toastPosition=...)`
 * markers below narrow to the chosen value at strip time.
 *
 * Callers keep their import stable:
 *
 *     import { Toaster, toast } from '@/shared/ui/toaster';
 */

// =================================================================================================
// Imports
// =================================================================================================

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

const POSITION = [
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
].at(0)! as Position;

// =================================================================================================
// Component
// =================================================================================================

function Toaster() {
  return (
    <SonnerToaster
      position={POSITION}
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
