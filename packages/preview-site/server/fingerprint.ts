import { createHash, type Hash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import { TEMPLATE_COPY_SKIP } from '../../create-eikon-react/src/skip-list';

/**
 * "Template revision" — a short content hash of every file we copy into the
 * per-variant build dir. Mixing this into the cache key gives us automatic
 * invalidation: when a developer edits anything inside template-react/, the
 * next /api/build call computes a different rev → different hash → cold
 * rebuild, while previously-built dirs simply become orphans on disk.
 *
 * The result is cached in-memory; `invalidate()` should be called from the
 * dev server's file watcher whenever a watched file changes.
 */

// MUST hash exactly the same entries the builder copies, otherwise editing
// a watched file would either leave a stale cacheDir on disk (wrong
// fingerprint → no rebuild) or burn rebuilds for changes the build doesn't
// actually see. We literally reuse the CLI's skip set so the two cannot drift.
const FINGERPRINT_SKIP = TEMPLATE_COPY_SKIP;

let cached: string | null = null;
let pending: Promise<string> | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const INVALIDATE_DEBOUNCE_MS = 80;

export function invalidateTemplateRev(): void {
  cached = null;
}

/**
 * Coalesce a burst of file-watcher events into a single invalidation. When
 * a developer saves multiple files quickly (e.g. format-on-save touching
 * ~10 files in one IDE action), this turns N invalidations into 1.
 *
 * Callers (typically the dev-server watcher) can pass an optional callback
 * that runs ONCE per coalesced burst — handy for things like clearing the
 * per-hash file-tree cache or wiping stale error entries.
 */
export function scheduleInvalidateTemplateRev(onFlush?: () => void): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    invalidateTemplateRev();
    onFlush?.();
  }, INVALIDATE_DEBOUNCE_MS);
}

/** Sync getter — returns null if the rev hasn't been computed yet. */
export function peekTemplateRev(): string | null {
  return cached;
}

export async function getTemplateRev(templateDir: string): Promise<string> {
  if (cached) return cached;
  if (pending) return pending;
  pending = (async () => {
    try {
      const rev = await computeRev(templateDir);
      cached = rev;
      return rev;
    } finally {
      pending = null;
    }
  })();
  return pending;
}

async function computeRev(dir: string): Promise<string> {
  const hasher = createHash('sha256');
  await walk(dir, dir, hasher);
  return hasher.digest('hex').slice(0, 12);
}

async function walk(root: string, dir: string, hasher: Hash): Promise<void> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  // Sort for deterministic ordering across platforms/file systems.
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (FINGERPRINT_SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(root, full, hasher);
    } else if (entry.isFile()) {
      const rel = path.relative(root, full).replace(/\\/g, '/');
      let buf: Buffer;
      try {
        buf = await readFile(full);
      } catch {
        continue;
      }
      hasher.update(rel);
      hasher.update('\0');
      hasher.update(buf);
      hasher.update('\0');
    }
  }
}
