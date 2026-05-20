# Eikon for React

> An AI-Coding-Agent-friendly React starter — `npx create-eikon-react` + a curated React 19 template, plus a portable `.agent/` protocol any agent (Cursor, Claude Code, Codex, …) can read.
>
> _Eikon_ (Ancient Greek **εἰκών**, "image / rendered form") — the word English `icon` came from. A React app, after all, is the eikon of its state.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![React 19](https://img.shields.io/badge/React-19-20232a?logo=react&logoColor=61DAFB&labelColor=20232a)](https://react.dev)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-v4-0ea5e9?logo=tailwindcss&logoColor=white&labelColor=0ea5e9)](https://tailwindcss.com)
[![Vite 6](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=FFD62E&labelColor=646CFF)](https://vitejs.dev)

## What this is

This repository is **two things in one pnpm monorepo**:

| Package                                                  | Role                                                                                 |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| [packages/create-eikon-react](packages/create-eikon-react) | The CLI published to npm as `create-eikon-react` (`npx create-eikon-react my-app`).    |
| [packages/template-react](packages/template-react)       | The reference React 19 template that the CLI ships and scaffolds into your project. |

The template is **opinionated, AI-agent-aware, and feature-first** so that — humans or AI agents — anyone who edits a generated project starts from the same conventions instead of reinventing them.

## Quick start (consumers)

```bash
npx create-eikon-react my-app
# or
pnpm create eikon-react my-app
```

The CLI is interactive and will ask:

- Project name (positional arg lets you skip the prompt)
- **Platform target** — `web` (browser, default), `desktop` (Tauri 2 shell), or `mobile` (Capacitor shell)
- Whether to include **Supabase** (auth + db + storage scaffolding)
- Package manager (pnpm / npm / bun)
- Install deps and `git init` now or later

TanStack Query ships as baseline infrastructure in every scaffold (alongside
React Router), so there's no question about it — the `QueryClientProvider`
is wired in `src/app/providers.tsx` out of the box.

Non-interactive flags exist for CI scripting:

```bash
npx create-eikon-react my-app \
  --yes \
  --platform desktop \
  --no-supabase \
  --pm pnpm \
  --no-install --no-git
```

Picking `--platform desktop` adds an `apps/desktop/` Tauri 2 shell next to
your web bundle; `--platform mobile` adds an `apps/mobile/` Capacitor 6
shell. See [docs/platform-targets.md](docs/platform-targets.md) for the
trade-offs and prerequisites.

## What you get in a generated project

- **Platform target** — pick `web` (default), `desktop` (Tauri 2 shell under `apps/desktop/`), or `mobile` (Capacitor 6 shell under `apps/mobile/`); the same React app powers all three. See [docs/platform-targets.md](docs/platform-targets.md).
- **React 19** + **TypeScript 5.6+**
- **Vite 6** + **Tailwind CSS v4** (CSS-first config, no `tailwind.config.js`)
- **animate-ui style** primitives in `src/shared/ui/` (`motion` + Radix)
- **Feature-first architecture** with ESLint-enforced import boundaries
- **Vitest** + **Testing Library** with `__tests__/` colocated per feature
- **React Router v7**, **Zustand**, **React Hook Form** + **zod**, **i18next** (en/zh)
- **TanStack Query** for server-state — baseline, wired by default
- Optional **Supabase** (`@supabase/supabase-js`)
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
│   ├── create-eikon-react/   # CLI source + e2e tests
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
pnpm --filter @eikon/react dev      # run the template locally
pnpm --filter @eikon/react test     # template tests
pnpm --filter @eikon/react lint     # template lint
pnpm --filter @eikon/react build    # template prod build
pnpm --filter create-eikon-react build         # build the CLI bundle + sync template payload
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

The e2e runner lives at [packages/create-eikon-react/scripts/e2e.mjs](packages/create-eikon-react/scripts/e2e.mjs).

Releasing the CLI (manual for now):

```bash
pnpm --filter create-eikon-react build
cd packages/create-eikon-react && npm publish --access public
```

## Documentation

- [docs/architecture.md](docs/architecture.md) — Feature-first design rationale + import boundary enforcement.
- [docs/agent-protocol.md](docs/agent-protocol.md) — `.agent/rules` and `.agent/skills` schema and authoring guide.
- [docs/platform-targets.md](docs/platform-targets.md) — Web / Desktop (Tauri 2) / Mobile (Capacitor) target selection, prerequisites, and how the same React app powers all three.
- [packages/template-react/.agent/README.md](packages/template-react/.agent/README.md) — Live `.agent/` README inside the template.

## License

MIT
