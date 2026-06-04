/**
 * Internal to the builder. Build-concurrency tunable, split out so both the
 * build pipeline (`builder-run.ts`) and the test hooks (`builder.ts`) can read
 * it without a dependency cycle.
 *
 * P4.6: At most this many distinct viteBuild calls run at once. Each
 * peaks around 600 MB resident; two parallel = ~1.2 GB which already
 * brushes the 1 GB Fly cap, so the third caller waits in the queue
 * (still reported as `building` to the client). Same-hash callers
 * always share one inflight build via the `inflight` map, so this cap
 * only kicks in when a user cycles `ui` or templateRev pumps a new
 * hash while another build is still running.
 */
export const BUILD_CONCURRENCY = 2;
