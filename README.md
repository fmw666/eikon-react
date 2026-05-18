# EvoMap Frontend Kit

> An AI-Coding-Agent-friendly React starter — `npx create-evomap-app` + a curated React 19 template, plus a portable `.agent/` protocol any agent (Cursor, Claude Code, Codex, …) can read.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![React 19](https://img.shields.io/badge/React-19-20232a?logo=react&logoColor=61DAFB&labelColor=20232a)](https://react.dev)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-v4-0ea5e9?logo=tailwindcss&logoColor=white&labelColor=0ea5e9)](https://tailwindcss.com)
[![Vite 6](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=FFD62E&labelColor=646CFF)](https://vitejs.dev)

## What this is

This repository is **two things in one pnpm monorepo**:

| Package                                                  | Role                                                                                 |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| [packages/create-evomap-app](packages/create-evomap-app) | The CLI published to npm as `create-evomap-app` (`npx create-evomap-app my-app`).    |
| [packages/template-react](packages/template-react)       | The reference React 19 template that the CLI ships and scaffolds into your project. |

The template is **opinionated, AI-agent-aware, and feature-first** so that — humans or AI agents — anyone who edits a generated project starts from the same conventions instead of reinventing them.

## Quick start (consumers)

```bash
npx create-evomap-app my-app
# or
pnpm create evomap-app my-app
```

The CLI is interactive and will ask:

- Project name (positional arg lets you skip the prompt)
- Whether to include **Supabase** (auth + db + storage scaffolding)
- Whether to include **TanStack Query** (server-state)
- Package manager (pnpm / npm / bun)
- Install deps and `git init` now or later

Non-interactive flags exist for CI scripting:

```bash
npx create-evomap-app my-app \
  --yes \
  --no-supabase --query \
  --pm pnpm \
  --no-install --no-git
```

## What you get in a generated project

- **React 19** + **TypeScript 5.6+**
- **Vite 6** + **Tailwind CSS v4** (CSS-first config, no `tailwind.config.js`)
- **animate-ui style** primitives in `src/shared/ui/` (`motion` + Radix)
- **Feature-first architecture** with ESLint-enforced import boundaries
- **Vitest** + **Testing Library** with `__tests__/` colocated per feature
- **React Router v7**, **Zustand**, **React Hook Form** + **zod**, **i18next** (en/zh)
- Optional **Supabase** (`@supabase/supabase-js`) and **TanStack Query**
- **`.agent/` protocol** — rules and skills any AI coding agent can read directly:

  ```
  .agent/
  ├── README.md
  ├── rules/                 # hard constraints: architecture, React, Tailwind v4, …
  └── skills/                # task playbooks: add-feature, add-page, write-test, …
  ```

  See [docs/agent-protocol.md](docs/agent-protocol.md) for the full specification.

## Repository layout

```
.
├── packages/
│   ├── create-evomap-app/   # CLI source + e2e tests
│   └── template-react/      # Canonical React 19 template
├── docs/
│   ├── architecture.md      # Why feature-first, how boundaries work
│   └── agent-protocol.md    # The .agent/ specification
├── package.json             # Workspace root
└── pnpm-workspace.yaml
```

## Development (contributors)

Requires Node ≥ 20.10 and pnpm ≥ 9.

```bash
pnpm install                                  # install all workspaces
pnpm --filter @evomap/template-react dev      # run the template locally
pnpm --filter @evomap/template-react test     # template tests
pnpm --filter @evomap/template-react lint     # template lint
pnpm --filter @evomap/template-react build    # template prod build
pnpm --filter create-evomap-app build         # build the CLI bundle + sync template payload
pnpm cli                                      # build then run CLI from source
```

### End-to-end validation

The CLI ships with a self-contained e2e suite that simulates the real `npx`
install path:

1. Builds the CLI bundle and syncs the template payload.
2. Runs `npm pack` to produce the exact tarball that `npm publish` would.
3. For each scenario (`lean` / `default` / `full`) installs the tarball into a
   throwaway sandbox so the binary is invoked the same way `npx` would invoke
   it after a registry pull.
4. Verifies the generated project's file tree, `package.json` deps, and the
   contents of `src/app/providers.tsx` after feature stripping.
5. In full mode, runs `pnpm install && pnpm typecheck && pnpm test && pnpm lint && pnpm build`
   inside each generated project.

```bash
pnpm e2e:quick                       # ~20s, no install/build — just scaffolding
pnpm e2e                             # ~2-5 min, full pipeline inside each scenario
pnpm e2e -- --only lean              # run only the named scenario
pnpm e2e -- --keep                   # keep the temp workspace on disk for inspection
```

The e2e runner lives at [packages/create-evomap-app/scripts/e2e.mjs](packages/create-evomap-app/scripts/e2e.mjs).

Releasing the CLI (manual for now):

```bash
pnpm --filter create-evomap-app build
cd packages/create-evomap-app && npm publish --access public
```

## Documentation

- [docs/architecture.md](docs/architecture.md) — Feature-first design rationale + import boundary enforcement.
- [docs/agent-protocol.md](docs/agent-protocol.md) — `.agent/rules` and `.agent/skills` schema and authoring guide.
- [packages/template-react/.agent/README.md](packages/template-react/.agent/README.md) — Live `.agent/` README inside the template.

## License

MIT
