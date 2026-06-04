/**
 * @file sim-cache.ts
 * @description LRU caches in front of the strip simulator
 * (`simulate-strip.ts`). The `/api/files-tree` + `/api/file-content`
 * handlers are input-driven and cache-decoupled from the build cache
 * (Phase F): they take the raw 6-tuple of params and memoise the
 * simulated tree / file content keyed on that tuple. The only
 * invalidation lever is a template-rev change, which the watcher drives
 * via `clearSimTreeCache()`.
 *
 * Module-level state (the two Maps) is fine — the dev plugin and prod
 * server each instantiate one process.
 */

import { DEFAULT_INPUTS } from './builder';

export interface SimInputs {
  platform: string;
  supabase: boolean;
  pm: string;
  design: string;
  layout: string;
  ui: string;
  toastPosition: string;
}

export function readSimInputs(url: URL): SimInputs {
  const q = url.searchParams;
  return {
    platform: q.get('platform') ?? DEFAULT_INPUTS.platform,
    supabase: q.get('supabase') === 'true',
    pm: q.get('pm') ?? DEFAULT_INPUTS.pm,
    design: q.get('design') ?? DEFAULT_INPUTS.design,
    layout: q.get('layout') ?? DEFAULT_INPUTS.layout,
    ui: q.get('ui') ?? DEFAULT_INPUTS.ui,
    toastPosition: q.get('toastPosition') ?? DEFAULT_INPUTS.toastPosition,
  };
}

export function simKey(inputs: SimInputs): string {
  // Stable order — JSON.stringify on an object literal preserves
  // insertion order, and TS `interface` fields land in declaration order.
  return JSON.stringify(inputs);
}

/** LRU cache on the simulated tree response. Entries are tiny
 *  (POSIX paths in an array → on the order of 100KB even for the full
 *  template) and the only invalidation lever is template-rev change,
 *  which the watcher / fingerprint flow already drives. We simply drop
 *  every entry whenever the watcher sees a template change.
 *
 *  P4.12: Implemented as Map-with-bump for true LRU semantics.
 *  Map preserves insertion order; deleting and re-setting on hit
 *  bumps the entry to the most-recent position so the eviction step
 *  (drop the FIRST key) actually drops the LEAST-recently-used. */
const simTreeCache = new Map<string, string[]>();
const SIM_TREE_CACHE_MAX = 32;

export function readSimTree(key: string): string[] | undefined {
  const v = simTreeCache.get(key);
  if (v !== undefined) {
    // Bump on hit: re-insert so this key is now newest.
    simTreeCache.delete(key);
    simTreeCache.set(key, v);
  }
  return v;
}

export function rememberSimTree(key: string, tree: string[]): void {
  // Same delete-then-set pattern even on first insert — keeps the bump
  // path identical and means there's a single code path that maintains
  // ordering.
  simTreeCache.delete(key);
  simTreeCache.set(key, tree);
  if (simTreeCache.size > SIM_TREE_CACHE_MAX) {
    const oldest = simTreeCache.keys().next().value as string | undefined;
    if (oldest) simTreeCache.delete(oldest);
  }
}

/**
 * P4.13: file-content cache. Same key strategy as simTreeCache plus
 * the relative path. Users opening the same file across rapid param
 * changes (common: clicking through 3-4 design presets to compare
 * `index.css`) hit this cache instead of re-running the per-file
 * regex strip + fs read. Entries are individual file contents (≤a
 * few KB each), so MAX=128 keeps total cache size bounded ≪1MB.
 *
 * `null` is cached too (file legitimately stripped under these
 * inputs) to prevent the same param/path from re-walking the strip
 * decision repeatedly.
 */
const simContentCache = new Map<string, string | null>();
const SIM_CONTENT_CACHE_MAX = 128;

export function simContentKey(inputs: SimInputs, relPath: string): string {
  return `${simKey(inputs)} ${relPath}`;
}

export function readSimContent(key: string): string | null | undefined {
  if (!simContentCache.has(key)) return undefined;
  const v = simContentCache.get(key) ?? null;
  simContentCache.delete(key);
  simContentCache.set(key, v);
  return v;
}

export function rememberSimContent(key: string, value: string | null): void {
  simContentCache.delete(key);
  simContentCache.set(key, value);
  if (simContentCache.size > SIM_CONTENT_CACHE_MAX) {
    const oldest = simContentCache.keys().next().value as string | undefined;
    if (oldest) simContentCache.delete(oldest);
  }
}

/**
 * Invalidate the simulator's tree + content caches. Called by the dev
 * plugin's file watcher when template-react changes; production never
 * hits this because the template is baked into the image.
 */
export function clearSimTreeCache(): void {
  simTreeCache.clear();
  simContentCache.clear();
}
