import { getTemplateRev } from './fingerprint';
import { hashBuildInputs, type BuildInputs } from './hash';
import { logEvent } from './log';
import { incr, observe } from './metrics';

import { isReady, TEMPLATE_REACT_DIR } from './builder-paths';
import {
  capErrors,
  errors,
  ERROR_TTL_MS,
  inflight,
  MAX_CACHED_HASHES,
  MAX_RETAINED_ERRORS,
} from './builder-state';
import { scheduleEviction } from './builder-eviction';
import { runBuildGated } from './builder-run';
import { BUILD_CONCURRENCY } from './builder-config';
import { BUILD_TIMEOUT_MS } from './vite-runner';

// Re-exported verbatim so `builder.ts`'s public import path is unchanged.
// The implementations live in cohesive internal sibling modules.
export {
  TEMPLATE_REACT_DIR,
  UI_SNAPSHOTS_ROOT,
  DEFAULT_INPUTS,
  getCacheDir,
  getDistDir,
  isReady,
} from './builder-paths';
export {
  getError,
  clearError,
  clearAllErrors,
  clearAllCache,
  touchHashServed,
} from './builder-state';
export {
  scrubHalfBuiltCacheDirs,
  selectHashesToEvict,
  type DirStat,
} from './builder-eviction';

export type BuildStatus = 'ready' | 'building' | 'error';

export interface BuildState {
  hash: string;
  status: BuildStatus;
  error?: string;
}

/**
 * Look up (or start) the build for `inputs`. Returns immediately with the
 * current state; callers should poll `isReady(hash)` (or hit the matching
 * /api/build-status endpoint) until they see `ready`.
 *
 * Multiple concurrent requests for the same hash share one inflight build.
 */
export async function ensureBuild(inputs: BuildInputs): Promise<BuildState> {
  const templateRev = await getTemplateRev(TEMPLATE_REACT_DIR);
  const hash = hashBuildInputs(inputs, templateRev);

  if (isReady(hash)) {
    incr('cache_hit');
    return { hash, status: 'ready' };
  }

  // A previous attempt errored; surface the failure instead of silently
  // retrying — UNLESS the error has aged past ERROR_TTL_MS, in which
  // case we let a fresh attempt run (P4.7). Callers can also clear
  // errors via clearError(hash) for an immediate retry.
  const prevErr = errors.get(hash);
  if (prevErr) {
    if (Date.now() - prevErr.at < ERROR_TTL_MS) {
      incr('cache_error_replay');
      return { hash, status: 'error', error: prevErr.message };
    }
    errors.delete(hash);
  }

  if (!inflight.has(hash)) {
    incr('cache_miss');
    const startedAt = Date.now();
    logEvent('build_started', { hash });
    const promise = runBuildGated(hash, inputs)
      .then(() => {
        const duration_ms = Date.now() - startedAt;
        incr('build_completed');
        observe('build_duration_ms', duration_ms);
        logEvent('build_completed', { hash, duration_ms });
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? (e.stack ?? e.message) : String(e);
        errors.set(hash, { message: msg, at: Date.now() });
        capErrors();
        const duration_ms = Date.now() - startedAt;
        // Distinguish a timeout-kill from a genuine failure for at-a-glance
        // grep-ability. The `kill` signal is included by `runViteBuildSpawn`'s
        // rejection message; a tighter contract would be a typed error.
        const isTimeout = msg.includes('timed out') || msg.includes('killed');
        incr(isTimeout ? 'build_timeout' : 'build_failed');
        logEvent('build_failed', {
          hash,
          duration_ms,
          timeout: isTimeout,
          error_message: e instanceof Error ? e.message : String(e),
        });
      })
      .finally(() => {
        inflight.delete(hash);
        // Schedule LRU eviction off the request path; serialised so multiple
        // overlapping builds don't trip over each other on the filesystem.
        scheduleEviction();
      });
    inflight.set(hash, promise);
  }

  return { hash, status: 'building' };
}

/**
 * Test-only escape hatch for the error map. The error cap is enforced by
 * a non-exported `capErrors()`; this lets tests prime the map and assert
 * the cap is honoured without going through the build flow.
 *
 * @internal — do NOT import from production code paths.
 */
export const __testHooks = {
  capErrors,
  setError(hash: string, msg: string): void {
    errors.set(hash, { message: msg, at: Date.now() });
  },
  countErrors(): number {
    return errors.size;
  },
  clearErrors(): void {
    errors.clear();
  },
  MAX_RETAINED_ERRORS,
  MAX_CACHED_HASHES,
  ERROR_TTL_MS,
  BUILD_TIMEOUT_MS,
  BUILD_CONCURRENCY,
};
