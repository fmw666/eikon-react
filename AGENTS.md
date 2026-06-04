# AGENTS.md

Monorepo entrypoint for AI agents. This file orients you across the **three
packages**; the canonical conventions live in `docs/` and in the template's own
`.agent/` protocol — read those before editing.

## The three packages (pnpm workspace)

| Package | npm name | Role | You'll mostly edit it for |
| --- | --- | --- | --- |
| `packages/template-react` | `@eikon/react` (private) | **Source of truth** — the React 19 app shipped to users, annotated with `@eikon:variant/feature` strip markers. | Template features, UI, conventions. |
| `packages/create-eikon-react` | `create-eikon-react` (public) | **CLI** published to npm. Bundles a synced copy of the template and runs the strip engine on the user's machine. | Scaffolding / strip-engine logic. |
| `packages/preview-site` | `@eikon/preview` (private) | **Playground** — reads the template live and runs the strip engine on demand. Internal; ships nothing to users. | Playground UX / build server. |

`packages/create-eikon-react/template/` and `template-snapshots/` are
**generated** from `template-react` at build time (via
`scripts/sync-ui-snapshots.mjs` + the build) — **never edit them by hand**.
`packages/template-react/.preview-cache/` is a gitignored build artifact (full
template copies); never edit or commit it.

## Dev environment & commands

Requirements: Node `>=20.10`, pnpm `>=9` (`packageManager: pnpm@9.12.0`). Run
`pnpm install` once at the root.

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev the template (`@eikon/react`). |
| `pnpm preview:dev` | Dev the playground (`@eikon/preview`) on **port 3100**. |
| `pnpm build` | Build all packages (`-r --filter=./packages/*`). |
| `pnpm build:cli` / `build:template` / `build:preview` | Build one package. |
| `pnpm test` | Run every package's Vitest suite. |
| `pnpm typecheck` | `tsc` across all packages (strict everywhere). |
| `pnpm lint` | ESLint across all packages (`--max-warnings 0`). |
| `pnpm verify:fast` / `verify:pr` / `verify:full` | Tiered gates (`scripts/verify.mjs`). `verify:fast` = typecheck + lint + test + lockfile. |
| `pnpm e2e` / `e2e:quick` / `e2e:pr` | CLI end-to-end scaffolding scenarios. |
| `pnpm audit:design` | Design-token / class validity audit. |
| `pnpm format` | Prettier over `packages/*/{src,__tests__}`. |
| `pnpm cli` | Run the `create-eikon-react` CLI locally. |

**Git hooks** (`simple-git-hooks`): pre-commit runs
`scripts/check-no-preview-cache.mjs` (blocks committing `.preview-cache/`);
pre-push runs `pnpm verify:fast`. Don't bypass them.

## Conventions (read before editing)

- **Template work** (`template-react`): the rules in
  [`packages/template-react/.agent/rules/`](packages/template-react/.agent/rules/)
  are **non-negotiable**. They are numerically ordered:
  `00-architecture`, `10-react-conventions`, `20-tailwind-v4`, `30-testing`,
  `40-state-management`, `50-ui-axis`, `60-i18n`, `70-commit-style`,
  `80-quality-system`, `90-platform-targets`.
- **Playground work** (`preview-site`): see
  [`packages/preview-site/.agent/rules/`](packages/preview-site/.agent/rules/)
  for its module boundaries and size budget.
- **Hard prohibitions** are catalogued, grep-verifiable, in
  [docs/proposed-rules.md](docs/proposed-rules.md) (`PR-NNN` for the template,
  `PR-PV-NNN` for preview-site). Every entry has a backticked pattern you can
  `rg` for; a clean tree returns zero matches.
- **`.agent/` protocol** spec: [docs/agent-protocol.md](docs/agent-protocol.md).
  Architecture: [docs/architecture.md](docs/architecture.md).
  Platform targets: [docs/platform-targets.md](docs/platform-targets.md).
  Quality system: [docs/quality-system.md](docs/quality-system.md).

### Per-package layout

- **`template-react` is feature-first.** `src/app/` (shell: providers, router,
  layouts), `src/features/<name>/` (one dir per capability, each with its own
  `components/ hooks/ stores/ services/ pages/ types.ts index.ts __tests__/`),
  `src/shared/` (cross-feature primitives), `src/styles/` (Tailwind v4 entry).
  Three import boundaries are **lint-enforced** via `import/no-restricted-paths`:
  1. a feature may not import another feature's internals — go through
     `@/features/<name>` (its `index.ts` barrel);
  2. `src/shared/` must not import from `src/features/`;
  3. `src/app/` imports a feature only through its barrel or `routes.tsx`.
  When you extract internals out of a large file, keep them **internal** — do
  not add them to the feature's `index.ts` barrel unless other features need them.
- **`create-eikon-react`** is a flat `src/` (CLI + strip engine) plus `scripts/`
  and the generated `template/` + `template-snapshots/` payload.
- **`preview-site`** is `src/shell/` (editor/preview UI), `src/landing/`
  (marketing + playground sections), `src/lib/`, `server/` (Node build server),
  `src/styles/`. `server/` and `lib/` are leaf-level; `shell/` must not reach
  into `landing/`.

### Stack & state

React 19 + Vite + TypeScript (strict). **One library per concern** — do not
introduce alternatives (the `PR-NNN` catalog enforces this):

- Client state: **Zustand**. Server state: **TanStack Query** + a service layer
  over `fetch`. No redux/jotai/mobx/recoil (PR-010); no axios/got/ky (PR-011).
- Animation: **`motion`** only — import from `motion/react`, never
  `framer-motion` (PR-020/021). Toasts: **Sonner** via `@/shared/ui/toaster`
  (PR-022). Forms: react-hook-form + zod.
- Styling: **Tailwind v4** (CSS-first; there is no `tailwind.config`). i18n keys
  are namespaced by feature.

## Testing

Vitest in all three packages (happy-dom; opt-in browser mode in `template-react`;
Supabase is mocked). Tests must stay green, **including the 12
`packages/template-react/__tests__/structure/` scan tests**, which statically
enforce the architecture:

`app-shell`, `apps-shape`, `boundary-imports`, `feature-i18n-parity`,
`feature-public-api`, `feature-shape`, `marker-balance`, `repo-root-files`,
`shared-shape`, `src-root`, `styles-shape`, `tests-root`.

Each feature owns its tests in `<feature>/__tests__/` mirroring the source
layout; mock at the **service** boundary, not feature internals. Cross-cutting
tests live in each package's root `__tests__/`.

## Workflow & releases

- Before pushing, run `pnpm verify:fast` (the pre-push hook does this).
- Commit style: **Conventional Commits** (`feat:`, `fix:`, `docs:`,
  `refactor:`, `chore:`, `ci:`); see
  [rules/70-commit-style](packages/template-react/.agent/rules/70-commit-style.md).
- Cut a `create-eikon-react` release via the `/release-decision` skill.

## Common pitfalls

- **Never hand-edit** `create-eikon-react/template/` or `template-snapshots/` —
  they are generated from `template-react`. Edit the source, then re-sync.
- **Never commit** `.preview-cache/` (the pre-commit hook blocks it).
- Don't add a second library for a concern that already has one — check the
  `PR-NNN` catalog first; the prohibition is also lint/test enforced.
- Don't bypass the feature barrel; `import/no-restricted-paths` will fail the build.
- There is **no** `tailwind.config` — Tailwind v4 is configured in CSS.
