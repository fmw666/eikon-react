# AGENTS.md

Monorepo entrypoint for AI agents. This file orients you across the **three
packages**; the canonical conventions live in `docs/` and in the template's own
`.agent/` protocol — read those before editing.

## The three packages (pnpm workspace)

| Package | Role | You'll mostly edit it for |
| --- | --- | --- |
| `packages/template-react` (`@eikon/react`) | **Source of truth** — the React 19 app shipped to users, with `@eikon:variant/feature` strip markers. | Template features, UI, conventions. |
| `packages/create-eikon-react` | **CLI** published to npm. Bundles a synced copy of the template and strips it on the user's machine. | Scaffolding / strip-engine logic. |
| `packages/preview-site` (`@eikon/preview`) | **Playground** — reads the template live, runs the strip engine on demand. Internal; ships nothing to users. | Playground UX / build server. |

`packages/create-eikon-react/template/` is **generated** from `template-react`
at build time — never edit it by hand.

## Conventions (read before editing)

- **Template work** (`template-react`): the rules in
  [`packages/template-react/.agent/rules/`](packages/template-react/.agent/rules/)
  are **non-negotiable** (architecture, state, UI, i18n, testing, …). The
  feature-first layout + import boundaries are explained in
  [docs/architecture.md](docs/architecture.md).
- **Hard prohibitions** are catalogued, grep-verifiable, in
  [docs/proposed-rules.md](docs/proposed-rules.md) (`PR-NNN`).
- **`.agent/` protocol** spec: [docs/agent-protocol.md](docs/agent-protocol.md).
  Platform targets: [docs/platform-targets.md](docs/platform-targets.md).
  Quality system: [docs/quality-system.md](docs/quality-system.md).
- **preview-site / create-eikon-react** are *not* feature-first — each has its
  own internal structure (`shell/` + `landing/` + `server/`, and `src/` resp.).
  Match the package you're in.

## Workflow

- Dev the template: `pnpm dev`. Dev the playground: `pnpm preview:dev` (port 3100).
- Before pushing, run `pnpm verify:fast` (the pre-push hook does this).
- Tests must stay green, including the 12 `template-react/__tests__/structure/`
  scan tests. Cut a CLI release via the `/release-decision` skill.
