# Automated Scanning Reference (Phase 1) — v4.0.0

Step-by-step procedure for the automated data collection phase.
Each step produces raw data that feeds into Phase 2 manual analysis and Phase 3 scoring.

> **v4 changes:** Step 0.5 (`.vibe-riskrc.json`), class-aware census via
> `scripts/census.mjs`, alias-aware madge fallback chain, coverage denominator
> audit, Step 8 emits candidates only, **Step 14** (standing-deduction ledger
> re-verification). Reference scripts live in `references/scripts/`.

## ⚠ Execution-environment pitfalls (read before running anything)

实测踩坑,违反任何一条都会产生**静默错误数据**：

1. **Shell cwd 跨调用持久**：一条 `cd subpkg && …` 会让后续所有命令（包括后台任务）
   都在子目录里跑——曾导致"root 覆盖率"实际测的是 desktop。扫描命令一律用绝对路径
   或 `-C` / `--prefix` 风格的目录参数,绝不裸 `cd`。
2. **CRLF 仓库**：所有锚点匹配/替换用 `\r?\n` 容错;固定字节偏移的 splice 必须先验证锚点。
3. **多层引号转义会蒸发**：bash→node→regex 三层嵌套时 `\D`、`\n` 极易丢失——
   生成/修改代码的补丁脚本**写成文件再执行**,不要塞进内联 `-e` 字符串。
4. **空真（vacuous pass）**：工具跑绿但处理了 0 个相关文件（别名盲的 madge、未配置
   workspace 的 knip）≠ 通过。每个工具步骤都要核对"处理对象数"并如实报告。
5. **镜像源**：npmmirror 等镜像无 audit 端点——audit 显式打官方 registry。

---

## Step 0: Tech stack detection

Before running any tools, identify the project type:

1. Read `package.json` (Node/JS/TS), `go.mod` (Go), `requirements.txt` / `pyproject.toml`
   (Python), `Cargo.toml` (Rust), `composer.json` (PHP).
2. From `package.json` dependencies, detect framework:
   - `next` → Next.js | `react` → React SPA | `vue` / `nuxt` → Vue/Nuxt
   - `svelte` / `@sveltejs/kit` → Svelte | `express` / `fastify` → Node API
3. Record: `stack_type` (frontend / backend / fullstack), `language` (ts/js/py/go/...),
   `framework`, `has_typescript`, `has_tests`, `package_manager` (npm/yarn/pnpm/bun).
4. **v4 — LLM-application detection（激活 Dim 13）**: any of —
   deps contain `@anthropic-ai/*` / `openai` / other LLM SDKs; a provider
   registry/abstraction layer exists; SSE/streaming chat routes; a prompt-asset
   directory; spawning of local agent CLIs (claude / codex / cursor-agent …).
   Record `ai_app_surface_active: true/false` + the matched signals.

**This detection gates which tools run in subsequent steps.**

---

## Step 0.5: Read `.vibe-riskrc.json` (v4)

```json
{ "vendorGlobs": [...], "dataAssetGlobs": [...], "generatedGlobs": [...] }
```

- Absent → whole tree is first-party (backward compatible).
- These globs drive census classes (Step 1), size/duplication exclusions, and the
  report's "third-party in tree" section. Never invent exclusions not declared here —
  if the project obviously needs one (e.g. a vendored fork), recommend adding the
  config in Section 7 instead of silently excluding.

---

## Step 1: File size census (token-based in v3)

Use the Glob tool to collect all source files matching the detected stack:

| Stack   | Glob patterns |
|---------|--------------|
| JS/TS   | `**/*.{js,jsx,ts,tsx,mjs,cjs}` excluding `node_modules`, `dist`, `.next`, `build` |
| Vue     | Above + `**/*.vue` |
| Svelte  | Above + `**/*.svelte` |
| Python  | `**/*.py` excluding `venv`, `__pycache__`, `.tox` |
| Go      | `**/*.go` excluding `vendor` |

```
Procedure (v4 — use references/scripts/census.mjs):
1. node <skill>/references/scripts/census.mjs <roots...> [--rc .vibe-riskrc.json]
2. Each file → { path, lineCount, approxTokens = chars/4,
                 class: source|test|data|vendored|generated }
   - test 判定走 .test./.spec./tests 目录等;注意不要用会误伤业务目录的宽松
     正则（实测 `/features//` 把 React 的 features 源码目录全标成了测试）
3. Thresholds & 占比只统计 class=source（first-party）:
     approxTokens > 2000  → CRITICAL（占比与 ≥4 个取先触发,见 SRP-F2）
     approxTokens 1200–2000 → WARNING band（按占比,见 SRP-F4）
     approxTokens > 4000  → additional CRITICAL
4. Record top 20 + per-class totals（报告 §6 census class breakdown）
5. flow-cost 输入：census token 表 + Step 2 的 import 图 → 对 5–8 条代表业务流
   计算闭包 token 去重和（scoring-reference § SRP-W*）
```

> **Why token-based:** Python averages ~1.2 chars/token and Go ~0.8,
> so raw LOC comparisons are unfair across languages. Token count is what
> actually matters for AI context window cost. **v4 加测 flow-cost** 因为单文件
> 阈值可被机械拆分博弈——拆完文件数达标,读一条业务流的总成本反而可能上升。

---

## Step 2: Circular dependency detection

```bash
# JS/TS projects only — skip for Python/Go/Rust
npx madge --circular --extensions js,ts,jsx,tsx src/
```

**v4 alias-aware fallback chain（必须按序执行,不许停在空真上）:**

1. 核对 madge 的 "Processed N files"。若项目用 TS 路径别名（`@/`、`@shared/` 等）
   而 N≈0 → 结果是**空真**,禁止报告"无循环"。
2. 重试 `npx madge --circular --ts-config tsconfig.json src/`。
3. 仍失败 → `npx skott --displayMode=raw --cwd=src`（skott 原生解析 tsconfig paths）。
4. 仍失败 → 自带 import-scan（解析 import 说明符 + 手动映射别名,见
   `scripts/graph-fallback.mjs` 的解析器）至少做方向性判断。
5. 报告必须写明走到第几级、以及"循环防护实际由什么承担"（如结构守卫断言进程边界）。

---

## Step 3: Unused dependencies & dead code

```bash
# JS/TS projects only
npx knip --no-exit-code
```

**v4 workspace rule:** 在 monorepo / 嵌套独立包（多个目录各有自己的 lockfile）里,
未配置 workspace 的 knip 会把兄弟包文件全部误报为 unused。处理顺序：①若有
`knip.json` → 直接跑;②没有 → 给出最小 workspace 配置模板推荐到 Section 7,
本轮 **跳过且 dead-code 子项不扣分**（documented skip ≠ silent skip）。
**Fallback:** If Knip fails, manually check `package.json` dependencies vs actual imports
using Grep. Note partial coverage in the report.

---

## Step 4: Dependency vulnerability audit

```bash
# JS/TS projects
npm audit --json 2>/dev/null || yarn audit --json 2>/dev/null || pnpm audit --json 2>/dev/null

# Python projects
pip audit 2>/dev/null || safety check 2>/dev/null

# Go projects
govulncheck ./... 2>/dev/null
```

**Fallback:** If no audit tool is available, note it and skip the vulnerability sub-score.

**v4 mirror-registry rule:** 项目配置了 npmmirror 等镜像时 audit 端点不存在——
显式打官源：`npm audit --registry=https://registry.npmjs.org`（pnpm 同理）。

---

## Step 5: Code duplication

```bash
# Works for any language (150+ supported)
npx jscpd src/ --min-lines 5 --min-tokens 50 --reporters consoleFull
```

**Fallback:** If jscpd fails, Grep for obvious repeated patterns. Score conservatively.

---

## Step 6: Test detection + critical path coverage (v3)

Use Glob to find test files matching: `**/*.test.*`, `**/*.spec.*`, `**/test_*.*`,
`**/tests/**`, `**/__tests__/**`.

Count them. Check if a test runner is configured (`jest`, `vitest`, `mocha`, `pytest`,
`go test`, etc. in package.json / config files).
If a coverage report exists (`.nyc_output`, `coverage/`, `htmlcov/`), read summary.

### v4: Denominator audit（必做,先于读百分比）

读 coverage 配置（vitest/jest 的 `coverage.include`/`exclude` 等）,记录统计宇宙：
include globs、exclude globs、宇宙行数。**核对新近测试覆盖的源文件是否在 include
内**——实测 include 白名单会让整批新测试静默不计入。历史对比记录
`covered_lines` 绝对值（重构中性,见 scoring-reference Dim 4）。同时判定项目画像：
UI 视图层代码（组件/页面/视图绑定,与框架宿主无关）占一方源码 > 60% → `ui_heavy`。

### v3: Critical path coverage

Identify **critical path files** (auth / payment / data-mutation) by grep:

```bash
# Auth paths
rg -l "login|logout|signup|password|session" src/ --type js --type ts

# Payment paths
rg -l "payment|checkout|stripe|billing|subscription|invoice" src/

# Data mutation (API write handlers)
rg -l "POST|PUT|DELETE|PATCH" src/app/api/ src/pages/api/ 2>/dev/null
```

For each critical path file, check if a co-located test exists (follow project's
test-file-discovery convention — e.g. `__tests__/` directory or `.test.js` suffix).
Compute per-category coverage: `tested_critical_files / total_critical_files`.

---

## Step 7: Framework-specific scan (conditional)

```bash
# React / Next.js only — detected in Step 0
npx react-doctor@latest . --verbose
```

Skip if not a React/Next.js project. **Fallback:** Note skip in report.

---

## Step 8: Performance & Memory Debt Scan

Detect cumulative performance and memory risks that grow as modules are vibe-coded on
top of each other. Each finding counts as a "debt signal" for the refactoring risk formula.

### 8a. Memory leak patterns

Use Grep on source files for these patterns, then check for matching cleanup:

| Pattern | Check for cleanup |
|---------|------------------|
| `addEventListener` | matching `removeEventListener` in same file |
| `setInterval` | matching `clearInterval` in same file |
| `setTimeout` | matching `clearTimeout` in same file (ignore <5s delays) |
| `.subscribe(` | matching `.unsubscribe()` or `takeUntil` |
| `new WebSocket` | matching `.close()` |
| `new EventSource` | matching `.close()` |
| `useEffect` without cleanup | function body has no `return () =>` or `return function` |

Count "unmatched" instances (leak candidates). Record total + top 5 offending files.

### 8b. Bundle & dependency bloat

```
Procedure:
1. Count total production dependencies (dependencies, not devDependencies)
2. Flag known heavy packages: moment, lodash (full), @material-ui (v4), antd (full)
3. Flag duplicate-purpose packages:
   - HTTP: axios + node-fetch + got + ky
   - Dates: moment + dayjs + date-fns + luxon
   - State: redux + zustand + jotai + recoil + mobx
   - Animation: framer-motion + react-spring + gsap + animejs (flag if 3+)
   - Charts: recharts + chart.js + d3 + highcharts + nivo (flag if 3+)
4. Check for full-library imports vs tree-shakeable usage:
   - `import _ from 'lodash'` vs `import debounce from 'lodash/debounce'`
   - `import * as Icons from '@heroicons/react'` vs named imports
5. Record: total_prod_deps, heavy_packages[], duplicate_purpose_groups[], full_imports[]
```

> **v3 note:** Duplicate-purpose packages ALSO feed Pattern Consistency §
> "Module stacking" (Dimension 2). Performance Debt counts them for the
> refactoring risk multiplier; Pattern Consistency deducts points because
> AI will coin-flip between them.

### 8c. Render performance (frontend projects)

Use Grep for:

- Components rendering large arrays without virtualization:
  `.map(` in JSX-returning functions, flag files with >3 `.map()` calls
- Missing dynamic/lazy imports on route-level components:
  Check route files for `import()` / `dynamic()` / `lazy()` usage
- Inline object/function creation in JSX props:
  `={{` and `={() =>` patterns (re-creation on every render)
- Missing memoization on expensive computations:
  sort, filter, reduce on large datasets without `useMemo`

### 8d. Data & asset risk

```
Procedure:
1. Search for API/fetch calls without pagination params (no ?page=, ?limit=, ?offset=)
2. Check for unoptimized images (frontend: check for next/image usage)
3. Search for large JSON imports
4. Check for unbounded data loading: fetch-all patterns without limit/cursor
```

### 8e. State & memory growth

```
Procedure:
1. Count global state slices/stores — flag if >15 slices in Redux or >10 Zustand stores
2. Search for patterns that grow state unboundedly:
   - Array.push into state without size limit
   - Cache objects that never evict (no TTL, no LRU, no max-size)
   - In-memory event history / log accumulation
3. Check for missing cleanup in route transitions
```

### Debt signal aggregation

**v4:** Each finding = 1 **candidate**. Step 8 输出 `perf_debt_candidates`;
Phase 2 按类抽样裁定为 `confirmed`/`discarded`,**只有 confirmed 进 Factor 4 乘数**
（实测裸 grep 候选大半是误报,如持久 DOM 的一次性 addEventListener）。
两个数都写进报告与 history。

---

## Step 9: Scan existing Agent rules & skills (inventory only)

Use Glob to scan:
- `.cursor/rules/*.mdc` — Cursor Rules
- `.claude/skills/*/SKILL.md` — Claude Skills
- `.cursorrules` — Legacy Cursor Rules
- `.github/copilot-*` — Copilot Instructions
- `.windsurfrules`, `.clinerules` — Other AI tool configs

Record which rules/skills are present. This is raw inventory only —
Step 11 computes the AI Context Artifact score, Step 12 computes prohibition density.

---

## Step 10: Load score history

Read `.vibe-risk-history.json` from the project root (if it exists).

**v3 schema detection:**

```
If file exists:
  If it has "schema_version": 2 → v2 schema (current)
  If it has no schema_version or uses v2.x dimension names → v1 schema
    Action: migrate in place:
      - Add "schema_version": 2 to root
      - For each scan entry, normalize dimensions:
        * Keep: module_srp, architecture, dependency_health, naming, duplication, security_tooling
        * Rename: type_safety → type_safety_contracts
        * Rename: test_coverage → test_coverage_invariants
        * Rename: pattern_consistency → pattern_consistency (unchanged)
        * Add nulls for new dimensions: ai_context_artifacts, prohibition_density, determinism
        * Remove: complexity (absorbed into module_srp — keep complexity value summed with module_srp if present)
      - Add null ai_extension_risk fields
      - Mark: "migrated_from_v1": true on each migrated entry
```

Extract the most recent entry for the "Previous scan" comparison in the report.
For per-dimension slope (Section 10), use the last 3 scans (where available).

---

## Step 11: AI Context Artifact Census (NEW in v3)

Feeds **Dimension 5: AI Context Artifacts (10 points)**.

```
Procedure:
1. Check for primary agent briefing:
   - AGENTS.md (root) — if present, count lines, check for sections:
     "dev env", "conventions", "testing", "cursor cloud"
   - CLAUDE.md / .cursorrules (root) — equivalent alternatives
   → record: primary_briefing_present, primary_briefing_lines

2. Inventory .cursor/rules/*.mdc:
   - Glob: **/.cursor/rules/*.mdc
   - For each file, read frontmatter / first 20 lines to classify domain
     (i18n / state / frontend / commit / architecture / testing / other)
   → record: cursor_rules_count, cursor_rules_domains[]

3. Inventory .claude/skills/*/SKILL.md:
   - Glob: **/.claude/skills/*/SKILL.md
   - For each, read frontmatter `description` field
   → record: claude_skills_count, claude_skills_list[]

4. Architecture & decision docs:
   - Glob for: docs/architecture/**, docs/adr/**, docs/decisions/**
   - Count files; check top-level README for architecture overview section
   → record: arch_docs_count, has_adr_dir, readme_has_architecture_section

5. Per-domain typedef files:
   - Glob for: src/types/*.js, src/types/*.ts, types/*.d.ts
   - Check if types are consolidated per domain vs scattered inline
   → record: per_domain_types_present

6. Migration documentation (if active migration detected):
   - Heuristic: multiple "old_" / "legacy_" / "v1_" prefixed dirs/files, OR
     recent commits with "migrate:" / "refactor:" prefix
   - If active migration: check for docs/migration-playbook.md or similar
   → record: has_migration_playbook (if applicable)
```

Output a compact summary table for the report's Section 6 ("Tool Scan Data Summary").

---

## Step 12: Explicit Prohibition Density (NEW in v3)

Feeds **Dimension 8: Explicit Prohibition Density (6 points)**.

```
Procedure:
1. Normalize search corpus:
   - .cursor/rules/*.mdc
   - AGENTS.md / CLAUDE.md / .cursorrules
   - .claude/skills/*/SKILL.md
   - docs/proposed-rules.md
   - docs/architecture/*.md (for architectural prohibitions)

2. Count prohibitions via grep patterns (use rg):
   - "^-?\s*❌\s+" or "^-?\s*- ❌\s+"      — ❌ bullet-style prohibitions
   - "Prohibited|prohibited|禁令|不得|禁止" — prose prohibitions
   - "PR-\d{3}:"                            — indexed (PR-NNN) prohibitions
   - "- ❌ \`.+?\` — "                      — grep-verifiable backticked patterns

3. For each match, check:
   - Has backticked `code pattern`? (grep-verifiable) → YES/NO
   - Has PR-NNN index? → YES/NO
   - Pattern still exists in codebase? (rg the backticked pattern over src/)
     - If 0 matches → prohibition is current (effective)
     - If N matches → prohibition is STALE (rule didn't prevent regression,
       OR rule was added after the pattern; distinguish by checking if
       a structural test guards it)

4. Compute density:
   - total_prohibitions
   - grep_verifiable = count with backticked pattern
   - density_per_10k_loc = (grep_verifiable / total_loc) * 10000
   - stale_count
```

Report: `total_prohibitions`, `grep_verifiable`, `density_per_10k_loc`, `stale_count`.

---

## Step 13: Structural Invariant Tests (NEW in v3)

Feeds **Dimension 4: Test Coverage & Structural Invariants (12 points)**, specifically
the "Structural invariant tests" sub-category.

```
Procedure:
1. Glob for test files that do full-tree static analysis:
   - src/**/__tests__/*.test.{js,ts}
   - src/**/*.test.{js,ts}
   - tests/**

2. For each test file, check for scan indicators:
   - Uses `readFileSync` or `readdirSync` on src/ directory, OR
   - Uses glob library (fg, fast-glob, glob) to scan src/, OR
   - Imports from `fs` and iterates over directories, OR
   - Contains comment markers like "scan", "structural", "safety guard", "invariant"

3. For each qualifying scan test, extract:
   - Test file path
   - Guarded topic (from filename or describe() block):
     e.g. hydration-safety.test.js → "hydration"
     e.g. page-size-limits.test.js → "page size"
     e.g. barrel-import-safety.test.js → "barrel imports"

4. Deduplicate by topic and list distinct guards.
```

Report: list of structural scan tests and their guarded topics.

Example output:

```
Structural invariant tests: 8 found, 8 distinct topics
  - src/lib/__tests__/hydration-safety.test.js (hydration)
  - src/lib/__tests__/modal-tour-ordering.test.js (modal/tour ordering)
  - src/lib/__tests__/tailwind-color-safety.test.js (css tokens)
  - src/lib/__tests__/page-size-limits.test.js (page size)
  - src/lib/__tests__/page-structure-safety.test.js (page structure)
  - src/lib/__tests__/store-selector-safety.test.js (store selectors)
  - src/lib/__tests__/barrel-import-safety.test.js (barrel imports)
  - src/lib/__tests__/guards/background-frame-loop.test.js (frame loop)
```

---

## Step 14: Standing-Deduction Ledger Re-verification (NEW in v4)

Feeds Phase 3 scoring, report §10.5, and remediation P-1.

```
Procedure:
1. Read history `standing_deductions[]`（v2 history 无台账 → 从最近一条的
   top_issues/scope_note 播种,每条 kind="disputed"）。
2. For each entry: run `verify_cmd`（或做等价最小复测）→
     仍成立  → 更新 last_verified,沿用
     已失效  → 从台账移除,记入本轮 "cleared (stale)" 清单（必须出现在报告 §10.5）
     恶化    → 升级 points/kind 并标注
3. kind 语义：policy=登记在册的政策上限（满级措辞引用它）;debt=待还;
   disputed=上轮边界判定,本轮必须转正或清除。
4. 输出 ledger diff（新增/清除/维持）供报告与 remediation prompt 使用。
```

---

## Output for Phase 3

Aggregate all step outputs into a single structured data blob that Phase 3 consumes
when filling the report template. Key fields (partial):

```
{
  stack: { language, framework, ai_app_surface_active, llm_signals[] },
  rc: { vendorGlobs[], dataAssetGlobs[], generatedGlobs[] },
  files: { per_class_totals, top_largest[], firstparty_over_2k_pct, band_pct,
           flow_cost: { sampled_flows[], p90_tokens, worst } },
  circular_deps: { count, chains[], fallback_level, vacuous: bool },
  dead_code: { unused_exports, unused_files, unused_deps[], skipped_reason? },
  vulnerabilities: { critical, high, moderate, low, registry_used },
  duplication: { percent, top_blocks[] },
  tests: { count, runner, coverage_universe: { include[], exclude[], lines },
           covered_lines, coverage_pct, critical_path_coverage, profile },
  react_doctor: { advisory_findings[] },        // never a headline score
  perf_debt: { candidates, confirmed, breakdown_by_category },
  rules_inventory: { cursor_rules[], claude_skills[], copilot_instructions },
  history: { schema_version, scans[] },
  ai_context: { primary_briefing_present, cursor_rules_count, claude_skills_count, arch_docs_count, per_domain_types_present },
  prohibitions: { total, grep_verifiable, density_per_10k_loc, stale_count },
  structural_invariants: { scan_tests_count, topics[] },

  // NEW in v4
  ledger: { kept[], cleared[], escalated[], seeded[] },
  ai_app_surface: { prompt_assets, prompt_change_gate, stream_error_tested,
                    abort_wired, timeout_capped, cost_guardrails,
                    provider_registry, divergence_registry } | null,
  drift_watch: { new_guard_density, new_code_coverage_pct, stale_prohibitions } | null
}
```
