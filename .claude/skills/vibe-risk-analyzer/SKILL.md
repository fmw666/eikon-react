---
name: vibe-risk-analyzer
description: >
  Analyze project codebase health and vibe-coding risk with a 0-100 scoring
  system across 12 dimensions (plus a conditional AI App Surface dimension for
  LLM applications), centered on AI-as-maintainer concerns. Deterministic
  per-dimension scoring with a standing-deduction ledger that automatically
  re-verifies prior findings on every scan. Outputs a structured diagnostic report with scores,
  findings, paired Refactoring Risk + AI Extension Risk metrics (Drift Watch in
  the high-score regime), static dependency graph, and a ready-to-use
  remediation prompt (interactive or autonomous).
  Use this skill whenever the user asks to audit, analyze, score, or health-check
  their project, mentions "vibe coding risk", "code quality", "project health
  check", "risk analysis", "dependency graph", or wants to understand their
  codebase structure before refactoring — even if they don't explicitly say
  "vibe coding" (in any language).
version: 4.1.0
license: MIT
---

# Vibe Coding Risk Analyzer

Detect and quantify the risks accumulated from unchecked AI-assisted ("vibe") coding,
with scoring centered on **AI-as-maintainer** concerns rather than traditional human
code review. Produce a standardized diagnostic report with scores, findings, a
dependency graph, and a remediation plan.

Vibe-coded projects often look fine on the surface but harbor invisible structural
debt: god files that exhaust AI's context window, pattern drift that makes AI
coin-flip between three toast systems, missing type contracts that force AI to guess
call signatures, and the absence of AGENTS.md / rules / scan tests that would prevent
the next session from regressing. This skill makes that debt visible and actionable.

> **v4 note:** See [CHANGELOG.md](CHANGELOG.md). v4 makes scoring deterministic
> (sub-item IDs + composition formula + `scorecard.json`), adds a **standing
> deduction ledger** that re-verifies prior findings on every scan, declares
> vendored/data-asset code via `.vibe-riskrc.json`, reworks Module SRP around
> **flow-cost** (the token cost of understanding one business flow) instead of
> raw file size, makes coverage refactor-neutral & critical-path-first, and adds
> a conditional **AI App Surface** dimension for LLM applications.
> Full rationale & evidence: [PROPOSAL-v4.md](PROPOSAL-v4.md).

## When to activate

- User requests a project audit, health check, or risk analysis
- User mentions "vibe coding", "code quality", "project health check",
  "risk analysis", or "dependency graph" (in any language)
- User wants to visualize dependencies or understand codebase structure
- Before a major refactor to establish a baseline
- Before handing a project over to an AI agent for autonomous maintenance
- Periodically (recommended: every 2-4 weeks on active vibe-coded projects)

---

## Scan modes

| Mode | When to use | What runs | Time |
|------|------------|-----------|------|
| **Quick** | Fast pulse check, CI gate | Phase 1 only (automated tools), skip Phase 2 | ~2 min |
| **Full** | Periodic deep audit (default) | All phases + static dependency graph | ~10 min |

Default to **Full** when unspecified. In Quick mode, dimensions requiring manual
sampling (Pattern drift survey, Test quality review) score "N/A" and are re-weighted
proportionally so the total stays out of 100. AI-specific dimensions (Context
Artifacts, Prohibition Density, Structural Invariants, Determinism) remain fully
scored in Quick mode since they are automation-friendly.

---

## Scoring system (100 points, 12 dimensions + conditional Dim 13)

| # | Dimension | Weight | What it measures |
|---|-----------|--------|-----------------|
| 1 | Module Granularity & SRP (incl. Complexity) | 14 | **Flow-cost**（理解一条业务流需装载的 token）+ file/function size distribution; pure-data assets & delegation facades exempted |
| 2 | Pattern Consistency | 14 | Coding convention uniformity; module stacking (duplicate toast/HTTP/date libs) |
| 3 | Type Safety & Contracts | 12 | TS/JSDoc coverage on exported APIs, `any` usage, request/response schemas — AI's primary "memory" |
| 4 | Test Coverage & Structural Invariants | 12 | **Critical-path coverage first**, denominator-audited, refactor-neutral; scan-test fence density — AI's feedback loop |
| 5 | AI Context Artifacts | 10 | `AGENTS.md`, `.cursor/rules`, `.claude/skills`, ADRs — AI's long-term memory |
| 6 | Architecture & Structure | 8 | Directory organization, separation of concerns, layer clarity |
| 7 | Dependency Health | 7 | Circular deps, unused/vulnerable deps |
| 8 | Explicit Prohibition Density | 6 | Grep-verifiable ❌ / `PR-NNN:` rules per 10k LOC — AI's fence |
| 9 | Naming & Discoverability | 6 | Naming conventions, semantic clarity |
| 10 | Duplication & Dead Code | 5 | Copy-paste blocks, unused exports/files |
| 11 | Determinism & Side-Effect Hygiene | 3 | SSR/CSR divergence, non-deterministic render, import-time side effects |
| 12 | Security & Tooling Config | 3 | Hardcoded secrets, linter |
| **13** | **AI App Surface**（条件激活,v4 NEW） | **8** | LLM 应用专属:提示词资产管理、流式/中断卫生、成本护栏、provider 抽象、agent 协议漂移登记 |

**Dim 13 仅在 Step 0 检测到 LLM 应用特征时激活**（`@anthropic-ai/*`/openai/provider 注册表/
SSE chat 路由等）。激活时满分变为 108,总分归一化:`total = round(sum / 108 × 100)`;
未激活时按 12 维原样计 100,非 AI 项目不受任何影响。

**v4 评分确定性**：每条扣分子项有唯一 ID（如 `SRP-F2`）,维度分按统一组合公式计算
（同一证据只计一次、分档不叠加、维度内封顶）,并产出机读 `scorecard.json` 工件。
不再有"拿不准就从宽"——边界情况按公式取低档并登记 `disputed` 待下轮复核。
See [scoring-reference.md](scoring-reference.md) for per-dimension criteria & the
composition rules.

### Risk levels

| Score | Level | Meaning |
|-------|-------|---------|
| 0–30 | CRITICAL | Near-unmaintainable; AI cannot reliably work |
| 31–50 | HIGH | Structural refactoring urgently needed |
| 51–70 | MODERATE | Noticeable risks; needs continuous attention |
| 71–85 | LOW | Healthy; maintain current practices |
| 86–100 | EXCELLENT | Exemplary engineering practices |

### Risk metrics (paired) + high-score regime

The report shows **two independent risk numbers**:

- **Refactoring Risk (0-100)** — "will a large rewrite collapse?" — driven by
  size × health × test-safety × perf-debt（perf-debt 自 v4 起只计 Phase 2
  **确认后**的信号,不计裸 grep 候选）.
- **AI Extension Risk (0-100)** — "will the next AI session regress?" — driven by
  health × pattern-drift × prohibition-deficit × context-deficit × determinism.

**v4 high-score regime**：health ≥ 90 时 deficit 趋零,两个乘法公式饱和在 MINIMAL
而失去信息量。此时报告**额外**输出 **Drift Watch 三先行指标**（新增模块守卫密度 /
本轮 diff 新增代码覆盖率 / 禁令陈旧数）替代风险解读;**总分 ≥ 95 视为
"AI-native 满级"**——报告写"满级,剩余扣分均为台账内政策项",不写"距满分差 N 分"。

See `scoring-reference.md` § *AI Extension Risk Calculation* & § *Drift Watch* for formulas.

---

## Workflow

```
Phase 1 ─ Automated scanning     Collect raw data with tools (Steps 0–14,
  │                              incl. Step 0.5 .vibe-riskrc + Step 14 ledger re-verify)
Phase 2 ─ Manual analysis        Human-level judgment; confirm/discard perf-debt candidates
  │
Phase 3 ─ Generate report        Fill the mandatory template; emit scorecard.json
  │
Phase 4 ─ Persist history        Append to .vibe-risk-history.json (v3 schema, with ledger)
  │
Phase 5 ─ Remediation prompt     P-1 re-adjudication first, then interactive/autonomous
  │
Phase 6 ─ Static dependency graph  SVG/PNG to .vibe-risk/ (graphviz-free fallback included)
  │
Phase 7 ─ Self-evolution reflection  E1–E5 checklist; remind user to file a proposal
                                     if (and only if) this run deposited candidates
```

### Phase 1 — Automated scanning

Run a series of automated tools to gather raw data. This is the evidence
foundation — every score in the report traces back to data collected here.

**Read [references/automated-scanning.md](references/automated-scanning.md)**
for the complete step-by-step procedure (Steps 0–14, plus environment-pitfall
warnings: persistent shell cwd, CRLF anchors, multi-layer escaping).

Summary of steps:

| Step | What it does | Key tool |
|------|-------------|----------|
| 0 | Detect tech stack, framework, package manager; **detect LLM-app signals → activate Dim 13** | Read config files |
| **0.5** | **Read `.vibe-riskrc.json`** (vendorGlobs / dataAssetGlobs / generatedGlobs) (v4) | Read config |
| 1 | **Class-aware** census (source/test/data/vendored/generated) + flow-cost inputs | `references/scripts/census.mjs` |
| 2 | Circular dependency detection (**alias-aware fallback chain**) | `madge` → `skott` → import-scan |
| 3 | Unused deps & dead code (workspace-aware; skip + no-penalty if unconfigurable) | `knip` (JS/TS) |
| 4 | Vulnerability audit (mirror registries: explicitly hit the official one) | `npm audit` / `pip-audit` / `govulncheck` |
| 5 | Code duplication | `jscpd` |
| 6 | Test detection + coverage + **denominator audit** + critical path coverage | Glob + config read |
| 7 | Framework-specific scan — **advisory findings feed only, never a headline score** | `react-doctor` (React/Next.js) |
| 8 | Performance & memory debt — emits **candidates** (Phase 2 confirms) | Grep patterns |
| 9 | Existing Agent rules & skills inventory | Glob for .cursor/rules, .claude/skills |
| 10 | Score history | Read `.vibe-risk-history.json` |
| 11 | AI Context Artifact census | Glob for AGENTS.md, ADRs, docs/architecture |
| 12 | Explicit prohibition density | Grep for `❌` / `PR-\d+:` / "prohibited" |
| 13 | Structural invariant tests | Glob + scan for full-tree static analysis tests |
| **14** | **Standing-deduction ledger re-verification** (v4) | Run each entry's `verify_cmd` |

Each step has built-in fallbacks: if a tool fails, score manually from code
sampling and document the failure in the report. Never silently skip a dimension.
Empty-but-green tool results (e.g. madge processing 0 files under TS path
aliases) MUST be reported as **vacuous**, not as a pass.

### Phase 2 — Manual analysis (Full mode only)

Automated tools catch surface-level issues. This phase applies engineering judgment
to assess dimensions that require understanding intent.

1. **Pattern consistency sampling**: Sample 5–8 files across different directories.
   Look for mixed state management, data fetching, async styles, CSS approaches,
   and **module stacking** (duplicate toast/HTTP/date libs).

2. **Naming audit**: Scan file names and exported symbols for consistent conventions.

3. **Architecture review**: Examine the top-level directory tree.

4. **SRP spot check**: Open the 10 largest files. Determine if each handles a single
   responsibility or mixes concerns.

5. **Type safety & contract check**: Search for unannotated `any`, missing
   `@param`/`@returns` on exported functions, Redux slices without `@typedef`,
   API routes without request/response schema.

6. **Test quality spot check**: Sample 2–3 test files. Check for behavioral
   assertions vs snapshot-only, edge case coverage, and **critical path coverage**
   (auth / payment / data-mutation).

> **v4 rule — confirm-or-discard:** Step 8 only produces perf-debt
> **candidates**. In this phase, adjudicate each candidate category (sampling is
> fine) into `confirmed` / `discarded`; **only `confirmed` signals feed the
> Refactoring-Risk multiplier**. Report both numbers (candidates → confirmed) —
> the conversion rate itself is a false-positive-rate signal.

### Phase 3 — Generate report

1. Read [report-template.md](report-template.md) — this is **mandatory**.
2. Fill in every section. Never skip a section.
3. Consult [scoring-reference.md](scoring-reference.md) for per-dimension
   criteria, the **global composition rules**, and calibration anchors
   (5 anchors; Anchor E "AI-native" — **≥95 is 满级**, report it as such).
4. All scores must be specific integers, never ranges. Write `10/12`, not `8-12/12`.
5. **Every deduction cites its sub-item ID** (e.g. `SRP-F2`) in the Deductions
   tables, carries a `kind` (`policy` / `debt` / `disputed`), and the full set is
   emitted as `.vibe-risk/scorecard.json` — the machine-readable derivation of
   the total. Two agents scoring the same commit MUST produce identical scorecards.
6. All problems must reference concrete file paths (and line numbers when available).
7. Report language follows the user's language preference.
8. **Compute both risk metrics** (Refactoring Risk + AI Extension Risk); when
   health ≥ 90 additionally compute **Drift Watch** per scoring-reference.
9. For HIGH/EXTREME AI Extension Risk, P0 remediation MUST include:
   - Create `AGENTS.md` if missing
   - Add first `.cursor/rules/*.mdc` covering top drifting pattern
   - Add first structural scan test
   - Convert top 3 drifting patterns into grep-verifiable `❌` prohibitions
10. For HIGH/EXTREME Refactoring Risk, add strategy recommendations per v2.
11. **Ledger reconciliation**: the report's Section 10 shows the standing-deduction
    diff (新增 / 清除(陈旧) / 维持) produced by Step 14 — never re-derive prior
    deductions from prose.

### Phase 4 — Persist score history

After generating the report, write/update `.vibe-risk-history.json` in the project
root. **v4 uses schema v3** (adds the standing-deduction ledger + rubric marker):

```json
{
  "schema_version": 3,
  "standing_deductions": [
    {
      "id": "SD-001",
      "dimension": "module_srp",
      "sub_item": "SRP-F3",
      "points": -2,
      "kind": "policy",
      "reason": "vendored upstream-fork file (8.8k tokens) locks the >4000 tier",
      "clearing_condition": "upstream upgrade, or the project's divergence-registry policy changes to allow splitting",
      "verify_cmd": "node references/scripts/census.mjs --file <path/to/vendored-file>",
      "registered": "2026-06-09",
      "last_verified": "2026-06-10"
    }
  ],
  "scans": [
    {
      "date": "2026-04-23T12:00:00Z",
      "mode": "full",
      "skill_version": "4.0.0",
      "rubric": "v4",
      "total": 58,
      "level": "MODERATE",
      "total_loc": 24350,
      "total_files": 187,
      "project_scale": "MEDIUM",
      "refactoring_risk": 53,
      "refactoring_risk_level": "MODERATE",
      "ai_extension_risk": 71,
      "ai_extension_risk_level": "HIGH",
      "drift_watch": null,
      "perf_debt_confirmed": 9,
      "perf_debt_candidates": 21,
      "prohibition_count": 4,
      "context_artifact_score": 5,
      "ai_app_surface_active": false,
      "scorecard": ".vibe-risk/scorecard.json",
      "dimensions": {
        "module_srp": 10,
        "pattern_consistency": 8,
        "type_safety_contracts": 6,
        "test_coverage_invariants": 4,
        "ai_context_artifacts": 5,
        "architecture": 6,
        "dependency_health": 5,
        "prohibition_density": 2,
        "naming": 4,
        "duplication": 3,
        "determinism": 2,
        "security_tooling": 3,
        "ai_app_surface": null
      },
      "top_issues": ["2x 2200-token god files", "no AGENTS.md", "0 scan tests"]
    }
  ]
}
```

Ledger maintenance rules: Step 14 updates `last_verified` per entry; cleared
(陈旧) entries are removed from `standing_deductions` and logged in that scan's
`top_issues`/report diff — the ledger never grows stale silently. `kind: policy`
entries are the project's registered ceilings; `kind: debt` are expected to clear;
`kind: disputed` are borderline calls awaiting the next scan's re-read.

**Backwards compatibility:** v1 → migrate dimension names and bump to 2 (as in
v3.x). v2 → bump `schema_version` to 3, add empty `standing_deductions`, and
**seed the ledger from the most recent entry's `top_issues`/`scope_note`**
(each seeded entry gets `kind: "disputed"` until first verified). Old entries
keep `rubric: "v3"` implicitly (absent field = v3); v4-rubric scores are not
directly comparable — note the baseline reset in the report's first v4 scan.

Append each scan. Never overwrite previous entries. Recommend adding
`.vibe-risk-history.json` to version control for team visibility.

### Phase 5 — Generate remediation prompt

Generate a **ready-to-copy remediation prompt** (Report Section 11).

1. Read [remediation-prompt.md](remediation-prompt.md) — **single source of truth**
   for the prompt template, behavior rules, and placeholder reference. Both
   templates begin with a mandatory **P-1 re-adjudication stage**: before fixing
   anything, every TODO inherited from a prior report/ledger is re-verified
   (run its `verify_cmd` or a minimal probe); stale findings are skipped and
   logged — never "fix" a phantom problem.
2. **Choose mode** (v3 new):
   - `interactive` (default for human users) — AI presents plan, waits for
     confirmation at each TODO.
   - `autonomous` — AI executes P0→P1→P2 sequentially with self-review gates,
     without per-step confirmation. Use when the user is a cloud agent, CI, or
     when explicitly requested.
3. Replace all `{placeholders}` with actual data from this scan.
4. Output the filled prompt inside a fenced code block for one-click copy.
5. The prompt language matches the user's preference.

### Phase 6 — Static dependency graph

A text report tells you *what* is wrong. A dependency graph shows you *where* the
structural problems live and how they connect.

> **v3 change:** Default output is now a **static SVG/PNG** saved to a
> project-relative `.vibe-risk/dependency-graph.svg` (cross-platform: Windows,
> macOS, Linux, cloud), suitable for cloud agents / CI / PR attachments. On a
> cloud agent with a dedicated artifacts mount you may override to that absolute
> path (e.g. `/opt/cursor/artifacts/`). Interactive localhost mode is still
> available with `--interactive`.

**Read [references/visualization-guide.md](references/visualization-guide.md)**
for setup, commands, and interpretation.

Quick start (static, default):

```bash
# JS/TS — static SVG via madge + graphviz (create the output dir first)
mkdir -p .vibe-risk
npx madge --image .vibe-risk/dependency-graph.svg --extensions js,ts,jsx,tsx src/
```

**graphviz 缺失时（v4 内置兜底,常见于 Windows/cloud）**：不要放弃静态图——用
自带脚本生成目录级聚合 SVG（实测比 150 节点的逐文件图更可读）：

```bash
node <skill>/references/scripts/graph-fallback.mjs --root src --out .vibe-risk/dependency-graph.svg
```

Quick start (interactive, opt-in):

```bash
npx skott --displayMode=webapp --trackThirdPartyDependencies --cwd=src
```

Visual patterns map to scan findings:

- **God files** → high fan-in + fan-out nodes
- **Circular dependencies** → highlighted cycles
- **Dead code** → orphan nodes with no incoming edges
- **Architecture violations** → cross-layer arrows
- **Refactoring order** → leaf nodes first, hub nodes last

In Full mode, always attempt to generate the static graph (non-interactive).
Offer interactive mode only when the user is local and requests it.

### Phase 7 — Self-evolution reflection (v4.1)

At the end of every scan (and of any remediation driven by this skill), run the
**E1–E5 checklist** in [SELF-EVOLUTION.md](SELF-EVOLUTION.md): did this run expose
a rule misfire, an uncaught tool break, a risk no dimension can hold, threshold
calibration evidence, or an improvised workaround that would be needed again?
Deposits go to the bounded candidate registry; if any exist, append the fixed-format
**🧬 进化候选** reminder to the final summary and ask the user whether to file a
proposal. The skill **never silently modifies itself** — every change goes through
a user-approved proposal that passes [CHANGE-GATE.md](CHANGE-GATE.md). Zero
deposits → zero output (don't nag).

---

## Monorepo support

If the project root contains `pnpm-workspace.yaml`, `lerna.json`, `turbo.json`,
`nx.json`, or `package.json` with `workspaces` (or de-facto multi-package layout
like a nested app with its own lockfile):

1. List all packages/apps in the workspace.
2. Ask the user: scan a specific package, or scan all?
3. **If scanning all (v4 default semantics): score each package independently
   and keep one history file + one scorecard per package** (e.g.
   `<repo>/.vibe-risk-history.json` + `<repo>/<package>/.vibe-risk-history.json`)
   — a weighted average hides single-package regressions, so it is at most an
   optional summary row. The report uses the side-by-side multi-column variant
   of the template (one column per package).
4. If scanning one: treat that package as the project root.

---

## Agent Rules & Skills recommendation matrix

After scoring, cross-reference findings with the project's existing AI configuration.

| Project Signal | Missing Config | Recommend | Priority |
|---------------|---------------|-----------|----------|
| No `AGENTS.md` at all (v3) | Missing primary briefing | `[DOC] AGENTS.md` with dev env + conventions | MUST |
| Dim 8 (Prohibition Density) score ≤ 2 | No grep-verifiable fence | `[RULE] <domain>-guardrails.mdc` with PR-NNN pattern | MUST |
| Dim 4 structural invariants = 0 | No scan tests | `[TEST] src/lib/__tests__/<topic>-safety.test.js` | MUST |
| Pattern drift detected | No code-conventions rule | `[RULE] code-conventions` | MUST |
| Uses i18n | No i18n rule | `[RULE] i18n-guardrails` | MUST |
| React/Next.js project | No react-doctor skill | `[SKILL] react-doctor` | RECOMMENDED |
| No commit convention | No pr-commit skill | `[SKILL] pr-commit` | RECOMMENDED |
| Has tests but no sync guard | No test-guardian skill | `[SKILL] test-guardian` | RECOMMENDED |
| Inconsistent naming | No naming rule | `[RULE] naming-conventions` | RECOMMENDED |
| Blurred architecture boundaries | No architecture rule | `[RULE] architecture-boundaries` | MUST |
| TS strict off / any abuse | No type-safety rule | `[RULE] type-safety` | MUST (v3: elevated) |
| No tests at all | No test skill/rule | `[SKILL] test-guardian` | MUST |
| No periodic audit | Not scheduled | `[SKILL] vibe-risk-analyzer` | RECOMMENDED |
| LLM app, prompt changes untested (v4) | No prompt-change gate | `[RULE] prompt-change-guard` + `[TEST] golden/eval per prompt asset | MUST |
| LLM app, SSE/stream paths untested (v4) | No stream-error fence | `[TEST] sse-error-path spec`（错误帧/心跳/abort 贯通） | MUST |
| Vendored agent-CLI fork present (v4) | No divergence registry | `[DOC] provider-divergence-registry`（每条差异 = 双方行为对照 + 分叉理由 + 验证方式） | MUST |

Each recommendation includes: type tag, name, priority, trigger finding,
description, and a 3-5 line content skeleton so the user can create it immediately.

---

## Recommended tools

Read [references/tools-matrix.md](references/tools-matrix.md) for the full
recommended tools list organized by ecosystem (JS/TS, Python, Go).
Only recommend tools the project does NOT already have.

---

## Rules

1. **Read report-template.md before generating output.** The template is the contract.
2. **Never output a partial report.** Every section must be filled.
3. **Scores are integers, never ranges, and must be derivable.** Every deduction
   cites a sub-item ID; the dimension total follows the composition formula in
   scoring-reference.md; `scorecard.json` is emitted alongside the report.
   **No "lenient" judgment calls** — borderline cases take the lower tier per
   formula and are registered in the ledger as `kind: disputed`.
4. **Problems cite files.** Every issue references at least one file path.
5. **Tool failures are documented, not hidden — and vacuous passes too.** If a
   tool fails, state why and score manually from code sampling; if a tool ran
   but processed 0 relevant files (alias-blind madge, unconfigured knip), say
   "vacuous" explicitly and use the fallback chain.
6. **Respect project type.** Adapt dimensions to the detected stack. Pure JS
   projects: score contracts via JSDoc coverage instead of TS coverage. Python:
   skip React-specific checks but apply Python equivalents. `ui_heavy` projects
   get the coverage profile in scoring-reference § Dim 4. LLM applications
   activate Dim 13.
7. **First-party code only in thresholds.** `vendorGlobs` / `dataAssetGlobs` /
   `generatedGlobs` from `.vibe-riskrc.json` are excluded from size/duplication
   thresholds and reported in their own "third-party-in-tree" section. Absent
   config = whole tree is first-party (backward compatible).
8. **Report language matches user preference.**
9. **Always persist history** using v3 schema (with standing-deduction ledger).
   Migrate v1/v2 files in place on first encounter; seed the ledger from the
   latest entry's prose as `disputed`.
10. **Monorepo: ask before scanning; per-package trend lines by default.**
    Never silently scan only one package; never let a weighted average mask a
    single-package regression.
11. **Always generate remediation prompt.** Section 11 is mandatory in Full mode.
    Both modes start with the P-1 re-adjudication stage. Default `interactive`
    for humans, `autonomous` for cloud agents.
12. **Always generate static dependency graph** in Full mode (graphviz-free
    fallback when needed). Offer interactive graph only when running locally.
13. **Report both risk metrics**; at health ≥ 90 add Drift Watch; at total ≥ 95
    report "AI-native 满级" instead of distance-to-100.
14. **Ledger is the memory.** Standing deductions live in the ledger, are
    re-verified every scan (Step 14), and cleared entries are announced — prior
    findings are never trusted from prose alone.
15. **Self-evolution is human-gated.** Run the Phase 7 reflection after every
    scan/remediation; deposits only ever become changes via a user-approved
    proposal. Never edit this skill's normative files during a run
    (see SELF-EVOLUTION.md hard boundaries).
16. **Every skill modification passes the change gate.** Real-value evidence,
    project-agnostic normative text, anti-bloat budgets, verifiability, and the
    proposal checklist in CHANGE-GATE.md — applies to all files including the
    gate itself. An edit that fails any gate is not made.

---

## Reference files

| File | Purpose | When to read |
|------|---------|-------------|
| [CHANGELOG.md](CHANGELOG.md) | Version history & migration notes | When user asks "what changed" or before upgrading |
| [PROPOSAL-v4.md](PROPOSAL-v4.md) | v4 design rationale + field evidence | When questioning why a v4 rule exists |
| [SELF-EVOLUTION.md](SELF-EVOLUTION.md) | Post-run E1–E5 reflection + candidate registry + reminder format | Phase 7, after every scan/remediation |
| [CHANGE-GATE.md](CHANGE-GATE.md) | 5-gate checklist for ANY skill modification (value/universality/anti-bloat/verifiability/process) | Before editing any skill file |
| [references/automated-scanning.md](references/automated-scanning.md) | Phase 1 step-by-step (Steps 0-14) + env pitfalls | Before starting any scan |
| [scoring-reference.md](scoring-reference.md) | Composition rules + per-dimension criteria + risk/Drift-Watch formulas | During Phase 3 scoring |
| [report-template.md](report-template.md) | Mandatory report output structure | Before generating Phase 3 output |
| [remediation-prompt.md](remediation-prompt.md) | Remediation prompt templates (P-1 + interactive + autonomous) | During Phase 5 |
| [references/visualization-guide.md](references/visualization-guide.md) | Static + interactive graph setup | During Phase 6 |
| [references/tools-matrix.md](references/tools-matrix.md) | Recommended tools by ecosystem | When filling report Section 7 |
| [references/scripts/census.mjs](references/scripts/census.mjs) | Class-aware token census (source/test/data/vendored) | Phase 1 Step 1 |
| [references/scripts/catch-audit.mjs](references/scripts/catch-audit.mjs) | Comment-aware silent-catch audit | Phase 2 error-handling check |
| [references/scripts/graph-fallback.mjs](references/scripts/graph-fallback.mjs) | Graphviz-free directory-level dependency SVG | Phase 6 fallback |
