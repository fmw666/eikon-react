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

export interface UiStore {
  showFiles: boolean;
  showEditor: boolean;
  /** Path relative to the variant's cache dir, e.g. 'src/app/providers.tsx'. */
  selectedFile: string | null;
  /** Hash of the most recently READY preview build. The explorer & code view
   *  read against this so the tree always matches what's running in iframe. */
  currentHash: string | null;
  /** Monotonically increasing counter. Bumping it forces PreviewFrame to
   *  remount the iframe — a cheap "reload the page in the preview" action
   *  that doesn't require the user to focus the iframe and hit Ctrl+R. */
  reloadKey: number;
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
  reloadPreview: () => void;
  /** Queue an in-iframe navigation; consumed once by PreviewFrame. */
  navigateInPreview: (target: string) => void;
  clearNavRequest: () => void;
}

export const useUiStore = create<UiStore>((set) => ({
  showFiles: false,
  showEditor: false,
  selectedFile: null,
  currentHash: null,
  reloadKey: 0,
  navRequest: null,
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
  reloadPreview: () => set((s) => ({ reloadKey: s.reloadKey + 1 })),
  navigateInPreview: (target) =>
    set((s) => ({
      navRequest: { target, tick: (s.navRequest?.tick ?? 0) + 1 },
    })),
  clearNavRequest: () => set({ navRequest: null }),
}));
