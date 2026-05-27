# Phase 1 — AI Rules Truth-Up

## Goal

Bring `template/.agent/rules/*` and the template README back into sync
with the actual code they describe. This is the single highest-impact
phase for downstream users: every Claude/Cursor/Codex agent reading
these files generates code from them. A wrong rule is a wrong PR
multiplier.

## Dependencies

- Phase 0 (CI in place) so changes are guarded.

## Items

### P1.1 — Fix design preset count: 6 → 14

| | |
|--|--|
| **Where** | `packages/template-react/.agent/rules/20-tailwind-v4.md:31`, `packages/template-react/.agent/skills/customize-design/SKILL.md` |
| **What** | Both say "six scaffold-time design presets". Actual is 14: `default, apple, linear, anthropic, vercel, notion, flat, material, skeuomorphism, neumorphism, liquid-glass, claymorphism, aurora, neo-brutalism`. Source of truth: `packages/create-eikon-react/src/index.ts:50-65` and `template/src/styles/index.css` `:root.design-*` blocks. |
| **How** | Replace the count and the enumeration. In `customize-design/SKILL.md`, expand the table to all 14 with a one-line aesthetic summary per preset. Add a parity test note pointing to the new test from P2.6. |
| **Verify** | `grep -c 'design-' packages/template-react/src/styles/index.css` matches the count in both rule files. |

### P1.2 — Document the ui-snapshot mechanism

| | |
|--|--|
| **Where** | `packages/template-react/.agent/rules/50-ui-axis.md` (rewrite) |
| **What** | Phase J introduced `--ui {custom,shadcn,animate-ui}` as a real source-file swap with snapshots vendored at `packages/create-eikon-react/template-snapshots/`. The current rule describes only the registry choice, not the snapshot vendoring or `eslint.config.ui-snapshot.js`. |
| **How** | Add three sections: (1) "How `--ui` actually works" — explain the scaffold-time copy from `template-snapshots/<ui>/src/` into the project; (2) "What you can't change after scaffold" — once chosen, the user owns the files; (3) "Adding a new primitive" — three-side update (REPLACEABLE_UI_FILES + COMPONENTS sync list + animate-ui registry map), with a reference to the parity test from P2.1. Drop any sentence that implies "ui changes a class on `<html>`". |
| **Verify** | Read the rewritten rule cold; ask: "if I added a new primitive `accordion`, do I know exactly which 3 files to edit?" — answer must be yes. |

### P1.3 — Fix scaffold-owned UI list: 2 → 9

| | |
|--|--|
| **Where** | `packages/template-react/.agent/rules/50-ui-axis.md:19` |
| **What** | Says only `theme-toggle.tsx` and `language-switcher.tsx` are scaffold-owned across all `--ui` choices. Actual scaffold-owned across all choices: those two only — but the seven primitives (`button, dialog, tabs, sheet, command, card, toaster`) are scaffold-owned **for `--ui custom` only** and library-replaced for the other two. The current wording conflates "always scaffold-owned" with "scaffold-owned-but-replaceable". |
| **How** | Rewrite as: "**Always project-owned (across all --ui)**: `theme-toggle.tsx`, `language-switcher.tsx`. **Project-owned only when --ui custom**: 7 primitives listed by name. **Library-replaced when --ui shadcn or animate-ui**: same 7 primitives." |
| **Verify** | Cross-reference against `apply-ui-snapshot.ts:72` `REPLACEABLE_UI_FILES`. |

### P1.4 — Fix structural specs count: 10 → 11

| | |
|--|--|
| **Where** | `packages/template-react/.agent/rules/80-quality-system.md` |
| **What** | The rule's table claims "10 structural specs"; actual count in `__tests__/structure/` is 11 including `apps-shape.test.ts`. |
| **How** | Re-enumerate from the actual directory. Add `apps-shape.test.ts` row to the table with a one-line description of what it asserts. |
| **Verify** | `ls packages/template-react/__tests__/structure/*.test.ts \| wc -l` matches the table row count (11). |

### P1.5 — Fix "Adding a new primitive" `__tests__/` claim

| | |
|--|--|
| **Where** | `packages/template-react/.agent/rules/50-ui-axis.md` (the "Adding a new primitive" section under `--ui custom`) |
| **What** | Step 4 says create `src/shared/ui/__tests__/<name>.test.tsx`. No such directory exists; primitives are not unit-tested. Either the rule is aspirational or the convention was abandoned. |
| **How (recommended)** | Drop the step. Replace with "primitives are covered by the structural test in `shared-shape.test.ts` plus integration tests in feature folders". If the team wants to add unit tests, that's a separate initiative tracked outside this plan. |
| **Verify** | Rule no longer references a directory that doesn't exist. |

### P1.6 — Resolve `auth` feature shape contradiction

| | |
|--|--|
| **Where** | `packages/template-react/.agent/rules/00-architecture.md:96`, `packages/template-react/src/features/auth/selectors/` |
| **What** | Rule says data-layer features use `selectors/{basic,computed,memoized,actions,index}`. Auth has `basic, computed, actions, index` — no `memoized.ts`. Either the rule is over-prescriptive or auth is missing a file. |
| **How (recommended)** | Soften the rule to "selectors/ contains at minimum `basic.ts` and `index.ts`; add `computed.ts`, `memoized.ts`, `actions.ts` as the feature grows". Update `feature-shape.test.ts` to match the relaxed rule. |
| **Verify** | `feature-shape.test.ts` passes against the current `auth/` shape. |

### P1.7 — Fix template README inaccuracies

| | |
|--|--|
| **Where** | `packages/template-react/README.md:23-30, 43` |
| **What** | (a) Features list shows only `home/` and `counter/` — actual: `home, counter, tasks, auth, examples`. (b) `pnpm build` is described as "type-checks and produces a production build" — actual `package.json:14` is `vite build` only; type-check variant is `build:check`. |
| **How** | Update features list from `ls -d src/features/*/` output. Replace the build sentence with: "`pnpm build` produces a production build. Use `pnpm build:check` to also run typecheck." |
| **Verify** | Each claim in the README round-trips against `package.json` scripts and the actual `src/features/` directory listing. |

### P1.8 — Naming consistency pass

| | |
|--|--|
| **Where** | Root `package.json:2`, root `README.md`, `packages/template-react/README.md`, `packages/template-react/index.html:60` |
| **What** | Project is referenced as `eikon-react`, "Eikon for React", "Eikon React Template", `<title>Eikon App</title>` across four places. No fatal contradiction but inconsistent. |
| **How** | Pick canonical names: package id stays `eikon-react`; user-facing brand is "Eikon for React"; the template's `<title>` becomes the user's project name (already templated) so leave that. Update root README and template README to use "Eikon for React" consistently in prose. |
| **Verify** | `grep -i 'eikon' README.md packages/*/README.md \| grep -v 'eikon-react'` shows only "Eikon for React" in prose. |

## Phase exit criteria

- [x] All four rule files (`20-tailwind-v4.md`, `50-ui-axis.md`, `80-quality-system.md`, `customize-design/SKILL.md`) match repo reality
- [x] Reading `50-ui-axis.md` cold tells you exactly how `--ui` swaps work
- [x] Template README's features list matches `ls src/features/`
- [x] Brand name is consistent across user-facing prose
- [x] `feature-shape.test.ts` no longer contradicts an existing feature
