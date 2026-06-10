# Report Output Template v4.0.0

This file defines the **mandatory output structure** for the Vibe Coding Risk Analyzer.
The Agent MUST read this file before generating any report and fill in every section below.
Sections cannot be skipped, reordered, or removed. If a section has no findings, output it
with "No issues found."

> **v4 changes:** every Deductions table gains `ID` + `Kind` columns (sub-item id from
> scoring-reference; kind = policy/debt/disputed) and the full set is also emitted as
> `.vibe-risk/scorecard.json`. Section 2 adds **Drift Watch** when health ≥ 90 and uses
> "AI-native ceiling reached" wording at total ≥ 95. Section 5 gains conditional
> **5.13 AI App Surface**. Section 6 adds census class breakdown, coverage denominator
> audit, and perf-debt candidates→confirmed. Section 10 gains the **standing-deduction
> ledger diff**. Monorepo: one column per package (each package keeps its own
> history + scorecard). Template text is English; fill it in the user's language.

---

<!-- TEMPLATE STARTS HERE — Copy everything below and fill in the placeholders -->

# Vibe Coding Risk Report

## 1. Project Overview

| Field            | Value                    |
|-----------------|--------------------------|
| Project          | `{project_name}`        |
| Scan Date        | `{YYYY-MM-DD HH:mm}`   |
| Scan Mode        | `{Quick / Full}`        |
| Skill Version    | `4.0.0`                  |
| Tech Stack       | {e.g. Next.js 14, React 18, TypeScript 5, Tailwind CSS} |
| Stack Type       | {frontend / backend / fullstack} |
| Source Directory  | `{src_path}`            |
| Total Files      | {number} source files   |
| Total Lines      | {number} lines          |
| Total Tokens (approx) | {number} tokens (chars/4) |
| Languages        | {breakdown, e.g. TypeScript 68%, JavaScript 25%, CSS 7%} |
| Monorepo         | {Yes (N packages, per-package trend lines) / No}  |
| `.vibe-riskrc`   | {detected: vendorGlobs N, dataAssetGlobs N / absent (whole tree first-party)} |
| AI App Surface (Dim 13) | {active — LLM signals: …} / inactive |

---

## 2. Overall Score & Risk Levels

```
Score: {XX}/100    Risk: {LEVEL}

{progress_bar}
```

<!-- Progress bar format example:
Score: 42/100    Risk: HIGH

[████████░░░░░░░░░░░░] 42%
-->

| Comparison       | Score |
|-----------------|-------|
| This scan        | {XX}  |
| Previous scan    | {XX or "N/A (first scan)"} |
| Delta            | {+X / -X / N/A}  |

<!-- Previous scan data comes from .vibe-risk-history.json in the project root.
     If schema_version < 2, note migration and mark new-dimension deltas as N/A.
-->

### 2.1 Refactoring Risk

| Metric                  | Value                                         |
|------------------------|-----------------------------------------------|
| Total Source Files      | **{number}** files                            |
| Total Lines of Code     | **{number}** lines                            |
| Project Scale           | **{TINY / SMALL / MEDIUM / LARGE / VERY LARGE / MASSIVE}** |
| Perf/Memory Debt Signals | **{number}** signals (×{multiplier})         |
| **Refactoring Risk Score**  | **{XX}/100**                                  |
| **Refactoring Risk Level**  | **{MINIMAL / LOW / MODERATE / HIGH / EXTREME}** |

```
Refactoring Risk: {XX}/100    Level: {LEVEL}

{refactoring_risk_bar}
```

**Refactoring risk factor breakdown:**

| Factor | Value | Multiplier | Impact |
|--------|-------|-----------|--------|
| Health Deficit | 100 - {score} = {deficit} | (base) | {assessment} |
| Project Scale | {scale} ({LOC} LOC, {files} files) | ×{size_mult} | {assessment} |
| Test Safety Net | {coverage}% coverage | ×{safety_mult} | {assessment} |
| Perf/Memory Debt | {signal_count} signals | ×{perf_mult} | {assessment} |

### 2.2 AI Extension Risk (NEW in v3)

> *Answers: "will the next AI session regress the codebase?"*

| Metric                  | Value                                         |
|------------------------|-----------------------------------------------|
| Pattern Consistency (Dim 2) | {XX}/14 → ×{pattern_drift_mult} |
| AI Context Artifacts (Dim 5) | {XX}/10 → ×{context_deficit_mult} |
| Explicit Prohibition Density (Dim 8) | {XX}/6 → ×{prohibition_deficit_mult} |
| Determinism (Dim 11) | {XX}/3 → ×{determinism_mult} |
| **AI Extension Risk Score** | **{XX}/100** |
| **AI Extension Risk Level** | **{MINIMAL / LOW / MODERATE / HIGH / EXTREME}** |

```
AI Extension Risk: {XX}/100    Level: {LEVEL}

{ai_extension_risk_bar}
```

**Dominant amplifier:** {e.g. "Pattern drift (×1.3) + prohibition deficit (×1.2) — adding grep-verifiable ❌ rules is the highest-leverage fix"}

### 2.2b Drift Watch (v4 — REQUIRED when health ≥ 90)

> In the high-score regime both multiplicative risk formulas saturate (deficit→0),
> so report leading indicators instead. Formulas: scoring-reference § Drift Watch.

| Indicator | Value | Rating |
|---|---|---|
| Guard density on new modules | {N guards / M new modules} | {🟢/🟡/🔴} |
| New-code coverage (this scan's diff) | {XX}% | {🟢/🟡/🔴} |
| Stale prohibitions | {N} | {🟢/🟡/🔴} |

{If total ≥ 95: "**AI-native ceiling reached** — all remaining deductions are
registered policy entries (see §10.5 ledger)". Any 🔴 → emit a targeted P1 action.}

### 2.3 Performance & Memory Debt Breakdown

| Category | Signal Count | Top Offenders |
|----------|-------------|--------------|
| Memory leaks (unmatched listeners/timers/subscriptions) | {N} | `{file1}`, `{file2}` |
| Heavy/duplicate dependencies | {N} | {e.g. "moment.js + dayjs coexist"} |
| Full-library imports (not tree-shaken) | {N} | {e.g. "`import _ from 'lodash'` in 5 files"} |
| Missing code splitting / lazy loading | {N} | {e.g. "12 route components directly imported"} |
| Missing virtualization | {N} | {e.g. "3 list views with unbounded .map()"} |
| Unbounded data loading | {N} | {e.g. "fetch-all without pagination in api.js"} |
| State bloat / unbounded growth | {N} | {e.g. "18 Redux slices, event log never cleared"} |
| **Total** | **{total}** | |

<!-- Module stacking (duplicate toast/HTTP/date libs) moved to Pattern Consistency (§5.2). -->

**Scale classification:**

| LOC Range | File Count Range | Scale |
|-----------|-----------------|-------|
| < 2k | < 30 | TINY |
| 2k – 10k | 30 – 100 | SMALL |
| 10k – 30k | 100 – 300 | MEDIUM |
| 30k – 80k | 300 – 700 | LARGE |
| 80k – 200k | 700 – 1500 | VERY LARGE |
| > 200k | > 1500 | MASSIVE |

**Assessment:** {2-4 sentence assessment covering BOTH risk metrics, e.g. "Medium-scale project (25k LOC). Refactoring Risk HIGH (67): 18 perf debt signals + 0% coverage dominate. AI Extension Risk EXTREME (82): no `AGENTS.md`, 0 grep-verifiable prohibitions, 3 coexisting state libs. Priority: ship `AGENTS.md` + first `.cursor/rules/*.mdc` BEFORE attempting structural refactor — the refactor itself will regress without a fence in place."}

---

## 3. Dimension Scores

```
Module Granularity & SRP (incl Complexity)  {XX}/14  {bar}
Pattern Consistency                          {XX}/14  {bar}
Type Safety & Contracts                      {XX}/12  {bar}
Test Coverage & Structural Invariants        {XX}/12  {bar}
AI Context Artifacts                         {XX}/10  {bar}
Architecture & Structure                     {XX}/8   {bar}
Dependency Health                            {XX}/7   {bar}
Explicit Prohibition Density                 {XX}/6   {bar}
Naming & Discoverability                     {XX}/6   {bar}
Duplication & Dead Code                      {XX}/5   {bar}
Determinism & Side-Effect Hygiene            {XX}/3   {bar}
Security & Tooling Config                    {XX}/3   {bar}
AI App Surface (conditional, v4)             {XX}/8   {bar}   ← only when active
```

<!-- v4: when Dim 13 is active, show the raw sum (max 108) and the normalized total:
     Total = round(raw / 108 × 100). State both numbers explicitly. -->

> **scorecard.json**：本节所有维度分的机读推导（每条扣分的子项 ID/数值/kind）已写入
> `.vibe-risk/scorecard.json`——同一 commit 任何 agent 重打分必须产出相同 scorecard。

<!-- Bar format: use █ for filled, ░ for empty, scaled to 20 chars width.
Example for 11/14:
Module Granularity & SRP  11/14  ████████████████░░░░
Example for 3/8:
Architecture & Structure   3/8   ███████░░░░░░░░░░░░░

In Quick mode, manual-only sub-scores show:
Pattern Consistency        N/A  [----partial, automation only----]
-->

---

## 4. Top 5 Urgent Issues

> If AI Extension Risk level is HIGH or EXTREME, at least one issue MUST target
> the dominant amplifier (missing AGENTS.md, absent prohibitions, pattern drift, etc.).
>
> If Refactoring Risk is HIGH or EXTREME, include at least one refactoring-related issue.
>
> Issues sorted by severity (CRITICAL > HIGH > MEDIUM > LOW).

### Issue 1

| Field     | Detail |
|-----------|--------|
| Severity  | `{CRITICAL / HIGH / MEDIUM / LOW}` |
| Dimension | {which of the 12 dimensions} |
| Summary   | {one-line description} |
| Files     | `{file_path}` (+{N} more) |
| Fix       | {concrete remediation action} |

### Issue 2

| Field     | Detail |
|-----------|--------|
| Severity  | `{CRITICAL / HIGH / MEDIUM / LOW}` |
| Dimension | {which of the 12 dimensions} |
| Summary   | {one-line description} |
| Files     | `{file_path}` (+{N} more) |
| Fix       | {concrete remediation action} |

### Issue 3

| Field     | Detail |
|-----------|--------|
| Severity  | `{CRITICAL / HIGH / MEDIUM / LOW}` |
| Dimension | {which of the 12 dimensions} |
| Summary   | {one-line description} |
| Files     | `{file_path}` (+{N} more) |
| Fix       | {concrete remediation action} |

### Issue 4

| Field     | Detail |
|-----------|--------|
| Severity  | `{CRITICAL / HIGH / MEDIUM / LOW}` |
| Dimension | {which of the 12 dimensions} |
| Summary   | {one-line description} |
| Files     | `{file_path}` (+{N} more) |
| Fix       | {concrete remediation action} |

### Issue 5

| Field     | Detail |
|-----------|--------|
| Severity  | `{CRITICAL / HIGH / MEDIUM / LOW}` |
| Dimension | {which of the 12 dimensions} |
| Summary   | {one-line description} |
| Files     | `{file_path}` (+{N} more) |
| Fix       | {concrete remediation action} |

<!-- If fewer than 5 issues exist, fill remaining slots with "No additional issues." -->

---

## 5. Detailed Diagnostics

> Each sub-section header includes the dimension score.
> File counts and line counts must be consistent with Section 2.
>
> **v4 — Deductions table format (applies to every subsection below):**
>
> | ID | Issue | Deduction | Kind | Reason |
> |----|-------|-----------|------|--------|
> | {SRP-F2} | {specific finding} | -{N} | {policy/debt/disputed} | {why it matters} |
>
> `ID` comes from the scoring-reference sub-item tables; `Kind` matches the ledger.
> Size/duplication subsections count first-party code only; vendored/dataAsset hits
> go to the "third-party in tree" list at the end of §5.1 and are never deducted.

### 5.1 Module Granularity & SRP (incl. Complexity) — {XX}/14

**Findings:**

- Total first-party source files: {N} (census class breakdown in §6)
- **Flow-cost (primary)**: {N} flows sampled, p90 = {X}k tokens, worst = `{flow}` ({X}k, {M} files)
- Files > ~2000 tokens: {count} ({X}% of first-party) — {list or "None"}
- Files in 1200–2000 band: {count} ({X}%; {N} net-new from this scan's splits excluded, counted from next scan)
- Functions > 100 lines: {list or "None"}; > 50 lines: {count}
- God files (mixed responsibilities): {list or "None"}
- Functions with cognitive complexity > 15: {count and top offenders}
- **Third-party in tree (reported, never deducted)**: {vendored/dataAsset hits with sizes, or "None"}

**Deductions:**

| Issue | Deduction | Reason |
|-------|-----------|--------|
| {specific finding} | -{N} | {why it matters} |

**Recommendations:**

- {actionable fix 1}
- {actionable fix 2}

---

### 5.2 Pattern Consistency — {XX}/14

**Findings:**

- State management approaches: {list}
- Data fetching patterns: {list}
- Async styles: {mixed / uniform}
- CSS approaches: {breakdown}
- Component patterns: {class vs function}
- **Module stacking** (v3): {e.g. "toast libs: sonner + react-toastify coexist"}
- Formatter coverage: {N% of files conform}

**Deductions:**

| Issue | Deduction | Reason |
|-------|-----------|--------|
| {specific finding} | -{N} | {why it matters} |

**Recommendations:**

- {actionable fix 1}
- {actionable fix 2}

---

### 5.3 Type Safety & Contracts — {XX}/12

**Findings:**

- TypeScript usage: {yes/no, strict mode on/off}
- Unannotated `any` occurrences: {count}
- Annotated `any` / `@ts-expect-error` (0.5× weight): {count}
- Type assertions (`as`): {count}
- **Exported function contract coverage** (v3): {XX}% have `@param`+`@returns` or TS types
- **API routes with schemas** (v3): {XX}% of routes
- **Redux slices with `@typedef`** (v3): {XX}% of slices
- Generic catch blocks: {count}
- Missing error boundaries (React): {count}

**Deductions:**

| Issue | Deduction | Reason |
|-------|-----------|--------|
| {specific finding} | -{N} | {why it matters} |

**Recommendations:**

- {actionable fix 1}
- {actionable fix 2}

---

### 5.4 Test Coverage & Structural Invariants — {XX}/12

**Findings:**

- Test files found: {count}
- Test runner configured: {yes/no, which runner}
- Test-to-source ratio: {N test files per N source files, percentage}
- **Coverage denominator audit (v4)**: include = {globs}; exclude = {globs};
  coverage universe = {N} lines (tested source files missing from include: {list or "None"})
- **Critical path coverage (primary)**: {list per path with %}
- Overall coverage: {XX}% lines ({covered}/{universe}); Δ vs last scan =
  {+N covered lines} (percentage swings caused by pure structural refactors do not move this dimension)
- Project profile: {standard / ui_heavy (UI/view-layer code = {X}% of first-party source)}
- **Structural invariant scan tests**: {count}, e.g. `hydration-safety.test.js`
- Test quality (sampled): {e.g. "mostly snapshot tests, few behavioral assertions"}

**Deductions:**

| Issue | Deduction | Reason |
|-------|-----------|--------|
| {specific finding} | -{N} | {why it matters} |

**Recommendations:**

- {actionable fix 1}
- {actionable fix 2}

---

### 5.5 AI Context Artifacts — {XX}/10 (NEW in v3)

**Findings:**

- `AGENTS.md` / `.cursorrules` / `CLAUDE.md` at root: {present/absent, line count}
- `.cursor/rules/*.mdc` count: {N}, covering: {domains listed}
- `.claude/skills/*/SKILL.md` count: {N}
- `docs/architecture/` / ADR directory: {present/absent, doc count}
- `README.md` quality: {substantive / placeholder / absent}
- Per-domain typedef files (`src/types/<domain>.js` or similar): {yes/no}
- Active migration playbook (if migration in progress): {yes/no/N/A}

**Deductions:**

| Issue | Deduction | Reason |
|-------|-----------|--------|
| {specific finding} | -{N} | {why it matters} |

**Recommendations:**

- {actionable fix 1 — e.g. "Create `AGENTS.md` covering dev env + top 3 conventions"}
- {actionable fix 2}

---

### 5.6 Architecture & Structure — {XX}/8

**Findings:**

- Directory depth: {max levels}
- Separation of concerns: {assessment}
- Predictable file locations: {yes/no + explanation}
- Layer violations: {e.g. "components directly importing from API layer"}

**Deductions:**

| Issue | Deduction | Reason |
|-------|-----------|--------|
| {specific finding} | -{N} | {why it matters} |

**Recommendations:**

- {actionable fix 1}
- {actionable fix 2}

---

### 5.7 Dependency Health — {XX}/7

**Findings:**

- Circular dependencies: {count from madge, list top offenders}
- Unused dependencies: {list from Knip}
- Unlisted dependencies: {list from Knip}
- Known vulnerabilities (audit): {critical: N, high: N, moderate: N, low: N}

**Deductions:**

| Issue | Deduction | Reason |
|-------|-----------|--------|
| {specific finding} | -{N} | {why it matters} |

**Recommendations:**

- {actionable fix 1}
- {actionable fix 2}

---

### 5.8 Explicit Prohibition Density — {XX}/6 (NEW in v3)

**Findings:**

- Total grep-verifiable ❌ prohibitions: {N}
- Density per 10k LOC: {N/10kLOC}
- `PR-NNN:`-style indexed prohibitions with backticked patterns: {N}
- Sources:
  - `.cursor/rules/*.mdc`: {N}
  - `AGENTS.md`: {N}
  - `.claude/skills/*/SKILL.md`: {N}
  - `docs/proposed-rules.md`: {N}
- Stale prohibitions (pattern no longer in codebase): {N}
- Vague prose ❌ without grep-able pattern: {N}

**Deductions:**

| Issue | Deduction | Reason |
|-------|-----------|--------|
| {specific finding} | -{N} | {why it matters} |

**Recommendations:**

- {actionable fix 1 — e.g. "Convert top 3 drift patterns into `PR-NNN:` entries in proposed-rules.md"}
- {actionable fix 2}

---

### 5.9 Naming & Discoverability — {XX}/6

**Findings:**

- File naming convention: {e.g. "kebab-case in /utils, PascalCase in /components — consistent"}
- Exported symbol naming: {assessment}
- Semantic clarity: {e.g. "files like helpers.js, utils.js are vague"}
- Service/Hook/Util pattern adoption: {percentage or list}

**Deductions:**

| Issue | Deduction | Reason |
|-------|-----------|--------|
| {specific finding} | -{N} | {why it matters} |

**Recommendations:**

- {actionable fix 1}
- {actionable fix 2}

---

### 5.10 Duplication & Dead Code — {XX}/5

**Findings:**

- jscpd duplication rate: {X.X%}
- Largest duplicated blocks: {list top 3 with file paths and line ranges}
- Unused exports (Knip): {count}
- Unused files (Knip): {count}
- Commented-out code blocks: {count, top offenders}

**Deductions:**

| Issue | Deduction | Reason |
|-------|-----------|--------|
| {specific finding} | -{N} | {why it matters} |

**Recommendations:**

- {actionable fix 1}
- {actionable fix 2}

---

### 5.11 Determinism & Side-Effect Hygiene — {XX}/3 (NEW in v3)

**Findings:**

- `typeof window !== "undefined"` in `useMemo` / JSX: {count, files}
- `useState(Date.now())` / `useState(Math.random())` / render-time `uuid()`: {count}
- `useLayoutEffect` used to patch hydration: {count}
- Import-time side effects: {count}
- Global singletons initialized at module load: {count}
- Tests using real `Date.now()` / `Math.random` / real network: {count}

**Deductions:**

| Issue | Deduction | Reason |
|-------|-----------|--------|
| {specific finding} | -{N} | {why it matters} |

**Recommendations:**

- {actionable fix 1}
- {actionable fix 2}

---

### 5.12 Security & Tooling Config — {XX}/3

**Findings:**

- Hardcoded secrets/API keys: {count, files}
- `.env.example` present: {yes/no}
- `.gitignore` covers sensitive files: {yes/no}
- ESLint/Biome configured: {yes/no}
- Linter rules disabled via inline comments: {count}

<!-- v3 note: README / formatter checks moved to §5.5 AI Context Artifacts and §5.2 Pattern Consistency respectively. -->

**Deductions:**

| Issue | Deduction | Reason |
|-------|-----------|--------|
| {specific finding} | -{N} | {why it matters} |

**Recommendations:**

- {actionable fix 1}
- {actionable fix 2}

---

### 5.13 AI App Surface — {XX}/8 (only when Dim 13 active; otherwise a single line: "inactive — no LLM signals")

**Findings:**

- LLM signals detected: {SDKs / provider registry / SSE routes / prompt assets / agent CLI spawn}
- Prompt assets: {centralized/versioned?; change gate = golden / eval / BDD / strict-equality contract / None}
- Streaming & abort hygiene: {error-frame tests yes/no; AbortSignal wired through yes/no; timeout cap + fallback kill yes/no}
- Cost guardrails: {input limits / rate-limit / configurable timeouts}
- Provider abstraction: {single registry yes/no; LLM keys env-only yes/no}
- Agent protocol divergence registry: {present (verification per entry?) / absent / N/A}

**Deductions:** (v4 table format, ID = AIS-*)

**Recommendations:**

- {e.g. "map each prompt asset to a golden test; add an SSE error-frame spec"}

---

## 6. Tool Scan Data Summary

> Raw output summaries from automated tools. Include only if the tool was executed.
> If a tool failed or was skipped, state the reason — and call out **vacuous passes**
> (tool ran but processed 0 relevant files, e.g. alias-blind madge) explicitly.

### Census class breakdown (v4)

```
first-party source: {N} files / {N} lines / ~{N}k tokens
tests:              {N} files
data assets:        {N} files (exempt from god-file logic)
vendored:           {N} files / ~{N}k tokens (excluded from thresholds; listed in §5.1 third-party-in-tree)
generated:          {N} files
```

### madge (Circular Dependencies)

```
{paste key output or "Skipped: [reason]"}
```

### Knip (Dead Code & Unused Dependencies)

```
{paste key output or "Skipped: [reason]"}
```

### Dependency Audit (npm audit / pip-audit / govulncheck)

```
{paste key output or "Skipped: [reason]"}
```

### jscpd (Code Duplication)

```
{paste key output or "Skipped: [reason]"}
```

### react-doctor (React Health)

```
{paste key output or "Skipped: not a React project"}
```

### Performance & Memory Debt Scan (Step 8 + Phase 2 adjudication)

```
Memory leak candidates:   {N} (addEventListener: {n}, setInterval: {n}, useEffect no cleanup: {n}, ...)
Heavy/duplicate deps:     {N} ({list or "None"})
Full-library imports:     {N} ({list or "None"})
Missing code splitting:   {N} route-level components
Missing virtualization:   {N} unbounded list renders
Unbounded data loading:   {N} endpoints
State bloat signals:      {N}

Candidates: {N}  →  Confirmed (Phase 2): {M}  →  Multiplier: ×{X.XX}  (v4: confirmed only)
Discarded examples: {e.g. "126 addEventListener hits are one-time bindings on persistent DOM"}
```

### AI Context Artifact Census (Step 11 — NEW)

```
AGENTS.md:                    {present, N lines / absent}
.cursor/rules/*.mdc:          {N files, covers: [domains]}
.claude/skills/*/SKILL.md:    {N skills}
docs/architecture/:           {N docs / absent}
docs/adr/:                    {N records / absent}
README.md:                    {substantive / placeholder / absent}
src/types/<domain>.js:        {N domain files / N/A}
```

### Explicit Prohibition Density (Step 12 — NEW)

```
Total ❌ prohibitions:         {N}
  with backticked patterns:   {N}
  with PR-NNN index:          {N}
Density per 10k LOC:          {N}
Stale (pattern removed):      {N}
```

### Structural Invariant Tests (Step 13 — NEW)

```
Full-tree scan tests found:   {N}
  {list each: src/lib/__tests__/<name>.test.js — guards: <topic>}
```

### Test Runner

```
{paste test count / coverage summary or "No test runner configured"}
Critical path coverage:
  auth:           {XX}%
  payment:        {XX}% / N/A
  data-mutation:  {XX}%
```

---

## 7. Recommended Tools & Configuration

> Tools the project should adopt but currently lacks.

| Tool | Purpose | Install Command | Priority |
|------|---------|----------------|----------|
| {tool} | {purpose} | `{command}` | {MUST / RECOMMENDED / OPTIONAL} |

<!-- Only list tools the project does NOT already have.
     If all recommended tools are present, write "All recommended tools are already configured." -->

---

## 8. Agent Rules & Skills Recommendations

> Based on scan findings and existing AI configuration.
> See SKILL.md § "Agent Rules & Skills recommendation matrix" for trigger table.

**Existing configuration detected:**

- `AGENTS.md`: {present, N lines / absent}
- Rules: {list found .cursor/rules/*.mdc files, or "None"}
- Skills: {list found .claude/skills/*/SKILL.md files, or "None"}
- Other: {.cursorrules, .github/copilot-*, or "None"}

**Recommendations:**

### {[DOC] / [RULE] / [SKILL] / [TEST]} `{name}` — Priority: {MUST / RECOMMENDED / OPTIONAL}

- **Triggered by:** {which finding from this scan}
- **Purpose:** {what behavior this Rule/Skill should constrain}
- **Content skeleton:**

```
{3-5 lines showing the core content outline}
{User can ask the Agent to expand this into a full Rule/Skill}
```

<!-- Repeat the above block for each recommendation.
     If no recommendations, write "All necessary Agent Rules and Skills are already in place." -->

---

## 9. Remediation Roadmap

> **v3 guidance:** If AI Extension Risk ≥ HIGH, P0 MUST include creating/fixing
> AI context artifacts (`AGENTS.md`, first rule, first scan test) **before** any
> structural refactoring — without a fence, the refactor will regress.

### P0 — Immediate (block further development until resolved)

| # | Action | Expected Benefit | Related Dimension |
|---|--------|-----------------|-------------------|
| 1 | {specific action} | {benefit} | {dimension} |

### P1 — This Week (complete within 5 working days)

| # | Action | Expected Benefit | Related Dimension |
|---|--------|-----------------|-------------------|
| 1 | {specific action} | {benefit} | {dimension} |

### P2 — Continuous Improvement (ongoing practices)

| # | Action | Expected Benefit | Related Dimension |
|---|--------|-----------------|-------------------|
| 1 | {specific action} | {benefit} | {dimension} |

<!-- Every P-level must have at least one item, or state "No actions at this priority level." -->

---

## 10. Score History

<!-- This section is auto-populated from .vibe-risk-history.json (v2 schema).
     Show up to the last 5 scans. If this is the first scan, write "First scan — no history."
     If migrating from v1 schema, note it and mark new-dimension columns "N/A" for old scans. -->

| Date | Mode | Score | Level | Refactor Risk | AI Extension Risk | Delta | Top Issue |
|------|------|-------|-------|---------------|-------------------|-------|-----------|
| {date} | {mode} | {score} | {level} | {refactor}/100 {level} | {ai_ext}/100 {level} | {delta} | {top_issue} |

**Per-dimension slope (last 3 scans):**

```
Module SRP             {slope}  {↗ / ↘ / →}
Pattern Consistency    {slope}  {↗ / ↘ / →}
Type Safety            {slope}  {↗ / ↘ / →}
Test Coverage          {slope}  {↗ / ↘ / →}
AI Context Artifacts   {slope}  {↗ / ↘ / →}
Architecture           {slope}  {↗ / ↘ / →}
Dependency Health      {slope}  {↗ / ↘ / →}
Prohibition Density    {slope}  {↗ / ↘ / →}
Naming                 {slope}  {↗ / ↘ / →}
Duplication            {slope}  {↗ / ↘ / →}
Determinism            {slope}  {↗ / ↘ / →}
Security & Tooling     {slope}  {↗ / ↘ / →}
```

**Drift alerts:** {list any dimensions with consistently negative slope, e.g. "Pattern Consistency has declined for 3 consecutive scans — AI is introducing new patterns without consolidating old ones"}

<!-- Slope = (current - earliest_of_last_3) / scans_compared.
     ↗ positive, ↘ negative, → flat within ±1. Alert on ↘ for 2+ consecutive scans. -->

### 10.5 Standing Deduction Ledger diff (v4 — from Step 14)

| Status | ID | Dimension/Sub-item | Points | Kind | Notes |
|--------|----|--------------------|--------|------|-------|
| kept | {SD-001} | {module_srp / SRP-F1} | {-2} | {policy} | {verify_cmd still triggers; last_verified updated} |
| **cleared (stale)** | {SD-003} | {type_safety / TYP-E1} | {+1 reclaimed} | {debt} | {prior finding no longer reproduces on re-verification} |
| **added** | {SD-004} | {…} | {-1} | {disputed} | {borderline call this scan; re-read next scan} |

<!-- If the ledger is empty, write "Ledger empty — no standing deductions."
     Cleared entries MUST appear here or in top_issues — never vanish silently. -->

---

## 11. Remediation Prompt

> Copy the prompt below and paste it into a new AI conversation (interactive mode),
> or hand it off to an autonomous cloud agent (autonomous mode).

> **Mode used:** `{interactive / autonomous}` — {rationale, e.g. "autonomous because
> triggered by cloud agent" or "interactive because project has no scan tests yet"}

<!-- GENERATION INSTRUCTIONS (for the Agent, not shown in output):

1. Read [remediation-prompt.md](remediation-prompt.md) — this is the **single source of truth**
   for the prompt template (both interactive and autonomous variants).
2. Choose mode based on execution context:
   - interactive: default for human users; pauses for confirmation per TODO
   - autonomous: when user is a cloud agent, CI, or explicitly requests
3. Copy the correct prompt template from that file.
4. Replace all {placeholders} with actual data from this scan. See the "Placeholder Reference"
   table in remediation-prompt.md for detailed format instructions.
5. Output the filled prompt inside a fenced code block (```` ```` ````).
6. Language must match user preference.
-->

---

## 12. Dependency Graph

<!-- Phase 6 output. In Full mode, always generate static SVG/PNG. -->

**Static graph:** `{artifact_path, default .vibe-risk/dependency-graph.svg}`

{Optional: inline embed using HTML img tag if viewable}

**Interactive graph:** {command_if_user_wants_it, e.g. `npx skott --displayMode=webapp --cwd=src`}

**Visual findings:**

- God files (high fan-in + fan-out): {list nodes}
- Circular dependency clusters: {N clusters, top: `{files}`}
- Orphan nodes (dead code): {N nodes}
- Architecture violations (cross-layer edges): {N edges}

---

*Report generated by Vibe Coding Risk Analyzer v4.0.0*
