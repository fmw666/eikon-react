/**
 * @file build-worker.ts
 * @description Child-process entry that runs a single `viteBuild` against
 * a JSON-encoded options object passed on argv, then exits.
 *
 * Why a separate process? Vite's `build()` API has no AbortSignal — once
 * it starts walking an import graph, it cannot be cancelled cleanly from
 * the outside. The parent (`builder.ts`) imposes a `BUILD_TIMEOUT_MS`
 * ceiling, but in-process the only way to honour it was to abandon the
 * promise and let the orphan keep consuming RAM until the bundler
 * eventually finished or the process exited. On a 1 GB Fly machine, two
 * consecutive timeouts could OOM the box before LRU eviction caught up.
 *
 * This worker swaps that for kill semantics: the parent spawns it with
 * `child_process.spawn`, awaits exit, and on timeout sends `SIGTERM` then
 * `SIGKILL`. A killed process releases its viteBuild memory immediately
 * — no leak, no orphan.
 *
 * Invocation contract:
 *   node build-worker.js <json-encoded vite options>
 *
 * Exit codes:
 *   0  — viteBuild resolved successfully.
 *   1  — viteBuild rejected; the rejection's stack/message is printed to
 *        stderr first so the parent can forward it to the request error
 *        handler and surface it via /api/build-status.
 *   2  — argv parse failure (no JSON, malformed JSON). Operational bug;
 *        should never happen in production.
 *
 * The worker stays single-purpose: no caching, no template prep, no
 * post-build markers. The parent owns lifecycle (cache dir creation,
 * .build-ok marker, error map). A worker crash is just "this build
 * failed" — `runBuild`'s existing finally cleans the half-built dir.
 */

import { build as viteBuild } from 'vite';

async function main(): Promise<void> {
  const encoded = process.argv[2];
  if (!encoded) {
    console.error('build-worker: missing JSON config argv[2]');
    process.exit(2);
  }
  let options: Parameters<typeof viteBuild>[0];
  try {
    options = JSON.parse(encoded);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`build-worker: malformed JSON config: ${msg}`);
    process.exit(2);
  }
  try {
    await viteBuild(options);
    process.exit(0);
  } catch (e: unknown) {
    const msg = e instanceof Error ? (e.stack ?? e.message) : String(e);
    console.error(`build-worker: viteBuild failed: ${msg}`);
    process.exit(1);
  }
}

void main();
