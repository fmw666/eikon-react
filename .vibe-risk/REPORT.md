# Vibe Coding Risk Report — eikon-react monorepo

> Skill **vibe-risk-analyzer v4.1.0** · Scan mode **Full** · Scope **per-package (all 3)** · Date **2026-06-11**
> Downloaded from `evomap/evomap-skills-repo` and vendored at `.claude/skills/vibe-risk-analyzer/`.

> ⚠️ **This section is the BASELINE audit snapshot (CLI 92 · preview 89 · template 96).**
> A full remediation has since landed build-green — current scores **CLI 95 · preview 92 · template 96**,
> with 0 files >4000 tokens anywhere and 5 of 8 ledger items cleared. See the post-remediation entries in
> `.vibe-risk/scorecard-*.json` and `packages/*/.vibe-risk-history.json` for the authoritative current state.

## 1. Project Overview

| Field | Value |
|---|---|
| Project | `eikon-react` (pnpm monorepo, 3 packages) |
| Scan Date | 2026-06-11 |
| Scan Mode | Full |
| Skill Version | 4.1.0 (rubric v4) |
| Tech Stack | React 19, TypeScript 5.6 (strict), Tailwind v4, Vite 6, vitest, zustand, i18next, zod |
| Stack Type | frontend template + tooling (CLI) |
| Monorepo | Yes — scored independently, per-package trend lines |
| `.vibe-riskrc` | **created this scan** — generatedGlobs (`.preview-cache/**`, `create-eikon-react/template/**`), dataAssetGlobs (`template-snapshots/**`) |
| AI App Surface (Dim 13) | **inactive** — no LLM SDK / provider registry / SSE chat in any package |

**Per-package census (first-party source only; generated mirrors + `.preview-cache` excluded):**

| Package | Files | LOC | ~Tokens | Tests | Scale |
|---|---|---|---|---|---|
| create-eikon-react (public CLI) | 36 | 5,404 | 49.7k | 19 | SMALL |
| @eikon/preview (preview-site) | 159 | 24,222 | 225k | 13 | MEDIUM |
| @eikon/react (template-react) | 170 | 17,779 | 161k | 43 | MEDIUM |

---

## 2. Overall Score & Risk Levels

```
create-eikon-react   92/100  EXCELLENT   [██████████████████░░]
preview-site         89/100  EXCELLENT   [█████████████████░░░]
template-react       96/100  EXCELLENT   [███████████████████░]  ← AI-native ceiling (≥95)
```

| Package | This scan (v4) | Prior (v3 unified) | Note |
|---|---|---|---|
| create-eikon-react | 92 | 91 (unified) | baseline reset — v4 not directly comparable |
| preview-site | 89 | 91 (unified) | per-package reveals its test thinness |
| template-react | 96 | 91 (unified) | AI-native ceiling |

> The prior **91/100** was a single unified number for all three packages. Per-package v4 scoring shows the spread the average hid: **template-react (96)** is the exemplar; **preview-site (89)** carries the god files and the thin behavioral-test surface.

### 2.1 / 2.2 Risk metrics (all packages in the high-score regime → both multiplicative formulas saturate to MINIMAL)

| Package | Refactoring Risk | AI Extension Risk | Dominant note |
|---|---|---|---|
| create-eikon-react | **5** MINIMAL | **6** MINIMAL | SMALL, well-tested CLI; no perf surface |
| preview-site | **11** MINIMAL | **8** MINIMAL | god files + thin behavioral tests are the only levers |
| template-react | **4** MINIMAL | **3** MINIMAL | prohibition + context bonuses pull risk to the floor |

### 2.2b Drift Watch (health ≥ 90 → leading indicators replace the saturated risk numbers)

| Package | New-module guard density | New-code coverage | Stale prohibitions |
|---|---|---|---|
| create-eikon-react | 🟢 | 🟢 | 🟢 0 |
| preview-site | 🟡 (AgentChatReplay/#11 added) | 🟡 thin | 🟢 0 |
| template-react | 🟢 | 🟢 | 🟢 0 |

**template-react: AI-native ceiling reached** — all remaining deductions are registered policy/disputed ledger entries (§10.5), not gaps.

### 2.3 Performance & Memory Debt

| Package | Candidates → Confirmed | Multiplier | Notes |
|---|---|---|---|
| create-eikon-react | 0 → 0 | ×1.0 | Node CLI, no DOM |
| preview-site | ~40 → 3 | ×1.0 | addEventListener 33/removeEventListener 34 balanced; 249 `={{` inline objects = landing idiom, discarded |
| template-react | 14 → 2 | ×1.0 | 5 unmatched addEventListener to check; setInterval balanced; factory avoids import-time supabase init |

---

## 3. Dimension Scores (per package)

| # | Dimension | Wt | CLI | preview | template |
|---|---|---|---|---|---|
| 1 | Module Granularity & SRP | 14 | 10 | 9 | 11 |
| 2 | Pattern Consistency | 14 | 14 | 14 | 14 |
| 3 | Type Safety & Contracts | 12 | 11 | 11 | 11 |
| 4 | Test Coverage & Invariants | 12 | 12 | 9 | 12 |
| 5 | AI Context Artifacts | 10 | 9 | 9 | 10 |
| 6 | Architecture & Structure | 8 | 8 | 8 | 8 |
| 7 | Dependency Health | 7 | 7 | 7 | 7 |
| 8 | Explicit Prohibition Density | 6 | 5 | 5 | 6 |
| 9 | Naming & Discoverability | 6 | 6 | 6 | 6 |
| 10 | Duplication & Dead Code | 5 | 4 | 5 | 5 |
| 11 | Determinism & Side-Effects | 3 | 3 | 3 | 3 |
| 12 | Security & Tooling | 3 | 3 | 3 | 3 |
| | **Total** | **100** | **92** | **89** | **96** |

Machine-readable derivation: `.vibe-risk/scorecard-{package}.json` (every deduction carries its sub-item ID + kind).

---

## 4. Top 5 Issues (whole monorepo)

| # | Sev | Dim | Package | Summary | Fix |
|---|---|---|---|---|---|
| 1 | MEDIUM | SRP | preview-site | `Nav.tsx` (6533 tok) + `ChangedFilesTree.tsx` (5252) genuine god files | Extract the magic-indicator / scroll-glass / prefetch hooks out of Nav; split ChangedFilesTree row-renderer |
| 2 | LOW | Test | preview-site | 13 test files / 159 source — thin behavioral coverage; PR-PV not scan-tested | Add `__tests__/structure/import-boundaries.test.ts` enforcing PR-PV-001..005; behavioral tests for the params→preview flow |
| 3 | LOW | SRP | (config) | `.preview-cache` (×4) + `template/` mirror + `i18n.ts`/`icons.ts` data were polluting size metrics | `.vibe-riskrc.json` created; extend with `preview-site/src/landing/{theme/i18n.ts,icons.ts}` (data) + `template-react/src/shared/ui/**` (vendored) |
| 4 | LOW | Dup | create-eikon-react | jscpd 3.26% (strip-features test fixtures) | Factor shared fixtures in `src/__tests__/` into a helper |
| 5 | LOW | Context | create-eikon-react | no CLI-package-local agent briefing | Add a short `packages/create-eikon-react/AGENTS.md` covering build/sync-template/e2e |

> No CRITICAL or HIGH issues. AI Extension Risk is MINIMAL everywhere, so no fence-first P0 is forced.

---

## 5. Detailed Diagnostics (per dimension, all packages)

### 5.1 Module Granularity & SRP — CLI 10 · preview 9 · template 11
- **create-eikon-react**: `SRP-F1 -2` (disputed) `scripts/e2e-scenarios.mjs` 4416 tok = scenario data; `SRP-F2 -2` 6/36 (16.7%) >2000 (3 are dev scripts). Shipped `src/` is clean (max 3432 tok, 0 >4000).
- **preview-site**: `SRP-F1 -2` (policy) Nav 6533 / ChangedFilesTree 5252 / useFooterSpotlight 4066; `SRP-F2 -2` 29/159 (18.2%); `SRP-W3 -1` (disputed) landing flow p90 ~5-8k. Note: `i18n.ts` 6402 + `icons.ts` 5522 are **data** (40-line icon map) — reported, recommend exempting.
- **template-react**: `SRP-F2 -2` (disputed) 15/170 (8.8%), several semi-vendored `shared/ui/*`; `SRP-W3 -1`. **0 files >4000** ✅.

### 5.2 Pattern Consistency — 14 · 14 · 14
Single state lib (zustand), single toast (sonner, template-react), Tailwind v4 uniform, function components only, async/await uniform. template-react's zustand + `@tanstack/react-query` is complementary (client state vs server cache), **not** drift. **No module stacking** in any package.

### 5.3 Type Safety & Contracts — 11 · 11 · 11
TS strict everywhere. **0 unannotated `any`** (the one CLI hit is in a comment), **0 `@ts-ignore`**. `TYP-Q4 -1` each for `as` density (51 / 257 / 145) — DOM/CodeMirror/getBoundingClientRect/zod/radix narrowing; clearing below 20 would require unsafe casts (registered policy). template-react adds zod + react-hook-form runtime contracts.

### 5.4 Test Coverage & Structural Invariants — 12 · 9 · 12
- **create-eikon-react**: 19 tests / 36 source (53%); parity/invariant suite (cli-schema-parity, platform-parity, skip-list-parity, ui-snapshot-parity…) → `COV-S3 +1` bonus.
- **preview-site**: `COV-E3 -2` (~5% token ratio), `COV-S2 -1` (PR-PV enforced by eslint, no in-package scan test). ui_heavy profile (low global % not over-penalized).
- **template-react**: **12 structural scan tests** (`__tests__/structure/*`) → `COV-S3 +1`; auth critical path has behavioral tests (`SignInModal.test`, `authStore.test`). Clean coverage denominators (include `src/**`, excludes `.preview-cache`).

### 5.5 AI Context Artifacts — 9 · 9 · 10
Root `AGENTS.md` ✅. **template-react**: 10 `.agent/rules/` (00-architecture…90-platform-targets) + **14 `.agent/skills/`** + per-domain i18n/types → 10/10. **preview-site**: 1 rule (`00-structure.md`) → -1 sparse. **CLI**: relies on root briefing → -1 (no package-local). `docs/` has architecture, agent-protocol, quality-system.

### 5.6 Architecture & Structure — 8 · 8 · 8
Feature-first (template-react: features/{auth,examples,tasks}, shared/, app/layouts, custom `eslint-rules/`). preview-site: landing/ ‖ shell/ ‖ server/ with PR-PV boundary. CLI: clear single-purpose modules. Auth uses interface + factory + Mock/Supabase impls (dependency inversion) — exemplary.

### 5.7 Dependency Health — 7 · 7 · 7
**0 circular** (graph-fallback import-scan found no cycle clusters; boundary-imports.test + PR-PV + eslint enforce). **0 vulnerabilities** (pnpm audit, official registry, all severities). Deps all in use. knip skipped (workspace unconfigured) — documented, no penalty.

### 5.8 Explicit Prohibition Density — 5 · 5 · 6
preview-site: 5 exemplary `❌ PR-PV-001..005` (backticked, indexed, regression-ref). template-react: 19 ❌/PR across 10 rules. Root AGENTS.md: 9. template-react reaches the solid 16-30 band (6/6); the other two land 6-15 (-1).

### 5.9 Naming — 6 · 6 · 6
Domain naming throughout (copy-template, strip-features, useFooterSpotlight, authService, useScrolled). No generic `utils.js`/`helpers.js` dumps.

### 5.10 Duplication & Dead Code — 4 · 5 · 5
jscpd: CLI **3.26%** (`DUP-C1 -1`, test fixtures) · preview **1.62%** · template **2.70%** (all <5%). Dead-code (knip) skipped — no penalty.

### 5.11 Determinism & Side-Effect Hygiene — 3 · 3 · 3
CSR-only SPAs → no SSR/hydration divergence class. `useLayoutEffect` is DOM-measurement (Nav indicator), not hydration patching. No `useState(Date.now()/Math.random())` at render. supabase via factory (no import-time init). Meadow decorative `Math.random` noted disputed.

### 5.12 Security & Tooling — 3 · 3 · 3
No hardcoded secrets (the 12 `password` hits are test fixtures / a sign-up form demo). `.env.example` present in template-react (the only package needing env). eslint `--max-warnings 0` + prettier + custom eslint-rules. `.gitignore` covers `.env`, caches, build.

### 5.13 AI App Surface — inactive (no LLM signals in any package)

---

## 6. Tool Scan Data Summary

```
Census (first-party source, .vibe-riskrc applied):
  create-eikon-react  source 36f/49.7k tok · test 19f · data 54f · generated 213f (template mirror)
  preview-site        source 159f/225k tok · test 13f
  template-react      source 170f/161k tok · test 43f · generated 912f (.preview-cache ×4)

madge (circular):   "Processed 0 files" on all 3 → VACUOUS (Windows/alias). NOT trusted.
                    Fallback: graph-fallback import-scan → no cycle clusters
                    (CLI 2 buckets/2 edges · preview 4/6 · template 4/5) +
                    boundary-imports.test + PR-PV import prohibitions + eslint.
knip (dead code):   skipped — workspace unconfigured (documented, no penalty).
pnpm audit:         official registry → info 0 / low 0 / moderate 0 / high 0 / critical 0.
jscpd:              3.26% / 1.62% / 2.70%.
Prohibitions:       preview 5 (PR-PV, backticked) · template 19 · root AGENTS 9.
Structural tests:   template-react 12 (__tests__/structure) · CLI parity suite · preview eslint-only.
AI context:         root AGENTS.md + template 10 rules/14 skills + preview 1 rule + docs/{architecture,agent-protocol,quality-system}.
Type:               0 unannotated `any`, 0 @ts-ignore across all packages.
```

---

## 7. Recommended Tools & Configuration

| Item | Purpose | Action | Priority |
|---|---|---|---|
| Extend `.vibe-riskrc.json` | Exempt true data/vendored from size metrics | add `preview-site/src/landing/{theme/i18n.ts,icons.ts}` → dataAssetGlobs; `template-react/src/shared/ui/**` → vendorGlobs | RECOMMENDED |
| `knip.json` | Enable dead-code scan in the pnpm workspace | add minimal workspace config so knip stops being skipped | OPTIONAL |
| preview-site scan test | Make PR-PV enforceable in CI as a test | `__tests__/structure/import-boundaries.test.ts` | RECOMMENDED |

All core tooling (eslint, prettier, vitest, coverage-v8, tsc strict, custom eslint-rules) is already present.

---

## 8. Agent Rules & Skills Recommendations

**Existing (rich):** root `AGENTS.md`; template-react 10 `.agent/rules` + 14 `.agent/skills`; preview-site `.agent/rules/00-structure.md` (PR-PV); root `.claude/skills` (release-decision, repo-audit, **vibe-risk-analyzer** ← vendored this session).

- **[TEST] `preview-site/__tests__/structure/import-boundaries.test.ts`** — RECOMMENDED. Triggered by COV-S2. Scan `src/shell/**` and `src/landing/**` for the PR-PV-001..005 patterns; fail on violation. Turns 5 doc rules into a CI fence.
- **[DOC] `packages/create-eikon-react/AGENTS.md`** — OPTIONAL. Triggered by CTX-C2. ~40 lines: build (`sync-template.mjs` then tsup), e2e harness, the template/ mirror invariant.

---

## 9. Remediation Roadmap

### P0 — Immediate
No actions at this priority level. (No CRITICAL/HIGH findings; AI Extension Risk MINIMAL — no fence-first ordering forced.)

### P1 — This Week
| # | Action | Benefit | Dim |
|---|---|---|---|
| 1 | Extend `.vibe-riskrc.json` (i18n.ts/icons.ts → data; shared/ui/** → vendored) | Clears SD-PV-002 + part of SD-TR-001; size metrics reflect hand-written code | 1 |
| 2 | Add preview-site `import-boundaries.test.ts` enforcing PR-PV | Clears SD-PV-004; CI-enforced fence | 4/8 |

### P2 — Continuous
| # | Action | Benefit | Dim |
|---|---|---|---|
| 1 | Extract hooks out of `Nav.tsx` / split `ChangedFilesTree.tsx` row renderer | Lowers preview-site god-file ceiling | 1 |
| 2 | Add behavioral tests for preview-site params→preview flow | Raises thin coverage | 4 |
| 3 | Factor shared CLI test fixtures | Trims 3.26% duplication | 10 |

---

## 10. Score History & Ledger

| Date | Mode | Scope | Result |
|---|---|---|---|
| 2026-06-11 | full | v4 per-package | CLI 92 · preview 89 · template 96 (all EXCELLENT) |
| 2026-06-04 | full | v3 unified | 91 EXCELLENT |
| 2026-06-04 | full | v3 unified (first) | 86 EXCELLENT |

Per-package trend lines start this scan (`packages/*/.vibe-risk-history.json`). v4 ≠ v3 baseline (rubric reset).

### 10.5 Standing-Deduction Ledger (seeded this scan from v3 top_issues; v2→v3 migration)
| Status | ID | Sub-item | Pts | Kind | Note |
|---|---|---|---|---|---|
| added | SD-PV-001 | SRP-F1 | -2 | policy | Nav/ChangedFilesTree god files |
| added | SD-PV-002 | SRP-F1 | 0 | disputed | i18n.ts/icons.ts data → recommend dataAssetGlobs |
| added | SD-PV-003 | TYP-Q4 | -1 | policy | 257 `as` (DOM/CodeMirror narrowing) |
| added | SD-PV-004 | COV-S2 | -1 | debt | PR-PV not scan-tested |
| added | SD-TR-001 | SRP-F2 | -2 | disputed | shared/ui semi-vendored → vendorGlobs |
| added | SD-TR-002 | TYP-Q4 | -1 | policy | 145 `as` (zod/radix narrowing) |
| added | SD-CE-001 | SRP-F1 | -2 | disputed | e2e-scenarios.mjs is data |
| added | SD-CE-002 | TYP-Q4 | -1 | policy | 51 `as` (file/template narrowing) |

No cleared/stale entries (first v4 ledger). Each entry carries a `verify_cmd` for next-scan re-verification.

## 11. Remediation Prompt
See the fenced prompt delivered in chat (interactive mode).

## 12. Dependency Graph
Static SVGs (graphviz-free fallback): `.vibe-risk/dependency-graph-{create-eikon-react,preview-site,template-react}.svg`.
No cycle clusters; orange edges (upward) = layer-violation candidates to eyeball. preview-site shows the landing↔shell split honoring PR-PV.

---
*Report generated by Vibe Coding Risk Analyzer v4.1.0 — vendored from evomap/evomap-skills-repo.*
