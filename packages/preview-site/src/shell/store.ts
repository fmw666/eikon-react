import { useEffect } from 'react';
import { create } from 'zustand';

import { defaultState, type ParamState } from '@/lib/params-schema';
import { createParamsStore } from '@/lib/params-store';
import { parseFromQuery, serializeToQuery } from '@/lib/params-url';

/**
 * localStorage key holding the user's last-known param selection. We
 * keep it under a stable namespace (`eikon.params`) so future params
 * can be added to the shape without invalidating older selections —
 * unknown fields are ignored on read, defaults fill the gaps.
 */
const PARAMS_STORAGE_KEY = 'eikon.params';

/**
 * Read the persisted params blob from localStorage. Returns `null` on
 * any failure (missing entry, JSON corruption, storage disabled in
 * private mode, etc.) so the caller can fall back cleanly.
 *
 * Why not `parse` strictly: the schema is the source of truth and the
 * downstream `createParamsStore` already normalises against it
 * (cross-axis snap on platform, default infill). Trying to pre-validate
 * here would either duplicate the schema rules or reject perfectly
 * recoverable inputs — neither is worth the maintenance cost.
 */
function readStoredParams(): Partial<ParamState> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PARAMS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as Partial<ParamState>;
  } catch {
    return null;
  }
}

/**
 * Merge initial state from two sources, with the URL query taking
 * precedence so explicit deep-links always win over the user's saved
 * session. The store factory will further normalise the merged
 * partial against the schema (e.g. snap to platform defaults).
 *
 * Precedence:
 *   1. URL query (`?platform=mobile&design=…`) — deliberate user intent.
 *   2. localStorage              — last session continuity.
 *   3. Schema `defaultState()`   — pristine first visit.
 */
function resolveInitialParams(): Partial<ParamState> {
  const fromQuery = parseFromQuery(
    typeof window === 'undefined' ? '' : window.location.search
  );
  const fromStorage = readStoredParams() ?? {};
  // Storage as base, query overrides. Empty `fromQuery` simply
  // surfaces storage unchanged.
  return { ...fromStorage, ...fromQuery };
}

/**
 * Single shell-side store. The factory normalises the merged initial
 * (URL ∪ localStorage) against the schema's cross-axis rules before
 * mounting, so any stale combo (e.g. a saved `layout=sidebar` from
 * before the user later picked `platform=mobile`) snaps to a valid
 * platform default rather than rendering an invalid choice.
 */
export const useShellStore = createParamsStore(resolveInitialParams());

/**
 * Mirror store changes back into the parent window's URL bar (without adding
 * history entries). Lets users share/bookmark a configuration.
 *
 * NOTE: Mounted as a `null`-returning sibling (see `<UrlSync />`) so it can
 * subscribe to the entire `state` without forcing the rest of the shell
 * to re-render every time the user toggles a checkbox.
 */
function useSyncStateToUrl(): void {
  const state = useShellStore((s) => s.state);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const qs = serializeToQuery(state);
    const next = `${window.location.pathname}?${qs}`;
    if (window.location.search === `?${qs}`) return;
    window.history.replaceState(null, '', next);
  }, [state]);
}

/**
 * Mirror store changes into localStorage so a returning visitor lands
 * on the same configuration even without a saved URL. We deliberately
 * write the FULL state (not a diff against defaults) so a future
 * schema change that flips a default doesn't silently mutate the
 * user's intent — they'll keep their explicit value until they
 * actively reset it.
 *
 * Storage write failures (private mode, quota exceeded, etc.) are
 * swallowed; the URL mirror above is already a sufficient fallback
 * persistence channel.
 */
function useSyncStateToStorage(): void {
  const state = useShellStore((s) => s.state);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      // Avoid persisting the literal `defaultState()` on first mount
      // when the user hasn't touched anything yet — that would leave
      // a stale snapshot if the schema's defaults change.
      const isDefault = isDefaultState(state);
      if (isDefault) {
        window.localStorage.removeItem(PARAMS_STORAGE_KEY);
        return;
      }
      window.localStorage.setItem(
        PARAMS_STORAGE_KEY,
        JSON.stringify(state)
      );
    } catch {
      // ignore — URL still carries the same payload
    }
  }, [state]);
}

function isDefaultState(state: ParamState): boolean {
  const defaults = defaultState();
  for (const key of Object.keys(defaults) as (keyof ParamState)[]) {
    if (state[key] !== defaults[key]) return false;
  }
  return true;
}

/**
 * Isolation wrapper for the param-state mirror effects. Renders both
 * URL and localStorage sync side-by-side; mounted once at the page
 * root so the rest of the tree never sees re-renders triggered by
 * the full-state subscription.
 */
export function UrlSync(): null {
  useSyncStateToUrl();
  useSyncStateToStorage();
  return null;
}

// ---------------------------------------------------------------------------
// UI-only state (which side panels are open + which file is open in the
// editor). Lives in a separate store so toggling a panel never re-renders the
// params controls or the preview iframe.
// ---------------------------------------------------------------------------

/**
 * Three preset device-frame sizes, surfaced as a Toolbar segmented control
 * (only visible on `platform != 'web'`, where a frame actually renders).
 *
 *   - small:    iPhone SE (375 × 667)  /  laptop 13" (1024 × 640)
 *   - standard: iPhone 14 Pro (390 × 844)  /  desktop 1280 × 800  ← default
 *   - large:    iPhone Pro Max (430 × 932) /  monitor 1440 × 900
 *
 * Scaled this way (rather than 0.75x / 1x / 1.25x of a single base) so each
 * preset corresponds to a real physical reference device — designers can
 * pick "what does this look like on an SE" with one click instead of
 * eyeballing a percent.
 */
export type FrameSize = 'small' | 'standard' | 'large';

/**
 * Lifecycle of the cache-build pipeline as observed by the shell. Driven
 * by `PreviewFrame` (which owns the /api/build polling) and consumed by
 * `App.tsx`'s unified loading overlay.
 *
 *   - 'idle'     never fired a build yet (initial mount, pre any param).
 *   - 'building' a /api/build is in flight or being polled.
 *   - 'ready'    the build dist is on disk; we've published `currentHash`.
 *   - 'error'    the build failed; PreviewFrame surfaces the message.
 *
 * NOTE: 'ready' does NOT mean the iframe and file tree are visually
 * caught up — the panels still need to fetch their per-hash payloads
 * AFTER the build completes. The unified overlay reads
 * `iframeReadyHash` / `treeReadyHash` against `currentHash` to gate
 * itself off only when EVERY visible panel matches the current build.
 */
export type BuildStatus = 'idle' | 'building' | 'ready' | 'error';

// ---------------------------------------------------------------------------
// Unified loading-overlay gate
// ---------------------------------------------------------------------------

export interface LoadingGateInputs {
  buildStatus: BuildStatus;
  currentHash: string | null;
  iframeReadyHash: string | null;
  treeReadyHash: string | null;
  /** Whether the file-explorer panel is open. When closed the tree's
   *  per-hash IO is invisible and shouldn't gate the overlay. */
  showFiles: boolean;
}

export type OverlayMode = 'cold' | 'rebuild' | null;

/**
 * Pure decision function for the App-level loading overlay. Extracted
 * from `App.tsx` so the conditions can be unit-tested without mounting
 * React — this is the brain of the cross-panel coordination feature.
 *
 *   - `'cold'`     the user has never seen any iframe paint yet;
 *                  rendered as a soft light wash + "Building variant…".
 *   - `'rebuild'`  switching variants on top of an already-running
 *                  preview; rendered as a darker dim + "Rebuilding
 *                  variant…" because the prior content is still
 *                  underneath and we want it to read as stale.
 *   - `null`       no overlay should be shown.
 *
 * The cold/rebuild distinction is anchored on `iframeReadyHash` rather
 * than `currentHash` so we don't flicker the heavier copy onto a still-
 * blank panel the moment the build dist exists but before the iframe
 * has actually painted.
 */
export function computeOverlayMode(inputs: LoadingGateInputs): OverlayMode {
  const {
    buildStatus,
    currentHash,
    iframeReadyHash,
    treeReadyHash,
    showFiles,
  } = inputs;
  const isLoading =
    buildStatus === 'building' ||
    (currentHash !== null && iframeReadyHash !== currentHash) ||
    (showFiles && currentHash !== null && treeReadyHash !== currentHash);
  if (!isLoading) return null;
  return iframeReadyHash === null ? 'cold' : 'rebuild';
}

export interface UiStore {
  showFiles: boolean;
  showEditor: boolean;
  /** Path relative to the variant's cache dir, e.g. 'src/app/providers.tsx'. */
  selectedFile: string | null;
  /** Hash of the most recently READY preview build. The explorer & code view
   *  read against this so the tree always matches what's running in iframe. */
  currentHash: string | null;
  /**
   * Build pipeline status. Lifted out of `PreviewFrame` so the App-level
   * loading overlay can render across the whole `<main>` area instead of
   * being trapped inside the iframe panel.
   */
  buildStatus: BuildStatus;
  /** Last build error message, surfaced by the iframe panel when the
   *  pipeline failed. Cleared on the next successful build. */
  buildError: string | null;
  /**
   * Hash for which the FileExplorer has finished loading the file tree.
   * Diverges from `currentHash` during the brief window between a build
   * completing and the explorer's `/api/files?hash=…` fetch finishing —
   * which is the exact gap the unified overlay is meant to cover (the
   * file tree used to silently swap in stale-then-fresh content there).
   */
  treeReadyHash: string | null;
  /**
   * Hash for which the iframe has fired `onLoad`, i.e. its document has
   * actually parsed and the user is looking at fresh pixels. Same role
   * as `treeReadyHash` but for the preview pane: build-ready alone isn't
   * enough; we want to keep the overlay up until the iframe paints.
   */
  iframeReadyHash: string | null;
  /** Monotonically increasing counter. Bumping it forces PreviewFrame to
   *  remount the iframe — a cheap "reload the page in the preview" action
   *  that doesn't require the user to focus the iframe and hit Ctrl+R. */
  reloadKey: number;
  /** Active device-frame preset. Only consumed when the current platform
   *  renders a frame (mobile / desktop) — `web` ignores it entirely. */
  frameSize: FrameSize;
  /**
   * In-iframe navigation request from the Toolbar's quick-jump buttons.
   * `target` is the sub-route inside the previewed app (e.g. '/examples'),
   * NOT a full URL — PreviewFrame prefixes it with `/preview/<hash>/`.
   * `tick` is monotonic so clicking the SAME target twice still triggers
   * the effect (which is exactly what users expect — they want to "go to
   * Examples" even if they're already there but somehow lost it).
   */
  navRequest: { target: string; tick: number } | null;
  toggleFiles: () => void;
  toggleEditor: () => void;
  setShowFiles: (v: boolean) => void;
  setShowEditor: (v: boolean) => void;
  openFile: (relPath: string) => void;
  closeFile: () => void;
  setCurrentHash: (hash: string | null) => void;
  setBuildStatus: (status: BuildStatus, error?: string | null) => void;
  setTreeReadyHash: (hash: string | null) => void;
  setIframeReadyHash: (hash: string | null) => void;
  reloadPreview: () => void;
  /** Queue an in-iframe navigation; consumed once by PreviewFrame. */
  navigateInPreview: (target: string) => void;
  clearNavRequest: () => void;
  setFrameSize: (size: FrameSize) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  showFiles: false,
  showEditor: false,
  selectedFile: null,
  currentHash: null,
  buildStatus: 'idle',
  buildError: null,
  treeReadyHash: null,
  iframeReadyHash: null,
  reloadKey: 0,
  navRequest: null,
  frameSize: 'standard',
  // Files is the "parent" panel — the editor is meaningless without a way to
  // pick which file to open, so closing Files also collapses Editor, and
  // re-opening Files restores Editor iff there's a file still selected from
  // the prior session.
  toggleFiles: () =>
    set((s) => {
      const showFiles = !s.showFiles;
      return {
        showFiles,
        showEditor: showFiles ? s.showEditor || !!s.selectedFile : false,
      };
    }),
  toggleEditor: () => set((s) => ({ showEditor: !s.showEditor })),
  setShowFiles: (v) =>
    set((s) => ({
      showFiles: v,
      showEditor: v ? s.showEditor || !!s.selectedFile : false,
    })),
  setShowEditor: (v) => set({ showEditor: v }),
  openFile: (relPath) =>
    set({ selectedFile: relPath, showEditor: true }),
  // Symmetric: closing the file also collapses the editor panel. Leaving an
  // empty "(no file open)" placeholder feels broken vs. just hiding the
  // panel and reclaiming the space for the preview.
  closeFile: () => set({ selectedFile: null, showEditor: false }),
  setCurrentHash: (currentHash) => set({ currentHash }),
  setBuildStatus: (buildStatus, buildError = null) =>
    set({ buildStatus, buildError }),
  setTreeReadyHash: (treeReadyHash) => set({ treeReadyHash }),
  setIframeReadyHash: (iframeReadyHash) => set({ iframeReadyHash }),
  // Reloading is a user-initiated soft refresh of the SAME variant; the
  // dist on disk hasn't changed, so we deliberately do NOT clear
  // `iframeReadyHash` (it still equals `currentHash`). That keeps the
  // unified overlay quiet during reload — the iframe will flash a brief
  // browser-native blank while it remounts, but spamming a "Rebuilding…"
  // overlay would misrepresent what's happening (no rebuild took place).
  reloadPreview: () => set((s) => ({ reloadKey: s.reloadKey + 1 })),
  navigateInPreview: (target) =>
    set((s) => ({
      navRequest: { target, tick: (s.navRequest?.tick ?? 0) + 1 },
    })),
  clearNavRequest: () => set({ navRequest: null }),
  setFrameSize: (frameSize) => set({ frameSize }),
}));
