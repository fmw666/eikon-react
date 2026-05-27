Audit two things:

**(A) `packages/template-react/`** — source-of-truth template, synced into `packages/create-eikon-react/template/` at CLI build time and shipped in the npm tarball.

Look at:
- `src/features/*` (feature-first architecture)
- `src/shared/ui/*` (custom UI components — Radix-based)
- `src/main.tsx`, `src/App.tsx`, `src/styles/index.css`
- `.agent/rules/*` (AI agent rules — the README brags these are a key value prop)
- `.agent/skills/*` if present
- `package.json`, `tsconfig.json`, `vite.config.ts`, `tailwind.config.ts`, `eslint.config.js`
- `index.html` (variant injection target)
- `@eikon:variant(...)begin/end` markers throughout — used by strip-features in CLI

**(B) Cross-cutting / monorepo:**
- Root `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`
- `.github/workflows/*` (CI — what runs, what doesn't)
- `.claude/skills/*` (project skills)
- Repo-root `Dockerfile`, `fly.toml`
- Any `CLAUDE.md`
- `.gitignore`, version-bump strategy
- `pnpm verify` chain coverage; pre-commit hooks
- Documentation rot — README accuracy vs current behavior

Give a **prioritized punch list** of:
1. Template architectural — feature boundary leaks, inconsistent patterns, dead code, accessibility
2. AI-rules quality — outdated rules, contradictory guidance, missing rules for newly-added systems, naming inconsistencies (this is the headline value prop — drift here is the highest-impact item)
3. Variant marker hygiene — orphan begin/end pairs, files that should be variant-gated but aren't, confusing nested markers
4. Monorepo-level — missing CI gates, untested release paths, version drift, hooks that don't catch real issues
5. Docs drift — claims in README that no longer hold, stale agent rules, inconsistent capitalization
6. Security — exposed secrets risk, dep audit gaps, supply-chain hygiene (pnpm audit, lockfile-lint)

For each item: WHERE (file:line), WHAT in one line, SEVERITY (high/med/low). ~30 items max.

Don't write code. Report only. Under 1000 words.
