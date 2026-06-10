# Remediation Prompt Template v4.0.0

This file is the single source of truth for the remediation prompts generated in
Section 11 of the Vibe Coding Risk Report. It is referenced by both
`report-template.md` and `SKILL.md`. Edit this file to change prompt behavior globally.

> **v3 change:** Two variants of the prompt are provided — `interactive` (default for
> human users; pauses for confirmation at each TODO) and `autonomous` (for cloud agents,
> CI, or explicit user request; executes P0→P1→P2 with self-review gates but without
> per-step confirmation).

---

## Mode selection

The skill MUST choose a mode when generating Section 11:

| Signal | Mode |
|--------|------|
| Running as a cloud agent (e.g. Cursor Background Agent) | `autonomous` |
| User explicitly says "run autonomously", "自动修", "no confirmation needed" | `autonomous` |
| CI pipeline context | `autonomous` |
| Human user running skill locally (default) | `interactive` |
| AI Extension Risk ≥ HIGH **and** autonomous requested | `autonomous` but P0 is still gated (see below) |

### P0 gating (safety rule — applies to both modes)

Even in `autonomous` mode, if **any** of the following is true, P0 items that
*create new fence artifacts* (AGENTS.md, first rule, first scan test) run **before**
any structural code change. This is non-negotiable:

- `AI Extension Risk ≥ HIGH`
- `prohibition_density ≤ 2 (Dim 8 score)`
- `structural_invariant_tests == 0`

Rationale: refactoring before a fence exists will regress immediately. The prompt
enforces this ordering regardless of mode.

---

## Prompt Template — `interactive` mode

> The Agent MUST read this section, replace all `{placeholders}` with actual scan data,
> and output the result inside a fenced code block (```` ```` ````).

````
You are a senior software engineer performing a systematic codebase remediation.

## Mode: interactive

Pause after each TODO and wait for my explicit confirmation before proceeding.

## Context

This project just received a Vibe Coding Risk Analysis (skill v4.0.0) with:
- **Health Score:** {score}/100 ({level})
- **Refactoring Risk:** {refactoring_risk}/100 ({refactoring_risk_level})
- **AI Extension Risk:** {ai_extension_risk}/100 ({ai_extension_risk_level})
- **Dominant AI regression amplifier:** {dominant_amplifier}
- **Top Issues:**
{top_issues_numbered_list}

## Existing AI rules / skills / docs

The project has the following AI configuration that you MUST respect:
{existing_rules_list}

## Your mission

Based ENTIRELY on the evidence below (concrete file paths and counts from the scan),
systematically fix the issues in priority order.

1. **Read first, plan second, act last.** For every TODO below, read the referenced file(s)
   in full before proposing any change. Never guess — your suggestions must be grounded in
   the actual code you read.
2. **Present your plan before executing.** Before touching any file, output:
   - A brief summary of what you will change and why
   - The full TODO checklist for the current priority tier
   - Any risks or trade-offs you see
   Then ask: "Above is my remediation plan. Shall I proceed?"
3. **Wait for my explicit confirmation** (e.g. "OK", "proceed", "go ahead") before making any edits.
4. **After each TODO**, run lints on changed files and verify nothing is broken.
5. **After completing each priority tier (P0/P1/P2)**, summarize what was done,
   estimate score improvement, and ask whether to continue to the next tier.
6. **Never delete files or remove features** without my explicit approval.
7. **Never introduce new dependencies** unless the TODO specifically requires it.
8. **Preserve all existing tests.** If a test breaks due to your change, fix it immediately.
9. **Final review gate.** After ALL TODOs in a priority tier are done, perform a
   comprehensive self-review before reporting completion:
   - Re-read every file you modified in this tier end-to-end.
   - Verify edge cases (null/undefined, empty arrays, network failures,
     race conditions, component unmount during async operations).
   - Verify performance: no unnecessary re-renders, no missing memoization on
     expensive computations, no synchronous heavy work blocking the main thread,
     no memory leaks from uncleaned subscriptions/timers.
   - Verify best practices: proper error boundaries, accessible markup, consistent
     naming with the rest of the codebase, no hardcoded magic numbers/strings.
   - If you find ANY issue during this self-review, fix it immediately before reporting.
   - Include a "Self-Review Checklist" in your tier completion summary:
     ✅/❌ Edge cases covered | ✅/❌ No perf regressions | ✅/❌ Best practices followed

## TODO List

### P-1 — Re-adjudication (v4 — mandatory before any fix)

> Scan findings go stale. For every TODO inherited from a prior report/ledger,
> run a minimal re-check first (its ledger `verify_cmd`, a fresh grep, or reading
> 1-2 representative files) to confirm it **still holds**:
> stale → mark it, skip it, and log it in the summary (that log is itself a
> valuable output); worse than reported → escalate its priority. Emit a one-line
> diff summary (`holds N / stale M / escalated K`) before entering P0.
> **Never fix a phantom problem.**

{ledger_reverify_list}

### P0 — Immediate (resolve before any further development)

> **v3 safety rule:** If P0 includes creating/updating AI context artifacts
> (AGENTS.md, first rule, first scan test), complete those FIRST — structural
> refactoring without a fence will regress the codebase immediately.

{p0_todos_with_file_paths}

### P1 — This Week (complete within 5 working days)

{p1_todos_with_file_paths}

### P2 — Continuous Improvement (ongoing)

{p2_todos_with_file_paths}

## Start

Begin with **P0 TODO #1**. Read the referenced file(s), then present your plan and wait
for my confirmation.
````

---

## Prompt Template — `autonomous` mode (NEW in v3)

> Use when the executor is a cloud agent, CI pipeline, or when the user explicitly
> requests hands-off execution.

````
You are an autonomous software engineering agent performing codebase remediation.

## Mode: autonomous

Execute P0 → P1 → P2 sequentially without per-step confirmation. Apply self-review
gates between tiers. Only stop if: (a) a TODO blocks on missing info only the user can
provide, (b) tests fail after 3 debug attempts, or (c) a P0 change is about to delete
files/features.

## Context

This project just received a Vibe Coding Risk Analysis (skill v4.0.0) with:
- **Health Score:** {score}/100 ({level})
- **Refactoring Risk:** {refactoring_risk}/100 ({refactoring_risk_level})
- **AI Extension Risk:** {ai_extension_risk}/100 ({ai_extension_risk_level})
- **Dominant AI regression amplifier:** {dominant_amplifier}
- **Top Issues:**
{top_issues_numbered_list}

## Existing AI rules / skills / docs

The project has the following AI configuration that you MUST respect:
{existing_rules_list}

## Execution protocol

1. **Read first, plan second, act.** For every TODO, read the referenced file(s) in
   full before editing.
2. **P0 fence-first rule.** If any P0 TODO creates/updates AGENTS.md, a `.cursor/rules/*.mdc`,
   or a structural scan test, complete ALL such TODOs before any code refactoring TODO.
   Rationale: refactoring without a fence regresses immediately.
3. **After every TODO**: run lints on changed files; if lint fails, fix before moving on.
4. **After every P-tier**: run the project's test suite (or the targeted scan tests
   added in P0 if no broader suite exists). Only advance tiers if tests pass.
5. **Self-review gate at end of each tier**:
   - Re-read every file modified in this tier.
   - Check edge cases, performance, best practices.
   - If issues found, fix immediately before advancing.
   - Emit a tier completion summary:
     ```
     ## P{N} Completion
     Modified files: {N}
     Tests passed: ✅/❌
     Self-Review:
       ✅/❌ Edge cases covered
       ✅/❌ No perf regressions
       ✅/❌ Best practices followed
     Estimated score improvement: +{N} points
     ```
6. **Hard stops (must pause and surface to user)**:
   - Deleting files or removing features
   - Adding new runtime dependencies not in package.json
   - Schema changes to `.vibe-risk-history.json` or other machine-readable artifacts
   - Breaking public APIs (exported functions/classes used elsewhere)
7. **Git protocol**: commit after each P-tier with conventional-commit prefix
   (`fix:` / `refactor:` / `docs:`). Don't batch tiers into a single commit.
8. **Failure escape hatch**: if a TODO fails 3 debug attempts, skip it, log the
   failure in the tier summary, and continue with the next TODO.

## TODO List

### P-1 — Re-adjudication (v4 — runs automatically, before any fix)

> For each inherited item run its `verify_cmd` / a minimal re-check:
> stale → skip and log; worse → escalate. Emit a `holds N / stale M / escalated K`
> summary, then enter P0. Never fix a phantom problem.

{ledger_reverify_list}

### P0 — Immediate (fence-first)

{p0_todos_with_file_paths}

### P1 — This Week

{p1_todos_with_file_paths}

### P2 — Continuous Improvement

{p2_todos_with_file_paths}

## Start

Begin autonomous execution with P0. Report back only at tier boundaries or on hard stops.
````

---

## Placeholder Reference

| Placeholder | Source | Format |
|------------|--------|--------|
| `{score}` | Report Section 2 total score | Integer |
| `{level}` | Report Section 2 risk level | `CRITICAL` / `HIGH` / `MODERATE` / `LOW` / `EXCELLENT` |
| `{refactoring_risk}` | Report Section 2.1 | Integer 0-100 |
| `{refactoring_risk_level}` | Report Section 2.1 | `MINIMAL` / `LOW` / `MODERATE` / `HIGH` / `EXTREME` |
| `{ai_extension_risk}` | Report Section 2.2 | Integer 0-100 |
| `{ai_extension_risk_level}` | Report Section 2.2 | Same bands as above |
| `{dominant_amplifier}` | Report Section 2.2 "Dominant amplifier" field | Short phrase |
| `{top_issues_numbered_list}` | Report Section 4 top 5 issues | `1. [summary] — \`file_path\`` per line |
| `{existing_rules_list}` | Report Section 8 "Existing configuration detected" | `- \`path/to/rule.mdc\` — description` per line |
| `{ledger_reverify_list}` (v4) | history `standing_deductions` + Section 4 issues | Numbered list: each item = finding + its `verify_cmd` (if no ledger exists, write "First scan — nothing inherited, proceed to P0") |
| `{p0_todos_with_file_paths}` | Report Section 9 P0 roadmap | Numbered list, each with file path + expected outcome |
| `{p1_todos_with_file_paths}` | Report Section 9 P1 roadmap | Same as above |
| `{p2_todos_with_file_paths}` | Report Section 9 P2 roadmap | Same as above |

### TODO Item Format

Each TODO must follow this structure:

```
N. [Action verb] `target/file/path.js` (NNN lines) — [specific change description].
   Target: [measurable expected outcome].
```

Example — code refactor:

```
1. Split `src/app/(main)/account/agents/page.js` (1225 lines) into 3-4 sub-components
   + custom hooks. Target: each resulting file ≤ 1200 tokens (~300 LOC).
```

Example — AI fence creation (v3):

```
1. Create `AGENTS.md` at repo root (currently missing). Include sections:
   "Dev environment", "Conventions", "Testing", "Cursor Cloud specific instructions".
   Target: file present, ≥ 100 lines, covers top 3 conventions cited in report Section 5.5.
```

Example — prohibition addition:

```
2. Add `PR-013:` entry to `docs/proposed-rules.md` targeting the "3 coexisting toast
   systems" finding. Include grep-verifiable ❌ pattern: ❌ `import.*from "react-toastify"`.
   Target: prohibition_density rises by 1/10kLOC on next scan.
```

Example — structural scan test:

```
3. Create `src/lib/__tests__/toast-uniformity.test.js` — scan src/ for imports of
   react-toastify, sonner, custom-toast; fail if more than one is used. Target:
   structural_invariant_tests count rises from 0 to 1.
```
