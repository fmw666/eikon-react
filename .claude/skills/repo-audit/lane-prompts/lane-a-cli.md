Audit the `packages/create-eikon-react/` package in this monorepo. This is a published npm CLI (`create-eikon-react`) that scaffolds React apps. The most relevant files:
- `src/index.ts` (entry, parseArgs, scaffold flow)
- `src/strip-features.ts` (variant strip logic)
- `src/apply-ui-snapshot.ts` (copies pre-baked UI library snapshots into the project at scaffold time)
- `src/inject-html-variants.ts`, `src/skip-list.ts`, `src/copy-tree.ts`, `src/copy-template.ts`
- `src/init-git.ts`, `src/install-deps.ts`
- `scripts/sync-template.mjs`, `scripts/e2e.mjs`, `scripts/smoke.mjs`, `scripts/sync-ui-snapshots.mjs`
- `template-snapshots/{shadcn,animate-ui}/` (pre-baked UI lib snapshots)
- `__tests__/` for unit tests
- `package.json`, `tsup.config.ts`, `tsconfig.json`

Context: `--ui {custom,shadcn,animate-ui}` is a real source-file swap (not a CSS class toggle). Snapshots are committed under `template-snapshots/`.

Give a **prioritized punch list** of:
1. Architectural issues — coupling, duplication, missing abstractions, complexity hot-spots
2. Optimization opportunities — slow scripts, fragile CI flows, missing caching, redundant work
3. Code smells / risks — places likely to break silently (e.g., new variant added but a marker forgotten), platform-specific bugs (Win+POSIX), tests with weak coverage
4. DX issues — friction in build → test → publish, confusing names, stale docs/comments

For each item: WHERE (file:line), WHAT in one line, SEVERITY (high/med/low). Cap at ~30 items, prioritized.

Skip: stylistic preferences. Skip: items already in TODO/FIXME comments unless load-bearing.

Don't write code. Report only. Under 800 words.
