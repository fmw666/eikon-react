/**
 * @file vite-runner.ts
 * @description Runs a single `viteBuild` with a hard timeout, optionally in
 * a killable child process. Extracted from `builder.ts` so the build-cache
 * orchestration there isn't interleaved with process/timeout plumbing. This
 * module holds NO build-cache state — it's a pure "run this build, enforce
 * the ceiling" utility.
 */

import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, type ChildProcess } from 'node:child_process';

import { build as viteBuild } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * P4.5: Hard ceiling on a single viteBuild. The 1 GB Fly machine has been
 * observed to wedge for >10 min when the bundler enters a pathological
 * import graph; reject after this window so callers see an error instead
 * of hanging forever. Note: Vite has no AbortSignal, so the orphaned
 * build may continue consuming RAM in the background — the cache scrub
 * + LRU eviction cleans up the half-built dir on the next pass.
 */
export const BUILD_TIMEOUT_MS = 60_000;

/**
 * Path to the bundled `build-worker.js` next to `prod.js`. Resolved at
 * module load: in the prod image this resolves to `dist-server/build-worker.js`,
 * in dev (running TS source through Vite's loader) the file does not exist
 * and `runViteBuild` falls back to an in-process call. Auto-detection
 * keeps the dev story the same (no separate `tsup --watch` dance) while
 * letting prod inherit kill-on-timeout semantics for free.
 */
const BUILD_WORKER_PATH = path.resolve(__dirname, 'build-worker.js');
const USE_BUILD_WORKER = existsSync(BUILD_WORKER_PATH);
/**
 * Grace window between SIGTERM and SIGKILL. SIGTERM gives Vite a chance
 * to flush partial state; if the process is wedged on CPU, SIGKILL goes
 * out 2 s later. The choice of 2 s is conservative — viteBuild's only
 * meaningful response to SIGTERM is "exit fast", so a healthy build
 * exits well within this window.
 */
const BUILD_KILL_GRACE_MS = 2_000;

export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(
        new Error(
          `build timed out after ${(ms / 1000).toFixed(0)}s (hash=${label}). ` +
            `Vite has no AbortSignal so the orphaned build may continue ` +
            `running in the background until it completes or the process exits.`
        )
      );
    }, ms);
    // Don't keep the event loop alive solely for the timeout.
    timer.unref?.();
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Run a single viteBuild with a hard timeout. In production (when the
 * bundled `build-worker.js` exists next to this module) the call is
 * delegated to a child process so the timeout can SIGKILL a wedged
 * build — releasing its memory immediately, instead of leaving an
 * orphan running until it completes or the parent exits. In dev the
 * call stays in-process; the killability win is a prod concern and the
 * dev story should not require a separate tsup watcher.
 */
export async function runViteBuild(
  options: Parameters<typeof viteBuild>[0],
  hash: string
): Promise<void> {
  if (!USE_BUILD_WORKER) {
    await withTimeout(
      viteBuild(options).then(() => undefined),
      BUILD_TIMEOUT_MS,
      hash
    );
    return;
  }
  await runViteBuildSpawn(options, hash);
}

/**
 * Spawn `build-worker.js` to run viteBuild in a child process; SIGTERM
 * (then SIGKILL after `BUILD_KILL_GRACE_MS`) on timeout. The worker's
 * stdout/stderr is forwarded to the parent so build errors land in
 * `fly logs` next to the "[builder]" lines that already provide hash
 * context.
 *
 * `env: { ...process.env, NODE_ENV: 'development' }` is the load-bearing
 * detail: the parent runs with `NODE_ENV=production` (Fly config), but
 * the worker MUST see `development` so Vite's `import.meta.env.DEV`
 * evaluates to true in the produced bundle (see the module-level
 * comment on the older in-process global mutation). Passing the env
 * here scopes the override to just this child — no global pollution.
 */
async function runViteBuildSpawn(
  options: Parameters<typeof viteBuild>[0],
  hash: string
): Promise<void> {
  const json = JSON.stringify(options);
  const child: ChildProcess = spawn(
    process.execPath,
    [BUILD_WORKER_PATH, json],
    {
      stdio: ['ignore', 'inherit', 'inherit'],
      env: { ...process.env, NODE_ENV: 'development' },
    }
  );
  let killed = false;
  const timer = setTimeout(() => {
    killed = true;
    child.kill('SIGTERM');
    setTimeout(() => {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill('SIGKILL');
      }
    }, BUILD_KILL_GRACE_MS).unref?.();
  }, BUILD_TIMEOUT_MS);
  timer.unref?.();
  try {
    await new Promise<void>((resolve, reject) => {
      child.once('exit', (code, signal) => {
        if (killed || signal === 'SIGTERM' || signal === 'SIGKILL') {
          reject(
            new Error(
              `build worker killed after ${(BUILD_TIMEOUT_MS / 1000).toFixed(
                0
              )}s timeout (hash=${hash}, signal=${signal ?? 'SIGTERM'})`
            )
          );
          return;
        }
        if (code === 0) {
          resolve();
          return;
        }
        reject(
          new Error(
            `build worker exited with code ${code ?? 'null'} (hash=${hash}). ` +
              `See preceding stderr lines for the viteBuild rejection.`
          )
        );
      });
      child.once('error', (err) => reject(err));
    });
  } finally {
    clearTimeout(timer);
  }
}
