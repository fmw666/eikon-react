/**
 * @file toaster.tsx
 * @description Thin pass-through wrapper around sonner's `Toaster`.
 *
 * All visual defaults (`richColors`, `closeButton`, `toastOptions.classNames`)
 * AND the `position` prop flow in from `src/app/providers.tsx`. This file
 * exists only to (a) re-export the imperative `toast` helper under a
 * stable `@/shared/ui/toaster` alias and (b) accept any future
 * `ToasterProps` overrides via spread.
 *
 * Why the pass-through model: under `--ui shadcn` / `--ui animate-ui` the
 * CLI replaces this file with a registry-fetched copy at scaffold time
 * (see `apply-ui-snapshot.ts`). Those upstream copies are 1:1 from the
 * shadcn / animate-ui registries and likewise spread `...props` to
 * Sonner. Keeping the same shape here means the same provider-side
 * wiring works for every `--ui` choice.
 *
 * Callers keep their import stable:
 *
 *     import { Toaster, toast } from '@/shared/ui/toaster';
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Third-party Libraries ---
import { toast, Toaster as SonnerToaster, type ToasterProps } from 'sonner';

// =================================================================================================
// Component
// =================================================================================================

function Toaster(props: ToasterProps) {
  return <SonnerToaster {...props} />;
}

// =================================================================================================
// Exports
// =================================================================================================

export { Toaster };
// eslint-disable-next-line react-refresh/only-export-components
export { toast };
