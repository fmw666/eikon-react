# Tech-debt cleanup plan — 2026-05-28

Source: `.claude/skills/repo-audit/` audit run on 2026-05-28. 90 raw findings
across three lanes were deduped into 80 actionable items, organised into
seven phases with explicit dependencies.

The goal stated by the user: **"no debt and no dead code remaining"**.
This plan therefore aims for completeness over speed — every audit
finding has a disposition (fix, decide-then-fix, or explicitly drop).

## Why this order

Phases are ordered so that **earlier phases provide the verification
machinery later phases lean on**:

1. **Phase 0 — CI Foundation** must come first. Without CI, every
   subsequent fix lands without a regression net. Today there is no
   `.github/workflows/` at all, despite agent rules claiming one exists.
2. **Phase 1 — AI rules truth-up** is second because the template's
   `.agent/rules/*` are the headline value prop. Drift here makes every
   downstream Claude generate wrong code. This is also the cheapest
   phase (text edits, no architectural risk).
3. **Phase 2 — Parity tests** locks down truth sources (UI primitives
   list, platform axis, marker balance, project-name tokens) so future
   regressions in Phases 3–5 fail fast.
4. **Phase 3 — CLI hardening** depends on Phase 2 parity tests existing.
5. **Phase 4 — Preview-site hardening** is parallel-able with Phase 3
   but listed after because npm-tarball correctness is higher impact
   than playground robustness.
6. **Phase 5 — Dead code & naming** sweeps the long tail of LOW items
   under one banner; doing it in a dedicated phase prevents these from
   getting orphaned in "miscellaneous" forever.
7. **Phase 6 — Verification & smoke** is the close-out gate. Nothing
   ships until all phases verify clean.

## Phases

| Phase | File | Theme | Item count | Est. effort |
|------:|------|-------|-----------:|-------------|
| 0 | [phase-0-ci-foundation.md](tech-debt/phase-0-ci-foundation.md) | CI workflow + release gates + version-bump strategy | 6 | 1 day |
| 1 | [phase-1-ai-rules.md](tech-debt/phase-1-ai-rules.md) | Rewrite drift in `.agent/rules/*` + template README | 8 | 0.5 day |
| 2 | [phase-2-parity-tests.md](tech-debt/phase-2-parity-tests.md) | Lock truth sources behind tests | 7 | 1 day |
| 3 | [phase-3-cli-hardening.md](tech-debt/phase-3-cli-hardening.md) | Scaffold flow correctness, sync brittleness, error UX | 18 | 2 days |
| 4 | [phase-4-preview-hardening.md](tech-debt/phase-4-preview-hardening.md) | Cache integrity, body limits, observability, Dockerfile | 29 | 2.5 days |
| 5 | [phase-5-dead-code.md](tech-debt/phase-5-dead-code.md) | Decide-then-delete pass, naming consistency | 12 | 0.5 day |
| 6 | [phase-6-verification.md](tech-debt/phase-6-verification.md) | Manual + automated smoke before declaring debt-free | — | 0.5 day |

**Total: ~1 working week** if done end-to-end. Parallelisable to ~3 days
if Phase 3 and Phase 4 run concurrently after Phase 2.

## Conventions used in each phase

Each phase file has the same shape:

- **Goal** — one paragraph
- **Dependencies** — earlier phases that must finish first
- **Items** — table per item with WHERE, WHAT, HOW, VERIFY
- **Phase exit criteria** — concrete checks before moving on

Item IDs in phase files are stable (`P0.1`, `P0.2`, … `P5.12`) so the
plan can be referenced from commit messages and PRs without renumbering
risk.

## Cross-cutting decisions to make BEFORE starting

These three decisions block multiple items across multiple phases. Make
them once, at the top, before any code change:

### D1 — Version bump strategy (blocks P0.3, P0.4, P5.x)

Today: root `2.0.0`, template `2.0.0`, CLI `1.2.0` — no changesets.
Pick one:

- **(a) Lockstep:** all three packages share a version. `@eikon/preview`
  and `@eikon/template-react` are private and don't publish, so this
  has no semver consequence — but it does mean every CLI release also
  bumps two private packages, churning their git history.
- **(b) CLI-only versioning:** root and template stay at a fixed
  `0.0.0` or `private` marker; only `create-eikon-react` carries a
  meaningful version. Cleanest given only one package publishes.
- **(c) Independent:** keep current model but add changesets to track
  intent.

**Recommendation: (b).** It matches the actual publish surface and
stops misleading anyone reading root `package.json`. Existing release-
decision skill already focuses only on the CLI version; this codifies
that.

### D2 — Husky vs simple-git-hooks vs none (blocks P0.4)

`.gitignore:50` excludes `.husky/_` but no `.husky/` exists. Three
options:

- Add husky + lint-staged for pre-commit `pnpm verify --quick`
- Add simple-git-hooks (lighter; fewer transitive deps)
- Drop the gitignore entry and skip pre-commit hooks (CI is the gate)

**Recommendation: simple-git-hooks** for a `pre-push` hook running
`pnpm verify` (not pre-commit — pre-commit is too slow given e2e). CI
stays the authoritative gate per option (a) but pre-push catches the
common case before it leaves the laptop.

### D3 — Lockstep for marker presence vs functionality (blocks P5.2)

`features/examples/index.ts:17` documents that `@eikon:feature(examples)`
markers are now "inert" yet `app/router.tsx:23-25, 41-56` still wraps
imports with them. Pick one:

- **(a) Resurrect the feature flag:** make `--no-examples` a real CLI
  option that strips them, restoring the markers' meaning.
- **(b) Remove all `@eikon:feature(examples)` markers** and the
  documentation that says they're inert.

**Recommendation: (b).** Examples are a value-prop showcase; nobody is
asking to opt out of them. The markers are pure noise for AI agents
reading the code.

## Re-running the audit

After Phase 6, run `/repo-audit` (the skill at
`.claude/skills/repo-audit/`) to confirm the punch list is empty. The
skill spawns three parallel general-purpose subagents and synthesises
into the same P0/P1/P2/P3 buckets. A successful exit is a list with
zero P0 items and ≤5 P1 items.

## Tracking

Each phase's items get committed as a series of small commits, one per
item ID where reasonable. The commit subject prefix is the item ID:

```
P1.1: align design preset count to 14 in 20-tailwind-v4.md
P3.2: assert ensureCardTitleIsHeading patches actually applied
```

This lets `git log --grep '^P[0-9]'` enumerate completed items and
makes the plan-vs-progress diff tractable.
