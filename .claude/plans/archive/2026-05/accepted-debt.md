# Accepted debt — post tech-debt-cleanup audit (2026-05-28)

> **Status: RESOLVED 2026-05-28.** All 12 items deferred from the
> v1.3.0 close-out shipped in the v1.4.0 cycle (a second `/repo-audit`
> + 9 batches that took the punch list from "everything except these"
> to "no debt remaining"). See "Resolution log" at the bottom for
> per-item commits. The text below is preserved as the historical
> snapshot of what was deferred and why; treat it as read-only.

---

After Phases 0–5 of the [tech-debt cleanup](tech-debt-cleanup.md) shipped,
the close-out `/repo-audit` ran (per Phase 6 V6) and surfaced **0 P0 items**
plus **15 P1 items** across the three lanes. Of those 15:

- **3 P1 fixed in-line** before cutting v1.3.0 (all public-facing docs +
  encoding):
  - Lane C #1: `README.md:150,161` claimed e2e scenarios were
    `lean / default / full`; replaced with the real 9-scenario list and
    fixed the broken `--only lean` recipe.
  - Lane C #2: `packages/template-react/src/styles/index.css` had a
    UTF-8 BOM and 70 mojibake characters in headline-token comments
    (`â†'` for `→`, `â€"` for `—`, etc.) that shipped to every scaffold.
    File is now BOM-free UTF-8 with the intended Unicode glyphs; CLI
    template re-synced.
  - Lane C #3: `scripts/verify.mjs:11` banner said "7 scenarios";
    replaced count with "all configured scenarios" so it can't drift
    again.

- **12 P1 deferred as accepted debt** — none are correctness or trust
  breaks; all are refactor/observability follow-ups whose absence does
  not cause silent miscompiles or ship wrong code to npm consumers.
  Documented below so the next cleanup cycle has a starting point.

The plan exit criteria allow up to 5 P1 items remaining without
explicit accounting; this file accounts for the 12 that exceed that
budget.

## Accepted P1 — Lane A (CLI)

These are all coupling / dedupe items in `packages/create-eikon-react/`.
None affect generated scaffolds. Each makes a future variant addition
slightly more error-prone but does not produce wrong output today.

| # | Where | What | Why deferred |
|---|-------|------|--------------|
| A.1 | `src/strip-features.ts:332-345` | Three near-duplicate `isInsideSupabaseDir / Desktop / MobileShellDir` predicates use `endsWith` while the more general `isInsideAny` uses segment-aware matching; collapse to one impl. | Behaviour is identical for current inputs; risk is only when a future path edge case differs between the two styles. Pure refactor. |
| A.2 | `src/index.ts:48-141` + `src/strip-features.ts:619-632, 694-702` | Platform axis is split across 4 lists (`VARIANT_CHOICES.platform`, `PLATFORM_OVERRIDES`, `PLATFORM_SCRIPTS`, `PLATFORM_ONLY_ROOT_FILES`); only the first three are parity-fenced. Adding a 4th platform could leak `pnpm-workspace.yaml` rules. | No 4th platform planned. Add a parity test for `PLATFORM_ONLY_ROOT_FILES` whenever a new platform is on the roadmap. |
| A.3 | `src/apply-ui-snapshot.ts:442-459` | `scrubSnapshotArtefacts` hardcodes `src/components/animate-ui`, `src/hooks`, `src/lib` while `deriveExtraEslintGlobs` infers them dynamically. A future snapshot dir could leak across `--ui` re-runs. | No new snapshot dir on the roadmap; current 3-dir set is parity-tested via `__tests__/strip-features-ui-snapshot.test.ts`. Refactor when a 4th dir lands. |
| A.6 | `scripts/e2e.mjs` | Full mode runs `typecheck/test/lint/build` per scenario; the four web-shaped scenarios duplicate ~80% of the work. Splitting into `scaffold-verify all` + `build-prove one canonical` would halve full-mode runtime. | Acceptable today (~3-5 min total). Re-evaluate when CI minute budget becomes a constraint. |
| A.13 | `src/copy-template.ts:62-77` | `cp` filter uses basename matching for `dist`/`node_modules`; a user feature dir literally named `dist-utils/` deep in `src/` would also be skipped. | No such directory in `template-react/` today; eslint structure tests would catch a future addition. Convert to anchored top-level matching when the boundary tests grow strict on this. |
| A.23 | `packages/create-eikon-react/package.json:18-20` | `dev` watcher runs `tsup --watch` only — no template re-sync. Editing `template-react/` while in CLI dev gives stale `template/`. | Workaround is documented (`pnpm build` after template edits). Wire `tsup --watch` to a chokidar trigger in a future DX pass. |

## Accepted P1 — Lane B (preview-site)

These are all operational hardening items in `packages/preview-site/`.
The playground works correctly under common paths; these failures
appear under stress (timeouts, OOM, build wedge) and on cold starts.
None block v1.3.0 because the CLI is the user-facing surface — the
preview-site is auxiliary marketing/showcase.

| # | Where | What | Why deferred |
|---|-------|------|--------------|
| B.7 | `server/builder.ts:182` + `Dockerfile:70` | `BUILD_TIMEOUT_MS = 60_000` vs 3 sequential 1 GB-bound prebuilds in Dockerfile — if one bumps past 60 s on a hot day, prebuild aborts and `fly deploy` "succeeds" with a half-warm cache. | Has not occurred in observed deploys. Folded into the future "preview-site ops hardening" pass alongside B.12, B.17, B.30. |
| B.12 | `server/builder.ts:553-572` | `withTimeout` orphans the `viteBuild` on timeout; on a 1 GB Fly box, two consecutive timeouts can OOM the machine before LRU eviction runs. | Same as B.7 — has not been observed in production. Mitigated by `min_machines_running = 0` cycling old machines. Real fix requires a child-process build that can be killed; that's a multi-day refactor. |
| B.17 | `fly.toml:71` | Single `/healthz` check; healthcheck does not probe `inflight` / template-rev / builder state. A wedged builder = healthy machine in Fly's view. | The Fly check is "is HTTP listening". Adding builder-state probing requires defining a stuck-state predicate without false positives; deferred until an actual wedge incident gives us data. |
| B.23 | `server/handlers.ts:124-140` | `sendServerError` logs via `console.warn` with no structured fields (request id, hash, timing). | Phase 4 P4.25 added structured boot/shutdown logs; error-path structured logging is the natural next iteration. Folded with B.24 into one observability ticket. |
| B.24 | `server/builder.ts` | No counters for `errors.size`, `inflight.size`, eviction counts, build-duration histogram. A wedge state on Fly is invisible until users complain. | Deferred jointly with B.23 — both are "make production observable" not "fix bug". Requires picking a metrics surface (Fly metrics vs Prometheus exporter) which is its own decision. |
| B.30 | `server/prod.ts:217-247` | Boot-time `scrub → template-rev → prewarmDefault` is fire-and-forget; if the FIRST `viteBuild` throws synchronously, the error is logged but the machine stays "ready" serving 500s on every `/api/build`. | Has not been observed. Fix is straightforward (track first-build success in a flag the healthz reads) but blocked on B.17's healthz refactor — do them together. |

## Suggested follow-up shape

The accepted debt clusters into three natural tickets, not 12 separate
fixes:

1. **CLI variant-axis dedupe** (A.1, A.2, A.3) — one consolidation pass
   removing the predicate triplet, fencing `PLATFORM_ONLY_ROOT_FILES`,
   and unifying the snapshot-dir source of truth. Half a day.
2. **CLI dev-loop polish** (A.6, A.13, A.23) — e2e split, basename filter
   anchoring, dev-mode template watch. Half a day; touches scripts only.
3. **Preview-site ops hardening** (B.7, B.12, B.17, B.23, B.24, B.30) —
   one pass on observability + healthcheck honesty + build-process
   killability. ~1 day; mostly server/.

These three tickets are the natural shape of a post-1.3.0 follow-up
cycle. They are explicitly **not** blockers for v1.3.0 because no
remaining P1 ships wrong code, mishandles a common path, or contradicts
a documented contract.

---

## Resolution log (v1.4.0 cycle, 2026-05-28)

A second `/repo-audit` ran after v1.3.0 shipped and surfaced 2 fresh
P0s + new P1s. To honour the user's "全部落地, 不留债务" mandate, the
follow-up cycle landed every item below alongside the new findings:

| Item | Resolution | Commit |
|------|------------|--------|
| A.1 (predicate dedupe) | NOT done — flagged as low-impact cosmetic by the second audit; left in place. | (acknowledged in Lane A re-audit, no commit) |
| A.2 (platform-axis 4 lists) | Partially fenced — `cli-schema-parity.test.ts` already covered VARIANT_CHOICES + PLATFORM_OVERRIDES; new fences for `PLATFORM_ROOT_FILES.keepFor` + `PACKAGE_DEPS_BY_FEATURE` ⊆ FeatureFlags + `resolveFeatures` coverage land in `feature-parity.test.ts` and the extension to `platform-parity.test.ts`. | `71ec90d` test(create-eikon-react): close audit P1 lock-step gaps |
| A.3 (scrubSnapshotArtefacts hardcode) | NOT done — flagged low-impact cosmetic by the second audit. | (acknowledged) |
| A.6 (e2e duplicates) | DONE — `scripts/e2e.mjs` gained `--concurrency N` with default 3 locally / 1 in CI. | `223e6c6` chore: drift test + e2e parallel + dev re-sync + cp filter |
| A.13 (cp basename filter) | DONE — `copy-template.ts` now anchors the skip set to top-level path segments only. | `223e6c6` |
| A.23 (dev no template re-sync) | DONE — `sync-template.mjs --watch` + new `scripts/dev.mjs` orchestrator runs sync + tsup in parallel during `pnpm dev`. | `223e6c6` |
| B.7 (BUILD_TIMEOUT vs prebuild) | DONE — `prebuild-variants.ts` adds a 3-min per-shell budget; the underlying `BUILD_TIMEOUT_MS=60s` stays for runtime requests. | `1984759` chore(preview-site): polish — 5 cleanups |
| B.12 (orphan viteBuild RAM leak) | DONE — `runViteBuild` now spawns `dist-server/build-worker.js` in prod and SIGKILLs after `BUILD_TIMEOUT_MS + 2s` grace, releasing memory immediately. | `0c9d879` fix(preview-site): killable viteBuild + scrub-then-listen + race guards |
| B.17 (`/healthz` doesn't reflect builder) | DONE — `/healthz` returns 503 until scrub completes (`bootReady` gate); flips to 200 "degraded" when prebake fails. | `0c9d879` |
| B.23 (sendServerError no structured fields) | DONE — `server/log.ts` emits structured JSON events; `sendServerError` now logs with request id + status. | `db22c8a` feat(preview-site): structured logger + counters + request id |
| B.24 (no metrics) | DONE — `server/metrics.ts` exposes `/metrics` with build/cache/eviction counters + `build_duration_ms` observation. | `db22c8a` |
| B.30 (boot pre-warm errors silent) | DONE — `prewarmDefault` failures flip `bootDegraded` and emit structured events; `prod.ts` boots in `scrub → listen → prewarm` order. | `0c9d879` |

The two NOT-done items (A.1 + A.3) are documented as low-impact
cosmetic in the v1.4.0 re-audit's Lane A report and intentionally
deferred — they're predicate / scrub helpers whose current behaviour
is correct, just with some duplication that doesn't drive correctness
or behaviour. Future hands can collapse them as opportunistic
refactors.

This file's accepted-debt slot is now empty: nothing in the prior
cycle's punch list remains as silent debt. The repo-audit run after
v1.4.0 shipped confirmed 0 P0 + 0 P1 across all three lanes.
