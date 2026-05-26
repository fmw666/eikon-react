/**
 * @file LayoutVariantContext.tsx
 * @description Runtime dispatch for the `layout` axis.
 *
 * In the unstripped template (workspace dev, playground iframe) all
 * seven sibling layouts coexist on disk; this Context picks which one
 * `RootLayout` mounts. After CLI strip, only one layout file remains
 * AND the consumer (`<RootLayout />`) collapses to a single arm of its
 * dispatch table — the Context still works but only ever resolves to
 * that one entry, so it costs essentially nothing in the shipped
 * scaffold.
 *
 * The provider also subscribes to the playground's `eikon:set-variant`
 * postMessage so the shell can swap layouts without an iframe remount.
 * Standalone `pnpm dev` skips the listener (gated by `DEV` + iframe
 * detection) so production scaffolds drop the bridge entirely.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

/**
 * The set of layout variant names the template ships. Mirrors the
 * `layout` axis values in `packages/preview-site/src/lib/params-schema.ts`.
 * After CLI strip only one of these is reachable, but typing them all
 * here keeps the dispatcher generic.
 */
export type LayoutVariant =
  | 'stacked'
  | 'sidebar'
  | 'topbar-sidebar'
  | 'centered'
  | 'mobile-drawer'
  | 'bottom-tabs'
  | 'bottom-tabs-fab';

interface LayoutVariantContextValue {
  variant: LayoutVariant;
  setVariant: (next: LayoutVariant) => void;
}

const LayoutVariantContext = createContext<LayoutVariantContextValue | null>(
  null
);

/**
 * Read the initial layout from `<html data-layout="...">` (CLI scaffold
 * stamps this) and fall back to `'stacked'` — the schema default — when
 * absent (workspace dev or pre-Phase-I scaffolds).
 */
function readInitialVariant(): LayoutVariant {
  if (typeof document === 'undefined') return 'stacked';
  const v = document.documentElement.dataset.layout;
  return (v && (v as LayoutVariant)) || 'stacked';
}

interface LayoutVariantProviderProps {
  children: ReactNode;
  initial?: LayoutVariant;
}

function LayoutVariantProvider({
  children,
  initial,
}: LayoutVariantProviderProps) {
  const [variant, setVariant] = useState<LayoutVariant>(
    () => initial ?? readInitialVariant()
  );

  const handleSetVariant = useCallback((next: LayoutVariant) => {
    setVariant(next);
  }, []);

  useEffect(() => {
    // Production scaffold shipped by CLI: this whole block is dropped by
    // Rollup once `import.meta.env.DEV` evaluates `false`. Standalone
    // `pnpm dev` (template not in iframe): same — the second check skips
    // the bind so the listener doesn't accumulate handlers.
    if (!import.meta.env.DEV || window.parent === window) return;
    function onMessage(e: MessageEvent) {
      const data = e.data as { type?: string; layout?: string } | null;
      if (!data || data.type !== 'eikon:set-variant') return;
      if (typeof data.layout !== 'string') return;
      setVariant(data.layout as LayoutVariant);
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <LayoutVariantContext.Provider
      value={{ variant, setVariant: handleSetVariant }}
    >
      {children}
    </LayoutVariantContext.Provider>
  );
}

/**
 * Read the active layout variant. Throws if used outside a
 * `<LayoutVariantProvider>` so tests catch missing wrappers early.
 */
function useLayoutVariant(): LayoutVariant {
  const ctx = useContext(LayoutVariantContext);
  if (!ctx)
    throw new Error('useLayoutVariant must be used inside LayoutVariantProvider');
  return ctx.variant;
}

export { LayoutVariantProvider, useLayoutVariant };
