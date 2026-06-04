import { type ParamsStore } from '@/lib/params-store';

export type BuildStatus = 'ready' | 'building' | 'error';

export interface BuildState {
  hash: string;
  status: BuildStatus;
  error?: string;
}

export interface BuildInputs {
  platform: string;
  supabase: boolean;
  pm: string;
  design: string;
  layout: string;
  ui: string;
  toastPosition: string;
}

/**
 * Runtime playground snapshot. Holds the axes the running iframe actually
 * consumes via postMessage — `design` / `ui` (CSS class on `<html>`),
 * `layout` (LayoutVariantContext), `toastPosition` (Toaster).
 *
 * `platform` doesn't live here either: platform-specific behaviour is
 * gated at scaffold time by `@eikon:variant(platform=…)` strip markers
 * (see `90-platform-targets.md`). For the playground we keep all
 * platform variants alive in a single max-capability shell via
 * `keepAllVariants`, and the device chrome (web / desktop / mobile) is
 * driven by a separate shell-side store selector — there's no class /
 * data attribute to push into the iframe.
 *
 * `pm` and `supabase` similarly don't ride this channel — they only
 * drive the file-tree / package.json simulator endpoints, which
 * subscribe to the store directly from CodeView / FileExplorer.
 */
export interface RuntimeVariantInputs {
  design: string;
  ui: string;
  layout: string;
  toastPosition: string;
}

/**
 * Static portion of the build inputs. Every axis here is either runtime
 * (design / layout / toastPosition flow through postMessage on the
 * already-built bundle) or shell-only (platform / supabase / pm don't
 * affect the iframe bundle — they drive simulator endpoints / chrome).
 *
 * `ui` is the exception: post-Phase J it bakes different `src/shared/ui/*`
 * snapshots into the bundle, so cycling it MUST trigger a fresh
 * `/api/build`. We keep it out of this constant and pull it from the
 * store inside the component.
 */
export const PREVIEW_BUILD_INPUTS_BASE = {
  platform: 'web',
  supabase: true,
  pm: 'pnpm',
  design: 'default',
  layout: 'stacked',
  toastPosition: 'top-right',
} as const;

/**
 * Project a `ParamsStore` snapshot down to the runtime-switchable axes.
 * Identity-stable for the same reason as the old build-input selector:
 * `useShallow` compares the returned shape, so a fresh closure here
 * would re-render on every store change.
 */
export function selectRuntimeVariants(s: ParamsStore): RuntimeVariantInputs {
  return {
    design: String(s.state.design),
    ui: String(s.state.ui),
    layout: String(s.state.layout),
    toastPosition: String(s.state.toastPosition),
  };
}
