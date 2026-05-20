/**
 * @file landing/changelog/store.ts
 * @description Tiny zustand store dedicated to the Changelog page.
 *
 * SCOPE
 *
 *   - `baseTag`, `headTag`     — the two refs the user is comparing
 *                                (left = older, right = newer). Persisted
 *                                to localStorage so coming back to the
 *                                changelog tab keeps the previous compare.
 *   - `selectedFile`           — which file path is open in the right
 *                                pane's diff viewer. Reset whenever the
 *                                base/head pair changes (a stale path
 *                                might not exist in the new compare).
 *
 * EXPLICITLY OUT OF SCOPE
 *
 *   - The releases list itself, and the compare data, live in
 *     `use-changelog-data.ts` as React state — they're per-mount,
 *     async, and already cached at the network layer (see lib/github.ts).
 *     Mirroring them here would only add invalidation rules without
 *     buying anything.
 *   - We deliberately keep this store separate from `shell/store.ts`
 *     (playground UI) to avoid coupling — the playground's `useUiStore`
 *     is build-pipeline state, not GitHub-versioning state.
 */

import { useEffect } from 'react';
import { create } from 'zustand';

/**
 * localStorage key for the user's last compare pair. Versioned so a
 * future schema change (e.g. supporting "compare against a branch")
 * can bulk-invalidate without leaking partial reads.
 */
const STORAGE_KEY = 'eikon.changelog.selection.v1';

interface PersistedSelection {
  baseTag: string | null;
  headTag: string | null;
}

function readPersisted(): PersistedSelection {
  if (typeof window === 'undefined') return { baseTag: null, headTag: null };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { baseTag: null, headTag: null };
    const parsed = JSON.parse(raw) as Partial<PersistedSelection>;
    return {
      baseTag: typeof parsed.baseTag === 'string' ? parsed.baseTag : null,
      headTag: typeof parsed.headTag === 'string' ? parsed.headTag : null,
    };
  } catch {
    return { baseTag: null, headTag: null };
  }
}

interface ChangelogStore {
  baseTag: string | null;
  headTag: string | null;
  selectedFile: string | null;
  /**
   * Set both tags atomically. Used by the bootstrap effect that picks
   * sensible initial values from the releases list (e.g. "current
   * release" vs "previous release") AND by `swap` to flip them.
   */
  setPair: (baseTag: string | null, headTag: string | null) => void;
  setBaseTag: (tag: string | null) => void;
  setHeadTag: (tag: string | null) => void;
  /** Flip base ↔ head — handy for "I picked them backwards" moments. */
  swap: () => void;
  setSelectedFile: (path: string | null) => void;
}

export const useChangelogStore = create<ChangelogStore>((set, get) => {
  const initial = readPersisted();
  return {
    baseTag: initial.baseTag,
    headTag: initial.headTag,
    selectedFile: null,
    setPair: (baseTag, headTag) => {
      const prev = get();
      // Reset the open file when the compare pair changes — the path
      // probably doesn't exist in the new compare, and showing a stale
      // diff would be misleading.
      const fileNeedsReset =
        prev.baseTag !== baseTag || prev.headTag !== headTag;
      set({
        baseTag,
        headTag,
        selectedFile: fileNeedsReset ? null : prev.selectedFile,
      });
    },
    setBaseTag: (tag) =>
      set((s) => ({
        baseTag: tag,
        selectedFile: tag === s.baseTag ? s.selectedFile : null,
      })),
    setHeadTag: (tag) =>
      set((s) => ({
        headTag: tag,
        selectedFile: tag === s.headTag ? s.selectedFile : null,
      })),
    swap: () =>
      set((s) => ({
        baseTag: s.headTag,
        headTag: s.baseTag,
        selectedFile: null,
      })),
    setSelectedFile: (path) => set({ selectedFile: path }),
  };
});

/**
 * Mirror the {base, head} pair to localStorage so the next visit
 * reopens the same comparison. `selectedFile` is intentionally NOT
 * persisted — its value depends on a successful compare fetch, which
 * we don't want to assume on cold start.
 *
 * Mounted as a `null`-returning sibling so it can subscribe to the
 * full state without forcing re-renders elsewhere.
 */
export function ChangelogPersistSync(): null {
  const baseTag = useChangelogStore((s) => s.baseTag);
  const headTag = useChangelogStore((s) => s.headTag);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (!baseTag && !headTag) {
        window.localStorage.removeItem(STORAGE_KEY);
        return;
      }
      const blob: PersistedSelection = { baseTag, headTag };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(blob));
    } catch {
      // ignore — non-fatal
    }
  }, [baseTag, headTag]);
  return null;
}
