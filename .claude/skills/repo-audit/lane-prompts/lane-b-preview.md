Audit the `packages/preview-site/` package. It's a Vite playground that lets users tweak scaffold variants (`design`, `layout`, `toastPosition`, `ui`, etc.) and live-preview the result in an iframe. Deployed to Fly.io.

Most relevant files:
- `src/shell/PreviewFrame.tsx` (iframe shell, postMessage protocol, build trigger)
- `server/builder.ts` (LRU-cached vite builds keyed on inputs hash)
- `server/hash.ts` (cache key derivation; CACHE_SCHEMA_VERSION)
- `server/simulate-strip.ts` (simulates the CLI's strip-features for the file-tree panel)
- `server/handlers.ts`, `server/prod.ts`, `server/dev.ts`
- `server/fingerprint.ts` (template-rev caching)
- `scripts/prebuild-variants.ts` (warm cache)
- `src/lib/params-schema.ts`, `src/lib/store.ts`
- `vite.config.ts`, `tsup.config.ts`, root `Dockerfile`, root `fly.toml`
- `package.json`

Context: `ui` is now in the build hash (CACHE_SCHEMA_VERSION=5). `keepAllVariants` no longer includes `ui`.

Give a **prioritized punch list** of:
1. Architectural — boundary violations, cache key correctness risks, shared-state pitfalls between server/builder.ts and the iframe, postMessage protocol weaknesses
2. Performance — build cache effectiveness, cold-start vs warm-start, memory leaks, bundle size in the iframe shell
3. Bugs / fragility — race conditions in build queueing, cache invalidation gaps, Fly machine restart behavior, DNS health checks
4. DX — slow inner loop, hot-reload gotchas, simulator-vs-real-strip divergence
5. Production-readiness — observability (logs, metrics), error reporting, what breaks if a build fails mid-stream

For each item: WHERE (file:line), WHAT in one line, SEVERITY (high/med/low). ~30 items max.

Don't write code. Report only. Under 800 words.
