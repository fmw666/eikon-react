# AGENTS.md — `create-eikon-react` (the published CLI)

Package-local briefing for the public npm CLI that scaffolds an Eikon React app.
Repo-wide conventions live in the root `AGENTS.md`; this file covers what is
specific to **this package**. (Cross-refs: root `AGENTS.md`, `docs/architecture.md`.)

## What this package is

The `create-eikon-react` binary copies a curated template into a target dir, then
**strips** the feature/platform code the user opted out of, rewrites the package
manager, and (optionally) installs deps + inits git. `src/index.ts` → `dist/index.js`
is the published entry (`bin`).

## The template/ mirror invariant (read before editing template/)

- `template/` and `template-snapshots/` are **generated, not hand-authored**.
  `pnpm build` runs `scripts/sync-template.mjs` (mirrors `packages/template-react`
  into `template/`) **then** `tsup` (bundles `src/`).
- ❌ Never hand-edit `template/**` — edits belong in `packages/template-react`, then
  re-sync. A stray edit here is silently overwritten on the next build.
- These globs are declared in the repo's `.vibe-riskrc.json` (`generatedGlobs` /
  `dataAssetGlobs`) so they're excluded from health/size metrics. Keep them there.

## Source map (`src/`)

| Area | Files |
|------|-------|
| Orchestration | `index.ts`, `cli-prompts.ts`, `resolve-target.ts`, `validate.ts` |
| Copy + strip | `copy-template.ts`, `skip-list.ts`, `strip-features.ts`, `prune.ts` |
| Rewrite/inject | `rewrite-package-manager.ts`, `inject-html-variants.ts`, `apply-ui-snapshot.ts` |
| Side effects | `init-git.ts`, `install-deps.ts`, `spawn-collect.ts` (shared spawn/stderr plumbing) |

## The parity-test fence (don't weaken it)

The strip engine and the template must stay in lockstep. The `src/__tests__/` suite
is the structural fence that guarantees it — treat a failure as a real defect, not a
test to relax:

- `cli-schema-parity` / `platform-parity` / `feature-parity` / `skip-list-parity` —
  CLI options, platforms, and skip-lists match the template's actual shape.
- `ui-snapshot-parity` / `apply-ui-snapshot` / `design-class-validity` /
  `no-orphan-tokens` — UI snapshots and design tokens stay valid after a strip.
- `strip-features-*` — the strip engine's per-feature/per-platform behavior.

## Conventions

- TypeScript **strict**, **zero `any`**, zero `@ts-ignore`. `as` is allowed only for
  genuine file/template-string narrowing.
- `pnpm lint` runs `eslint --max-warnings 0`; `pnpm typecheck`, `pnpm test` (vitest),
  `pnpm e2e:quick` (scaffolds real temp projects) gate `prepublishOnly`.
- Keep shipped `src/` files cohesive; build/e2e tooling lives in `scripts/`.
