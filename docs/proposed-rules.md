# Prohibition catalog (`PR-NNN`)

A single, `grep`-verifiable index of the project's hard "don't" rules. Each
entry has (a) a `❌` marker, (b) a backticked code pattern you can `rg` for, and
(c) a stable `PR-NNN` id so a regressing pull request can name the rule it broke.

This file is the *index*; the rules live (and are explained in context) inside
[`packages/template-react/.agent/rules/`](../packages/template-react/.agent/rules/).
The executable fences that actually catch regressions are the
`packages/template-react/__tests__/structure/*` scan tests plus
`eslint.config.js`'s `import/no-restricted-paths`.

> **Why both prose rules and this catalog?** An AI agent that loads the `.agent`
> rules learns the *why*; an agent (or a CI grep) that only has this table can
> still self-check a diff mechanically. The prose and the catalog must agree —
> when you add a `❌` line to a rule file, add its `PR-NNN` row here too.

## How to check a working tree

Ripgrep (`rg`) with `-P` (PCRE2, needed for the look-ahead patterns):

```bash
rg -P "from ['\"]@/features/[^'\"]+/(?!index|routes)['\"]" packages/template-react/src   # PR-001
rg "from ['\"](redux|@reduxjs/toolkit|mobx|jotai|recoil)['\"]" packages/template-react/src # PR-010
rg "from ['\"]framer-motion['\"]" packages/template-react/src                              # PR-020
```

A clean tree returns **zero** matches for every pattern below.

## Catalog

| ID | Source rule | Pattern (`rg`) | Why it's forbidden |
| --- | --- | --- | --- |
| PR-001 | [00-architecture](../packages/template-react/.agent/rules/00-architecture.md) | `from ['"]@/features/[^'"]+/(?!index\|routes)['"]` | Cross-feature imports must go through the feature barrel, not a deep path. |
| PR-002 | [00-architecture](../packages/template-react/.agent/rules/00-architecture.md) | `from ['"]@/features/` *(inside `src/shared/`)* | `shared/` is leaf-level; it must not depend on `features/`. |
| PR-003 | [00-architecture](../packages/template-react/.agent/rules/00-architecture.md) | `from ['"]@/features/[^'"]+/(?!index\|routes)` *(inside `src/app/`)* | The app shell consumes features only via their barrel or `routes`. |
| PR-004 | [00-architecture](../packages/template-react/.agent/rules/00-architecture.md) | `from ['"]@/styles/` *(outside `src/main.tsx`)* | `styles/` is a side-effect import owned by the entrypoint alone. |
| PR-010 | [40-state-management](../packages/template-react/.agent/rules/40-state-management.md) | `from ['"](redux\|@reduxjs/toolkit\|mobx\|mobx-react\|jotai\|recoil)['"]` | No fourth state library — `useState` / Zustand / TanStack Query cover every case. |
| PR-011 | [40-state-management](../packages/template-react/.agent/rules/40-state-management.md) | `from ['"](axios\|got\|ky\|superagent)['"]` | Server data flows through `fetch` + TanStack Query / the service layer. |
| PR-012 | [40-state-management](../packages/template-react/.agent/rules/40-state-management.md) | `from ['"][^'"]*/store/` *(inside `features/*/components`, `features/*/pages`)* | Components see only the `selectors/` barrel + service facade, never the store. |
| PR-020 | [50-ui-axis](../packages/template-react/.agent/rules/50-ui-axis.md) | `from ['"]framer-motion['"]` | Use `motion` (the `motion/react` entrypoint) only. |
| PR-021 | [50-ui-axis](../packages/template-react/.agent/rules/50-ui-axis.md) | `from ['"](react-spring\|@react-spring/web\|gsap)['"]` | A single animation library — `motion`. |
| PR-022 | [50-ui-axis](../packages/template-react/.agent/rules/50-ui-axis.md) | `from ['"](react-hot-toast\|react-toastify\|notistack)['"]` | Toasts go through `@/shared/ui/toaster` (Sonner). |

## Adding a rule

1. Add the `❌ PR-NNN: …` line to the relevant `.agent/rules/*.md` file (next
   free id; ids are never reused).
2. Add a row here.
3. Where practical, back it with an executable fence — extend an existing
   `__tests__/structure/*` scan or an `import/no-restricted-paths` zone — so the
   rule is enforced, not just documented.
