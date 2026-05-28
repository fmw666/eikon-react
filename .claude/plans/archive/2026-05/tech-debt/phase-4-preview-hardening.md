# Phase 4 — Preview-site Hardening

## Goal

Harden the playground server so single requests can't OOM the 1GB Fly
machine, the build cache can recover from corruption, and prod has
real observability. Most items are bounded fixes — none requires a
re-architecture. The phase is large (29 items) because preview-site
accumulated the most "TODO eventually" debt during Phase J.

## Dependencies

- Phase 0 (CI), Phase 2 (simulate-strip drift test from P2.7).

## Items

### Cache integrity (P4.1 – P4.4)

#### P4.1 — Pre-warm all 3 `ui` values

| | |
|--|--|
| **Where** | `packages/preview-site/scripts/prebuild-variants.ts:20-28` |
| **What** | Hardcodes `ui:'animate-ui'`. Cold visitors selecting `shadcn` or `custom` pay 5-15s viteBuild on the 1GB machine. |
| **How** | Iterate `['custom', 'shadcn', 'animate-ui']` in the prewarm loop. Other axes stay default. Three warm builds take ~30s at boot but are amortized across all visitors. |
| **Verify** | After deploy, first request for each `ui` value returns in <500ms (cache hit). |

#### P4.2 — Cache integrity marker

| | |
|--|--|
| **Where** | `packages/preview-site/server/builder.ts:168` (`isReady`) |
| **What** | Only checks `dist/index.html` exists. If a previous build was killed mid-write (Fly SIGTERM at 10s cap), the dir survives with stale `index.html` + missing chunks → iframe 404s. |
| **How** | After a successful build, write `dist/.build-ok` with a timestamp. `isReady` requires both `index.html` AND `.build-ok` present. On startup, scan the cache root and delete any `dist/` lacking `.build-ok`. |
| **Verify** | Force-kill the server during a build (SIGKILL the process). Restart. Confirm the half-written cache dir is purged on boot, not served. |

#### P4.3 — `MAX_CACHED_HASHES` 3 → 6

| | |
|--|--|
| **Where** | `packages/preview-site/server/builder.ts:143` |
| **What** | With `ui` now in the hash, 3 ui values × any in-flight rebuild on a template edit forces eviction of an in-use hash. |
| **How** | Bump to 6 (3 ui × 2 buffer for in-flight rebuilds). Memory cost: ~6 × ~10MB = 60MB extra peak. Acceptable on a 1GB machine when the alternative is user-visible 404s. |
| **Verify** | Cycle ui values rapidly in the playground, confirm no rebuilds for hashes that were ready 1 minute ago. |

#### P4.4 — Fix LRU eviction race

| | |
|--|--|
| **Where** | `packages/preview-site/server/builder.ts:299-339` (`evictCacheLru`) |
| **What** | Reads `inflight.keys()` snapshot, but a new build that starts AFTER `keep` is computed but BEFORE `rm()` runs is unprotected. On Windows the `copyTree` of an active build can race with a sibling `rm`. |
| **How** | Take a mutex over the cache root for the eviction operation. New builds wait on the mutex (cheap — eviction is fast). Alternatively, track active builds in a set and re-check before each `rm`. The retry budget (5 × 100ms) at `builder.ts` papers over this; replace with the mutex. |
| **Verify** | Stress test: spawn 10 concurrent builds with mid-flight evictions, no `rm` failures. |

### Build queue & limits (P4.5 – P4.8)

#### P4.5 — Build timeout

| | |
|--|--|
| **Where** | `packages/preview-site/server/builder.ts:363-462` (`runBuild`) |
| **What** | No abort/timeout. A stuck `viteBuild()` blocks the per-hash slot indefinitely, leaves `inflight` set forever. |
| **How** | Wrap `viteBuild` in `Promise.race` with a 60s timeout. On timeout, `inflight.delete(hash)`, write the error to the error map (with TTL per P4.7), and surface a `503` to the client. |
| **Verify** | Inject a sleep into `viteBuild`, confirm the 60s timeout fires and subsequent requests get a clear "build timeout" error rather than hanging. |

#### P4.6 — Build concurrency cap

| | |
|--|--|
| **Where** | `packages/preview-site/server/builder.ts` (new top-level semaphore) |
| **What** | N distinct hashes can spawn N parallel `viteBuild()`, each ~600-700MB peak. With `fly.toml` hard-limit 100 requests, a small ui cycle + template edit can OOM. |
| **How** | Top-level semaphore with capacity 2 (one Fly machine has 1GB; two parallel ~600MB builds is the safe ceiling). Builds beyond the cap queue. The semaphore counts include the timeout from P4.5 so a stuck build doesn't permanently consume capacity. |
| **Verify** | Spawn 5 distinct-hash builds simultaneously, observe two run, three queue. Memory stays under 1.4GB peak (fly machine has overhead). |

#### P4.7 — Build error-map TTL

| | |
|--|--|
| **Where** | `packages/preview-site/server/builder.ts:192-193` |
| **What** | Returns cached error forever (until template change clears it). A transient OOM permanently bricks that hash. |
| **How** | Each error-map entry stores `{error, expiresAt}`. On read, if `now > expiresAt`, drop the entry and let the next request retry. TTL: 5 minutes for transient errors; for syntax/build errors that are deterministic, the next template-rev clears them anyway. |
| **Verify** | Inject a transient error (e.g., simulated disk-full), wait 5 min, confirm next request rebuilds successfully. |

#### P4.8 — Reduce `NODE_ENV='development'` scope

| | |
|--|--|
| **Where** | `packages/preview-site/server/builder.ts:38` |
| **What** | Process-wide mutation in production. Any third-party lib that branches on `NODE_ENV` (React's dev-only paths in template runtime, vite plugins) silently misbehaves. |
| **How** | Pass `mode: 'development'` directly to `viteBuild` config instead of mutating `process.env`. If vite genuinely needs `NODE_ENV` set, scope it with `try { setNodeEnv('development'); await viteBuild(...) } finally { restoreNodeEnv() }` per build. |
| **Verify** | Outside a build invocation, `process.env.NODE_ENV === 'production'` in prod. |

### API limits & caching (P4.9 – P4.13)

#### P4.9 — `/api/build` body size limit

| | |
|--|--|
| **Where** | `packages/preview-site/server/handlers.ts:72-86` (`readJsonBody`) |
| **What** | Accumulates `chunks[]` unbounded. A POST with a huge body OOMs the machine. |
| **How** | Track total bytes; reject with `413 Payload Too Large` if >64KB (build inputs are tiny — kilobytes max). |
| **Verify** | `curl -X POST /api/build --data @bigfile` returns 413, server stays up. |

#### P4.10 — Pre-warm template-rev on boot

| | |
|--|--|
| **Where** | `packages/preview-site/server/builder.ts:184`, `packages/preview-site/server/fingerprint.ts:24, 57-70` |
| **What** | First `/api/build` triggers a full template walk (cached after that, but the first request blocks on it). |
| **How** | Call `getTemplateRev()` during `prewarmDefault` so the first user request never sees the cold path. |
| **Verify** | Time first `/api/build` after boot; should be <100ms higher than subsequent requests, not seconds. |

#### P4.11 — Replace `/api/template-rev` poll with longer interval or SSE

| | |
|--|--|
| **Where** | `packages/preview-site/src/shell/PreviewFrame.tsx:305, 522-555` |
| **What** | Polls every 2s indefinitely from every open tab. 10 visible iframes hit the server 5 req/s for HMR poll. |
| **How (option A)** | Increase poll interval to 30s in production, keep 2s in dev. Toggle via `import.meta.env.DEV`. **Option B (more work)**: SSE endpoint that pushes on template-rev change. |
| **Recommendation** | Option A. Production users don't edit templates — so 30s poll is fine. Dev-mode 2s poll keeps HMR snappy. |
| **Verify** | Open the playground in production, network tab shows /api/template-rev every 30s not 2s. |

#### P4.12 — `SIM_TREE_CACHE` true LRU

| | |
|--|--|
| **Where** | `packages/preview-site/server/handlers.ts:262-269` |
| **What** | Insertion-order eviction; active keys aren't refreshed on hit, so frequently-used trees can be evicted before stale ones. |
| **How** | On hit, delete-and-re-set the entry to move it to the end of the Map's iteration order. (Map iteration follows insertion order; this is the canonical LRU pattern.) |
| **Verify** | Unit test: insert 32 entries, hit entry 1, insert entry 33. Entry 1 should survive, entry 2 should be evicted. |

#### P4.13 — Cache `/api/file-content`

| | |
|--|--|
| **Where** | `packages/preview-site/server/handlers.ts:337-389` |
| **What** | `simulateStripFileContent` re-walks for every file-content request, no caching. |
| **How** | Add a `Map<string, string>` cache keyed on `(templateRev, inputs-hash, relPath)`. Size cap 64 entries. Invalidate on template-rev change. |
| **Verify** | Open a file, switch tabs, switch back — second request hits cache (network tab shows <5ms vs initial ~50ms). |

### Iframe & client (P4.14 – P4.19)

#### P4.14 — Iframe `sandbox` attribute

| | |
|--|--|
| **Where** | `packages/preview-site/src/shell/PreviewFrame.tsx:791-809` |
| **What** | No `sandbox` attribute. Same-origin is fine for trust, but a buggy template author writing `top.location = ...` can break out of the playground. |
| **How** | Add `sandbox="allow-scripts allow-same-origin allow-forms allow-popups"`. Test that the existing template features (theme toggle, sign-in modal) still work. |
| **Verify** | Inject `top.location.href = 'about:blank'` into a template page, confirm the playground shell stays put. |

#### P4.15 — postMessage origin verification

| | |
|--|--|
| **Where** | `packages/preview-site/src/shell/PreviewFrame.tsx:451-460, 509-518` |
| **What** | Outbound `postMessage(..., '*')` leaks variant snapshots to any window the iframe redirects to. |
| **How** | Replace `'*'` with `window.location.origin` (same-origin is the contract). The inbound check at `:432` already verifies `event.source === iframeRef.current.contentWindow`, so the outbound is the remaining hole. |
| **Verify** | Functionality unchanged. Network/console: no warnings. |

#### P4.16 — `ScaledShellWrapper` ResizeObserver throttle

| | |
|--|--|
| **Where** | `packages/preview-site/src/shell/PreviewFrame.tsx:250-267` |
| **What** | Recreates RO on natural-size change without throttling; fast device toggle storms `setScale` re-renders. |
| **How** | Wrap the `setScale` callback in `requestAnimationFrame` deduplication: schedule at most one rAF per frame. |
| **Verify** | Rapidly toggle device size, profiler shows ≤60 `setScale` calls/sec instead of hundreds. |

#### P4.17 — `readIframeSubUrl` validates hash format

| | |
|--|--|
| **Where** | `packages/preview-site/src/shell/PreviewFrame.tsx:298` |
| **What** | Regex strips first segment only. If a hash with non-hex chars sneaks in, substring leaks `/preview/<hash>` into the sub-route. |
| **How** | Match `/^\/preview\/[0-9a-f]{6,64}\//` strictly; if it doesn't match, skip the strip. Keep the existing path otherwise. |
| **Verify** | Manual: navigate to `/preview/INVALID/foo`, sub-URL handling treats it as no-prefix. |

#### P4.18 — `waitForVisible` cleanup on tab close

| | |
|--|--|
| **Where** | `packages/preview-site/src/shell/PreviewFrame.tsx:326-340` |
| **What** | Each abandoned promise keeps a `visibilitychange` listener; over a long session they accumulate. |
| **How** | Return a cleanup function that removes the listener; call it from the `useEffect` cleanup that owns the promise. |
| **Verify** | Open and close the playground tab repeatedly, devtools event listener panel shows stable count. |

#### P4.19 — Strip stack from client error responses

| | |
|--|--|
| **Where** | `packages/preview-site/server/builder.ts:198`, `packages/preview-site/server/handlers.ts:166-169, 186-189` |
| **What** | Returns raw stack to the iframe → renders in `PlaygroundErrorOverlay`. Exposes server filesystem paths. |
| **How** | Server logs full stack with `console.error(err)`. Response to client carries `{message: err.message}` only — no stack, no paths. The overlay continues to render `message`. |
| **Verify** | Trigger an error, server log has full stack, browser network response only has the message. |

### Bundle & assets (P4.20 – P4.22)

#### P4.20 — Iconify chunk split from landing icons

| | |
|--|--|
| **Where** | `packages/preview-site/vite.config.ts:53-58` |
| **What** | `iconify` chunk co-bundles `landing/icons.ts`. Anyone hitting just `/playground` pays the landing-page icon registry cost. |
| **How** | Two chunks: `iconify-core` (the icon engine) and `iconify-landing` (just landing's registry). Manual chunks split by import path. |
| **Verify** | Bundle analyzer shows playground load skips `iconify-landing` chunk. |

#### P4.21 — CodeMirror per-language splits

| | |
|--|--|
| **Where** | `packages/preview-site/package.json:24-28`, `packages/preview-site/vite.config.ts` |
| **What** | 5 language packs as direct deps, all bundled into one `codemirror` chunk. Opening any file loads all languages. |
| **How** | Replace with dynamic imports keyed on file extension. The CodeMirror loader reads `relPath`, imports only the matching language pack on demand. |
| **Verify** | First file open loads ~50KB language chunk; subsequent same-language files reuse it. |

#### P4.22 — Dockerfile `COPY` cache reuse

| | |
|--|--|
| **Where** | repo-root `Dockerfile:57` |
| **What** | `COPY . .` busts cache on any source change, including unrelated files. |
| **How** | Split into staged COPYs: lockfile + workspace files first (cache layer A), `packages/template-react/` (layer B, changes less often), `packages/preview-site/` last (layer C, changes most). |
| **Verify** | Edit `packages/preview-site/src/App.tsx` only — Docker build re-uses A and B, only re-builds C. |

### Deploy & ops (P4.23 – P4.27)

#### P4.23 — Dockerfile prune devDependencies

| | |
|--|--|
| **Where** | repo-root `Dockerfile:50-55` |
| **What** | Header justifies keeping full `node_modules` for runtime `viteBuild()`, but devDependencies (playwright, vitest, @vitest/browser) ship to Fly. ~120MB per machine. |
| **How** | Two-step prune: keep vite, rollup, esbuild, the template's runtime deps, and explicitly remove `@playwright/*`, `playwright`, `vitest`, `@vitest/*`, `@codemirror/*` dev tooling that's not used by the runtime build. Use `pnpm prune --prod` then `pnpm install --filter=...` to put back the surgical set vite needs. |
| **Verify** | `du -sh /app/node_modules` in the runtime image drops by >100MB. Cold-start time improves measurably. |

#### P4.24 — `fly.toml` cold-start grace tuning

| | |
|--|--|
| **Where** | repo-root `fly.toml:67-70` |
| **What** | `grace_period=30s`. With only `ui=animate-ui` pre-baked (until P4.1 lands), first request for a non-default URL on a cold machine can blow the grace. |
| **How** | After P4.1 lands (all 3 ui values pre-baked), 30s should be safe. Bump to 45s as a safety margin. |
| **Verify** | Force a cold-start by destroying and recreating the machine; first request returns within grace. |

#### P4.25 — Structured logging with request IDs

| | |
|--|--|
| **Where** | `packages/preview-site/server/prod.ts:59-61`, `packages/preview-site/server/handlers.ts` |
| **What** | `console.log` with one prefix. No request IDs, no build duration, no cache hit/miss counters. |
| **How** | Add a thin `log({level, msg, ...meta})` helper that emits one JSON line per call (newline-delimited JSON, suitable for Fly's log shipper). Each request gets a `req_id = crypto.randomUUID()` attached to all log lines for that request. Add metrics for cache hits, build duration, eviction count, error rate. |
| **Verify** | `fly logs -a eikon-react-preview` shows JSON lines; a single request's logs are correlatable via `req_id`. |

#### P4.26 — `scheduleEviction` surfaces errors

| | |
|--|--|
| **Where** | `packages/preview-site/server/builder.ts:258-263` |
| **What** | Swallows errors silently. A permission error during eviction never surfaces. |
| **How** | `catch` logs via the new structured logger from P4.25. `evictionInflight` reset stays. |
| **Verify** | Deliberately make `cache/` unwriteable, eviction logs an error visibly. |

#### P4.27 — `HEALTHCHECK` suppresses warnings

| | |
|--|--|
| **Where** | repo-root `Dockerfile:93-94` |
| **What** | Node 20 emits `ExperimentalWarning` on bare fetch in some configs, polluting health logs. |
| **How** | Add `--no-warnings` to the node invocation in HEALTHCHECK. |
| **Verify** | `docker logs <container>` shows no ExperimentalWarning lines. |

### Misc (P4.28 – P4.29)

#### P4.28 — `params-store` reset platform default

| | |
|--|--|
| **Where** | `packages/preview-site/src/lib/params-store.ts:63` |
| **What** | Reset doesn't re-snap to platform default. Calling reset with non-`web` platform stored elsewhere produces a momentarily impossible state. |
| **How** | Reset writes back the canonical defaults from `params-schema.ts` for every axis, including platform. |
| **Verify** | Manual: switch to mobile, click reset, confirm UI returns to web defaults. |

#### P4.29 — Iframe `src` query stamp drift documented

| | |
|--|--|
| **Where** | `packages/preview-site/src/shell/PreviewFrame.tsx:723-735` |
| **What** | Reads `runtimeVariantsRef.current` but excludes deps; comment acknowledges intentional. But if `lastReadyHash` flips while user has a stale variant, the stamped HTML and postMessage diverge for one frame. |
| **How** | Document the one-frame divergence in the comment with a one-line mitigation note: "the postMessage that follows on the next message tick aligns the divergence; do not race against this in tests." |
| **Verify** | Comment clearly states the trade-off so a future maintainer doesn't try to "fix" what's intentional. |

## Phase exit criteria

- [ ] All 29 items committed
- [ ] Spawning 10 concurrent builds doesn't OOM the machine (max 2 run, rest queue)
- [ ] Build timeout fires at 60s for stuck builds
- [ ] Cold-start (no warm cache) → first request for any of 3 `ui` values returns <500ms
- [ ] `fly logs` shows structured JSON with request IDs
- [ ] Dockerfile image size drops by >100MB
- [ ] Iframe sandbox attribute prevents top-frame escape
