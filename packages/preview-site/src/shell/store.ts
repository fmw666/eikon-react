import { useEffect } from 'react';
import { create } from 'zustand';

import { createParamsStore } from '@/lib/params-store';
import { parseFromQuery, serializeToQuery } from '@/lib/params-url';

/**
 * Single shell-side store. Initialised from the parent window's location.search
 * so that deep-linking a particular variant combination works out of the box.
 */
export const useShellStore = createParamsStore(
  parseFromQuery(typeof window === 'undefined' ? '' : window.location.search)
);

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
 * Isolation wrapper for `useSyncStateToUrl`. Render once at the App root.
 */
export function UrlSync(): null {
  useSyncStateToUrl();
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
  // Auto-open the editor when the user picks a file from the tree — most of
  // the time the panel is closed and clicking should "do the obvious thing".
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
