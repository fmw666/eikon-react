/**
 * @file toaster.tsx
 * @description App-wide toast renderer (sonner) + `toast` API re-export.
 *
 * Mounted once near the root by `<AppProviders />`; everything else
 * fires events into it via the imperative `toast.*` helpers.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Third-party Libraries ---
import { Toaster as SonnerToaster, toast } from 'sonner';

// =================================================================================================
// Component
// =================================================================================================

function Toaster() {
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

export { Toaster };
// eslint-disable-next-line react-refresh/only-export-components
export { toast };
