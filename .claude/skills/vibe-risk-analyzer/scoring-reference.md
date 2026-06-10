# Scoring Reference v4.0.0

Deduction criteria for the **12 base dimensions + conditional Dimension 13**.
The Agent should consult this file when assigning scores during Phase 2/3.

> **What changed in v4?** Deterministic composition (no more lenient-vs-strict
> double readings), sub-item IDs, first-party-only thresholds, Module SRP
> reworked around flow-cost, refactor-neutral coverage, confirmed-only perf
> debt, Dim 13 AI App Surface, Drift Watch for the high-score regime.
> Rationale & field evidence: [PROPOSAL-v4.md](PROPOSAL-v4.md).

## Global composition rules (v4 — read first)

1. **公式**：`维度分 = max(0, 满分 − min(维度cap, Σ生效子项))`。每个维度的 cap
   即其满分（不另设更低 cap 时）。
2. **同一证据只计一次**：一个文件同时触发多档尺寸子项时,只取**最重的一档**;
   文件级与函数级子项命中同一文件时,取其大者,不叠加。
3. **分档互斥**：同一子项表内按行分档的（如 1-3 个 / 4+ 个）,只取命中的那一行。
4. **子项 ID**：每条扣分有唯一 ID,格式 `<维度码>-<类别字母><行号>`
   （维度码:SRP/PAT/TYP/COV/CTX/ARC/DEP/PRO/NAM/DUP/DET/SEC/AIS）。
   v4 重写的维度（1/4/13）在表内显式标注 ID;其余维度按「类别小节首字母 + 表内行序」
   推导（如 Pattern 的 State drift 第 2 行 = `PAT-S2`）。报告 Deductions 表与
   scorecard.json 必须引用 ID。
5. **不再"从宽"**：边界情况一律按公式取**低一档**,同时在台账登记
   `kind: "disputed"`,下轮 Step 14 复核后转正或清除。
6. **First-party only**：所有尺寸/重复类阈值仅统计 `.vibe-riskrc.json` 之外的
   一方代码;vendored/generated 单独报告,dataAsset 豁免 god-file 逻辑。

**Weight table (100 points base; Dim 13 conditional, see § Score aggregation):**

| # | Dimension | Weight |
|---|-----------|--------|
| 1 | Module Granularity & SRP (incl. Complexity) | 14 |
| 2 | Pattern Consistency | 14 |
| 3 | Type Safety & Contracts | 12 |
| 4 | Test Coverage & Structural Invariants | 12 |
| 5 | AI Context Artifacts | 10 |
| 6 | Architecture & Structure | 8 |
| 7 | Dependency Health | 7 |
| 8 | Explicit Prohibition Density | 6 |
| 9 | Naming & Discoverability | 6 |
| 10 | Duplication & Dead Code | 5 |
| 11 | Determinism & Side-Effect Hygiene | 3 |
| 12 | Security & Tooling Config | 3 |
| 13 | AI App Surface（LLM 应用检出时激活） | 8 |

---

## 1. Module Granularity & SRP — 14 points

Start at 14. Deduct per the composition rules.

> **v4 rework（Goodhart 修正）:** v3 以单文件 token 数为主指标,实测可被
> "为躲阈值而机械拆分"博弈——拆完 20 个 >2000 文件,1200-2000 预警带反而从
> 27 涨到 47,且读一条业务流要打开 5 个文件。v4 的主指标改为 **flow-cost**
> （理解一条业务流需装载的去重 token 总量）,单文件尺寸降为辅助信号,并以
> **占比**替代绝对数消除规模偏差。三类豁免:纯数据资产（dataAssetGlobs,如
> 2600 tok 的内联 SVG 字符串）、**纯委托 facade**（>80% 行为 re-export/单行
> 委托）、vendored（单独报告）。

### Flow-cost（主指标,SRP-W*）

抽样 5–8 条代表性业务流（入口 → 编排层 → 实现层,沿 import 图取闭包;参考
`references/scripts/census.mjs` 的 token 表 + madge/import 图即可计算）。
`flow_cost = 该流闭包内一方源文件 token 去重求和`。

| ID | Condition | Deduction | Notes |
|----|-----------|-----------|-------|
| SRP-W1 | p90 flow-cost > 12k tokens | -3 | 单条流就要吃掉小半个上下文窗口 |
| SRP-W2 | p90 flow-cost 8k–12k tokens | -2 | |
| SRP-W3 | p90 flow-cost 5k–8k tokens | -1 | |
| SRP-W4 | 任一流的闭包跨 > 12 个一方文件 | -1 (additional) | 碎片化同样是理解成本——拆分不是免费的 |

### File size（辅助信号,SRP-F*;仅一方非豁免文件;占比 = 命中数 / 一方源文件数）

| ID | Condition | Deduction | Notes |
|----|-----------|-----------|-------|
| SRP-F1 | 任一文件 > ~4000 tokens (≈ 1000 LOC) | -2 | 每次编辑都要整读;与 F2 不叠加同一文件 |
| SRP-F2 | >2000 tokens 占比 > 5%（或 ≥4 个,取先触发者） | -2 | 系统性 god-file |
| SRP-F3 | >2000 tokens 占比 ≤5% 且 ≥1 个 | -1 | |
| SRP-F4 | 1200–2000 带占比 > 25% | -1 | 预警带按占比;**本轮拆分净新增的带文件不计,下轮起计**（给重构落地缓冲） |

### Function / component size（SRP-G*;每文件与 F* 不叠加——取大者）

| ID | Condition | Deduction | Notes |
|----|-----------|-----------|-------|
| SRP-G1 | >100 行函数 ≥ 2 个 | -2 | 长编排函数（stream 装配等）若有充分 JSDoc 契约可登记 disputed |
| SRP-G2 | >100 行函数 = 1 个,或 >50 行函数 ≥ 8 个 | -1 | |

### Single Responsibility violations（SRP-R*）

| ID | Condition | Deduction | Notes |
|----|-----------|-----------|-------|
| SRP-R1 | File mixes UI + business logic + data fetching | -1 per file (max -3) | Classic SRP violation |
| SRP-R2 | Component file contains unrelated utility functions | -1 per 2 files (max -2) | |
| SRP-R3 | Single file exports 10+ unrelated symbols | -1 per file (max -2) | 纯 barrel/facade 豁免 |

### Complexity（SRP-C*,absorbed from v2 Dimension 7）

| ID | Condition | Deduction | Notes |
|----|-----------|-----------|-------|
| SRP-C1 | 4+ functions with cognitive complexity > 15 | -2 | 与 G* 不叠加同一函数 |
| SRP-C2 | 1-3 functions with cognitive complexity > 15 | -1 | |
| SRP-C3 | Functions with > 4 levels of nesting (≥3 occurrences) | -1 | |

---

## 2. Pattern Consistency — 14 points

Start at 14. Deduct for:

> **v3 rationale:** AI infers "how things are done" by sampling the existing
> codebase. When three toast systems coexist, AI will coin-flip. This weight
> increase reflects AI's higher drift-sensitivity vs humans.

### State management drift

| Condition | Deduction | Notes |
|-----------|-----------|-------|
| 2 state management libraries in use | -2 | e.g. Redux + Zustand |
| 3+ state management approaches | -4 | |
| Inconsistent local vs global state boundaries | -2 | |

### Data fetching inconsistency

| Condition | Deduction | Notes |
|-----------|-----------|-------|
| 2 data fetching patterns | -2 | e.g. useEffect+fetch + React Query |
| 3+ data fetching patterns | -4 | |
| No centralized API layer (fetch calls scattered in components) | -2 | |

### Style / CSS approach

| Condition | Deduction | Notes |
|-----------|-----------|-------|
| 2 CSS approaches | -1 | |
| 3+ CSS approaches | -3 | |

### Async & component patterns

| Condition | Deduction | Notes |
|-----------|-----------|-------|
| Mixed async/await and .then() chains (>20% minority) | -1 | |
| Mix of class and function components (non-legacy) | -2 | |

### Module stacking (moved from Performance Debt)

| Condition | Deduction | Notes |
|-----------|-----------|-------|
| 2+ toast / modal / notification systems coexisting | -2 per pair (max -4) | AI will pick wrong one |
| 2+ HTTP clients / 2+ date libs / 2+ form libs | -1 per pair (max -3) | |

### Formatter / lint drift

| Condition | Deduction | Notes |
|-----------|-----------|-------|
| No formatter configured | -1 | |
| Formatter present but 10%+ files deviate | -1 | Formatter is circumvented |

---

## 3. Type Safety & Contracts — 12 points

Start at 12. Deduct for:

> **v3 rationale:** Types / JSDoc are AI's **only** way to verify call contracts
> without running the code. For an AI-maintained project this is load-bearing
> infrastructure, not a nice-to-have. Weight raised from 7 → 12.

### TypeScript adoption

| Condition | Deduction | Notes |
|-----------|-----------|-------|
| No TypeScript (pure JS) + no JSDoc on exported APIs | -3 | AI has no contract information |
| No TypeScript but JSDoc on > 60% exported APIs | -0 | Acceptable baseline for JS projects |
| TypeScript but strict mode off | -2 | False sense of safety |
| TypeScript strict on | +0 | Baseline |

### Type quality

| Condition | Deduction | Notes |
|-----------|-----------|-------|
| 1-10 unannotated `any` | -1 | |
| 10-30 unannotated `any` | -2 | |
| 30+ unannotated `any` | -3 | |
| Excessive `as` type assertions (>20) | -1 | |

**v3 note — annotated escape hatches:** `any` / `@ts-expect-error` with an
adjacent comment like `// AI: external library without types` or
`// @ts-expect-error intentional` count as **0.5×** the normal deduction.
Intent-explicit escape hatches are safer for AI than wrong types.

### Contract explicitness (new in v3)

| Condition | Deduction | Notes |
|-----------|-----------|-------|
| < 40% exported functions have `@param` + `@returns` (JS) or TS types | -2 | AI has to guess signatures |
| < 20% exported functions have documented return types | -3 | |
| API route handlers without request/response schema | -1 per 5 routes (max -2) | |
| Redux slice state without `@typedef` / `interface` | -1 per 3 slices (max -2) | |

### Error handling

| Condition | Deduction | Notes |
|-----------|-----------|-------|
| Generic `catch(e) { console.error(e) }` widespread | -2 | |
| No error boundaries in React app | -1 | |
| Missing error handling on async operations | -1 | |

---

## 4. Test Coverage & Structural Invariants — 12 points

Start at 12. Deduct per the composition rules.

> **v4 rework:** ①全局百分比惩罚健康重构（同样的行为同样的测试,拆分扩大插桩
> 分母就掉 5pp）——改为**关键路径覆盖为主**,全局 % 只作次要信号,且历史对比用
> **covered_lines 绝对增量**（重构中性）。②必须先做**分母审计**（读 coverage
> 配置的 include/exclude 并报告"统计宇宙"——实测 include 白名单会让新测试
> 静默不计入）。③新增 `ui_heavy` 画像——**UI 视图层代码**（组件/页面/视图绑定,
> 不论框架与宿主:Electron renderer、SPA、移动端 UI 工程皆同）占一方源码 > 60%:
> 结构守卫 + 类型检查是该画像合法的反馈环,低全局 % 不再重罚。

### 前置:分母审计（不扣分,但缺失则 COV-D* 全部按 disputed 登记）

报告必须列出 coverage 工具的 include/exclude globs 与统计宇宙行数;若新增测试
所覆盖的源文件不在 include 内,先修正认知再打分。

### Test existence（COV-E*）

| ID | Condition | Deduction | Notes |
|----|-----------|-----------|-------|
| COV-E1 | Zero test files | -5 | AI is flying blind |
| COV-E2 | Test files exist but no test runner configured | -2 | |
| COV-E3 | Test runner configured but < 10% test-to-source ratio | -2 | Token coverage |

### Critical-path coverage（主指标,COV-P*;auth / payment / data-mutation / 项目自报关键域）

| ID | Condition | Deduction | Notes |
|----|-----------|-----------|-------|
| COV-P1 | 任一关键路径 0% 行为覆盖 | -3 | path-weighted ×2 的 v3 规则保留 |
| COV-P2 | 关键路径 0–30% | -1 | |

### Overall coverage（次要信号,COV-D*）

| ID | Condition | Deduction | Notes |
|----|-----------|-----------|-------|
| COV-D1 | 全局 < 30% 且画像非 `ui_heavy` | -2 | |
| COV-D2 | 全局 30–60% 且画像非 `ui_heavy` | -1 | |
| COV-D3 | `ui_heavy` 画像:全局 < 30% **且**（守卫 < 5 或关键路径无行为测试） | -1 | 守卫 ≥5 + 关键路径有测 → 0 扣 |
| COV-D4 | No coverage report at all | -1 | |

历史对比规则:报告 Delta 列用 `covered_lines` 绝对增量;纯结构重构（行为与测试
不变）导致的百分比波动**不得**改变本维度分数。

### Structural invariant tests（COV-S*）

Tests that scan the whole `src/` tree for forbidden patterns are AI's guardrail fence.

| ID | Condition | Deduction | Notes |
|----|-----------|-----------|-------|
| COV-S1 | Banned patterns in rules but **no scan test enforcing them** | -2 | Rules are documentation only; AI will regress |
| COV-S2 | Has scan tests but < 3 distinct guards | -1 | Minimal fence coverage |
| COV-S3 | Has ≥ 5 distinct structural scan tests | **+1 bonus** (cap at 12) | Exemplary |

### Test quality（COV-Q*, from manual sampling）

| ID | Condition | Deduction | Notes |
|----|-----------|-----------|-------|
| COV-Q1 | Tests are only snapshots, no behavioral assertions | -2 | |
| COV-Q2 | Tests don't cover error/edge cases | -1 | |

---

## 5. AI Context Artifacts — 10 points (NEW in v3)

Start at 10. Deduct for:

> **Rationale:** `AGENTS.md`, `.cursor/rules/*.mdc`, `.claude/skills/*/SKILL.md`,
> ADRs, and architecture docs are AI's **external long-term memory**.
> In v2 these lived only in Section 8 recommendations; v3 makes them core.

### Primary agent briefing

| Condition | Deduction | Notes |
|-----------|-----------|-------|
| No `AGENTS.md` / `.cursorrules` / `CLAUDE.md` at project root | -3 | AI starts every session from zero |
| Exists but < 50 lines / placeholder content | -2 | Token cost ≠ information |
| Exists, > 200 lines, covers dev env + code conventions | +0 | Baseline |

### Cursor rules / Claude skills

| Condition | Deduction | Notes |
|-----------|-----------|-------|
| No `.cursor/rules/*.mdc` nor `.claude/skills/*/SKILL.md` | -2 | |
| 1-3 rules/skills exist | -1 | Sparse coverage |
| ≥ 5 rules/skills covering i18n / state / frontend / commit etc. | +0 | Good |

### Architecture & decision docs

| Condition | Deduction | Notes |
|-----------|-----------|-------|
| No `docs/` or `README.md` (or README is < 20 lines) | -2 | |
| Has README but no architecture overview / ADRs | -1 | AI cannot reason about why |
| Has `docs/architecture/*` or `docs/adr/*` covering key subsystems | +0 | |

### Per-domain typedef files

| Condition | Deduction | Notes |
|-----------|-----------|-------|
| Shared entity types scattered inline across files | -1 | |
| Types consolidated in `src/types/<domain>.js` or equivalent | +0 | |

### Migration / onboarding docs

| Condition | Deduction | Notes |
|-----------|-----------|-------|
| Active migration in progress but no migration-playbook or similar | -1 | AI will pick wrong side |

---

## 6. Architecture & Structure — 8 points

Start at 8. Deduct for:

> **v3 change:** Weight reduced from 11 → 8 to make room for AI-specific
> dimensions. Sub-categories unchanged but caps adjusted proportionally.

### Directory organization

| Condition | Deduction | Notes |
|-----------|-----------|-------|
| No clear top-level structure (flat dump of files) | -3 | |
| Inconsistent directory naming | -1 | |
| No separation between pages/routes and components | -1 | |
| Missing common directories (no utils/lib, no services/api) | -1 | |

### Separation of concerns

| Condition | Deduction | Notes |
|-----------|-----------|-------|
| UI components directly call database/API | -2 | |
| Business logic embedded in route handlers | -1 | |
| No clear data flow direction | -1 | |

### Predictability

| Condition | Deduction | Notes |
|-----------|-----------|-------|
| Cannot guess file location from its purpose | -2 | |
| Deeply nested directories (>5 levels) without clear reason | -1 | |

---

## 7. Dependency Health — 7 points

Start at 7. Deduct for:

> **v3 change:** Weight reduced from 11 → 7. Circular deps still critical
> because they break AI's safe-refactor intuition.

### Circular dependencies

| Condition | Deduction | Notes |
|-----------|-----------|-------|
| 1-3 circular dependency chains | -1 | |
| 4-10 circular dependency chains | -2 | |
| 10+ circular dependency chains | -3 | Architecture is broken |

### Unused / dead dependencies

| Condition | Deduction | Notes |
|-----------|-----------|-------|
| 1-5 unused dependencies | -1 | |
| 6-15 unused dependencies | -2 | |
| 15+ unused dependencies | -3 | |

### Known vulnerabilities

| Condition | Deduction | Notes |
|-----------|-----------|-------|
| Any critical vulnerability | -2 | |
| 3+ high vulnerabilities | -1 | |
| Audit tool not available / not run | -0 | Do not penalize if unavailable |

### Unlisted dependencies

| Condition | Deduction | Notes |
|-----------|-----------|-------|
| Any import not in package.json | -1 per package (max -2) | |

> Duplicate-purpose packages moved to **Pattern Consistency § Module stacking**.

---

## 8. Explicit Prohibition Density — 6 points (NEW in v3)

Start at 6. Deduct for:

> **Rationale:** AI learns negative rules ("❌ don't do X") more reliably than
> positive guidance. Projects with a rich `PR-NNN:`-style prohibition catalog
> (like this workspace) create a fence that catches regressions the moment
> they happen. Projects without them rely on AI's good taste session-to-session.

### Grep-verifiable prohibitions

Count the number of **concrete, `grep`-able ❌ patterns** in:

- `.cursor/rules/*.mdc`
- `AGENTS.md`
- `.claude/skills/*/SKILL.md`
- `docs/proposed-rules.md`
- `docs/architecture/*.md`

A valid prohibition has (a) a `❌` / "不得" / "prohibited" marker and (b) a
backticked code pattern that can be grep'd.

| Condition (per 10k LOC) | Deduction | Notes |
|-----------|-----------|-------|
| 0 prohibitions | -4 | No fence at all |
| 1-5 prohibitions | -2 | Thin fence |
| 6-15 prohibitions | -1 | Basic coverage |
| 16-30 prohibitions | 0 | Solid — baseline |
| 30+ with regression backrefs (e.g. `PR-001`) | **+1 bonus** (cap at 6) | Exemplary |

### Prohibition staleness

| Condition | Deduction | Notes |
|-----------|-----------|-------|
| Prohibitions reference patterns that no longer exist in codebase | -1 | Rules drift from reality |
| ❌ entries without backticked pattern (vague prose) | -1 per 3 (max -2) | Not grep-verifiable |

---

## 9. Naming & Discoverability — 6 points

Start at 6. Deduct for:

### Naming conventions

| Condition | Deduction | Notes |
|-----------|-----------|-------|
| Inconsistent file naming (mix of kebab, camel, Pascal without pattern) | -1 | |
| Generic names (helpers.js, utils.js, misc.js, stuff.js) | -1 per file (max -2) | |
| Single-letter or cryptic variable/function names in exports | -1 | |

### Semantic clarity

| Condition | Deduction | Notes |
|-----------|-----------|-------|
| No domain-specific naming (no xxxService, useXxx, xxxStore pattern) | -1 | |
| File name does not reflect primary export | -1 per 2 files (max -1) | |

### Search friction

| Condition | Deduction | Notes |
|-----------|-----------|-------|
| Multiple files with same base name in different dirs | -1 | |

---

## 10. Duplication & Dead Code — 5 points

Start at 5. Deduct for:

### Code duplication (jscpd)

| Condition | Deduction | Notes |
|-----------|-----------|-------|
| Duplication rate 3-5% | -1 | |
| Duplication rate 5-10% | -2 | |
| Duplication rate >10% | -3 | |

### Dead code

| Condition | Deduction | Notes |
|-----------|-----------|-------|
| 1-10 unused exports | -1 | |
| 10-30 unused exports | -1 | |
| 30+ unused exports | -2 | |
| Orphan files (unreachable from entry) | -1 per 5 files (max -1) | |

### Commented-out code

| Condition | Deduction | Notes |
|-----------|-----------|-------|
| Scattered commented-out blocks (5-15) | -0 | Not worth a point here |
| Widespread commented-out blocks (15+) | -1 | |

---

## 11. Determinism & Side-Effect Hygiene — 3 points (NEW in v3)

Start at 3. Deduct for:

> **Rationale:** AI's mental model assumes "same input → same output". Code that
> breaks this — SSR/CSR divergence, import-time side effects, non-deterministic
> render — is AI-hostile because it can't reason about what happens without
> running it. Previously scattered across Complexity & Performance in v2.

### SSR / render non-determinism

| Condition | Deduction | Notes |
|-----------|-----------|-------|
| `typeof window !== "undefined"` inside `useMemo` / JSX for SSR-affecting state | -1 | Guaranteed hydration mismatch |
| `useState(Date.now())` / `useState(Math.random())` / `uuid()` at render | -1 | Non-deterministic first paint |
| `useLayoutEffect` to "fix" hydration mismatch | -1 | Wrong layer; runs after compare |

### Import-time side effects

| Condition | Deduction | Notes |
|-----------|-----------|-------|
| Modules with top-level `fetch` / `localStorage` / mutable state | -1 | |
| Global singletons initialized on import | -1 | |

### Flaky testing signals

| Condition | Deduction | Notes |
|-----------|-----------|-------|
| Tests using `Math.random` / real `Date.now()` / real network | -1 | Non-deterministic CI |

---

## 12. Security & Tooling Config — 3 points

Start at 3. Deduct for:

> **v3 change:** Weight reduced from 7 → 3. README moved to AI Context,
> formatter moved to Pattern Consistency. Only hard security + linter remain.

### Security

| Condition | Deduction | Notes |
|-----------|-----------|-------|
| Hardcoded API keys or secrets in source | -2 | Critical |
| No `.env.example` file | -1 | Onboarding friction |
| `.gitignore` missing or incomplete | -1 | |

### Linter

| Condition | Deduction | Notes |
|-----------|-----------|-------|
| No linter (ESLint / Biome / ruff) configured | -1 | |
| Linter present but many rules disabled via inline comments | -1 | |

---

## 13. AI App Surface — 8 points（条件激活,NEW in v4）

**激活条件（Step 0 任一命中）**：依赖含 `@anthropic-ai/*` / `openai` / 其它 LLM SDK;
存在 provider 注册表/抽象层;存在 SSE/streaming chat 路由;存在 prompt/提示词资产目录;
spawn 本地 agent CLI（claude/codex/cursor-agent 等）。未激活 → 本维度不出现,
12 维计 100 分,**非 AI 项目零影响**。

> **Rationale:** v3 是"AI 作为维护者"视角,对"AI 作为应用域"零感知——提示词契约、
> 流式错误路径、abort/超时卫生、成本护栏、agent 协议漂移这些 LLM 应用的真实风险面
> 完全不在 12 维内;项目自己发明的字节级提示词契约与 fork 差异登记表恰是最有价值
> 的工件,v3 既不识别也不奖励。

Start at 8. Deduct per the composition rules.

### Prompt 资产管理（AIS-P*）

| ID | Condition | Deduction | Notes |
|----|-----------|-----------|-------|
| AIS-P1 | 提示词散落在调用点字符串里（无集中资产/版本化） | -1 | |
| AIS-P2 | 提示词变更无任何守门（无 golden/eval/BDD/字节契约任一映射） | -1 | "改了 prompt,哪个测试会红?"必须有答案 |

### 流式与中断卫生（AIS-S*）

| ID | Condition | Deduction | Notes |
|----|-----------|-----------|-------|
| AIS-S1 | SSE/stream 错误帧路径无测试（错误事件/中段失败/心跳） | -1 | |
| AIS-S2 | AbortSignal 未贯通到底层（HTTP/子进程不随客户端断开终止）或无超时上限+兜底 kill | -1 | 配额泄漏/子进程长尾 |

### 成本与限流护栏（AIS-C*）

| ID | Condition | Deduction | Notes |
|----|-----------|-----------|-------|
| AIS-C1 | 无任何输入上限（消息条数/字符数/请求体）且无 rate-limit | -1 | |

### Provider 抽象（AIS-A*）

| ID | Condition | Deduction | Notes |
|----|-----------|-----------|-------|
| AIS-A1 | 无统一 provider 抽象（新增厂商需改散落调用点）或 LLM key 未全部 env 化 | -1 | key 部分与 Dim 12 同证据时只计一处（计这里） |

### Agent 协议漂移登记（AIS-V*;仅当存在 vendored agent CLI/协议 fork 时适用）

| ID | Condition | Deduction | Notes |
|----|-----------|-----------|-------|
| AIS-V1 | 存在有意分叉的 agent 协议实现但无差异登记表 | -1 | 登记表范式:每条差异 = 行为对照 + 分叉理由 + 验证方式 |

### 加分

| ID | Condition | Bonus | Notes |
|----|-----------|-------|-------|
| AIS-B1 | 提示词有字节级一致性契约 + 守卫,且协议差异登记表每条带验证方式 | +1 (cap 8) | AI 应用工程模范 |

---

## Score aggregation

```
Base (Dim 13 inactive):
  Total = D1 + … + D12 = 100

Dim 13 active (LLM application detected):
  raw   = D1 + … + D12 + D13   (max 108)
  Total = round(raw / 108 × 100)

Risk Level:
  0–30  → CRITICAL
  31–50 → HIGH
  51–70 → MODERATE
  71–85 → LOW
  86–100 → EXCELLENT      (≥95 = AI-native 满级,报告按满级措辞)
```

Within a dimension, apply the **global composition rules** (top of this file):
sum the triggered sub-items under the same-evidence-once and tier-exclusive
rules, cap at 0. **No lenient fallback** — borderline cases take the lower tier
and are registered in the ledger as `kind: "disputed"` for next-scan re-read.

### Quick mode aggregation

In Quick mode, only dimensions scored by automated tools are included.
Re-weight by: `adjusted_score = (scored_sum / scored_max) * 100`.
In Quick mode, **AI Context Artifacts**, **Explicit Prohibition Density**, and
**Structural Invariants** sub-score are still measured (they're automation-friendly),
only the **manual spot-checks** (Pattern drift sampling, Test quality review) are skipped.

---

## Calibration anchors

Use these reference profiles to calibrate your scoring.

### Anchor A: "Fresh vibe-coded MVP" — expect 15-30

- 2-3 files over ~3200 tokens (800 LOC), one is a god component
- No consistent patterns (useState + Context + raw fetch all mixed)
- Flat directory structure
- Generic names: `helpers.js`, `api.js`, `utils.js`
- 8%+ code duplication
- No TypeScript or JSDoc; 40+ untyped `any`
- No linter, no formatter, no tests
- **No `AGENTS.md`, no `.cursor/rules`, no scan tests** (v3 amplifier)
- 0 grep-verifiable ❌ prohibitions

### Anchor B: "Growing project, some discipline" — expect 40-58

- 1-2 files over ~2000 tokens, 5-8 in the 1200-2000 range
- Mostly one state management approach but some drift
- Reasonable directory structure with some misplaced files
- TypeScript with strict off, 10-20 `any`
- ESLint configured but some rules disabled
- A few test files but < 20% coverage
- **Has `README.md` but no `AGENTS.md` or rules** (v3 amplifier)
- 0-5 prohibitions, no structural scan tests

### Anchor C: "Well-maintained production app" — expect 66-80

- No files over ~2000 tokens, a few in 1200-1600 range
- Consistent patterns throughout
- Clear directory structure with separation of concerns
- Domain-specific naming
- TypeScript strict, < 5 `any`
- ESLint + Prettier, CI lint
- 40-60% coverage, key flows tested
- **Has `README.md` + brief `AGENTS.md` but no `.cursor/rules`** (v3)
- 5-15 prohibitions, 1-2 scan tests

### Anchor D: "Exemplary human engineering" — expect 80-90

- All files under ~1200 tokens, functions under 40 lines
- Perfect pattern consistency
- Architecture enforced by dependency-cruiser
- < 1% duplication, zero dead code (Knip clean)
- TypeScript strict, zero `any`
- Full tooling suite, CI/CD
- 80%+ coverage, E2E for critical flows
- **Has `AGENTS.md` + `.cursor/rules` + ADRs** (v3)
- 15-30 prohibitions, 3+ scan tests

### Anchor E: "AI-native project" — expect 88-100

> **v4 满级语义**：total ≥ 95 即 **AI-native 满级**。报告写"满级;剩余扣分均为
> 台账内政策项",不写"距满分差 N 分"——实测最后几分只能用伤害性操作换
> （拆 vendored fork、为躲带阈值碎片化中型文件）,把 100 当目标会反向破坏代码库。

Everything in Anchor D **plus**:

- Every exported API has JSDoc `@param` / `@returns` or TS types
- Shared types consolidated in `src/types/<domain>.js` per-domain
- ≥ 5 structural scan tests (hydration, size limits, barrel imports, etc.)
- ≥ 30 grep-verifiable `PR-NNN:`-style prohibitions with backticked patterns
- Migration playbook / architecture docs cover every major subsystem
- `.vibe-risk-history.json` tracked in git; per-dimension slopes non-negative
- Autonomous remediation prompts proven safe (project can self-heal without humans)

---

## Refactoring Risk Calculation

Refactoring Risk is a **composite metric** (0–100, higher = riskier) that estimates how
dangerous it would be to perform a large-scale refactoring of the project.

> **v3 note:** Refactoring Risk is now **paired with AI Extension Risk** (see
> next section). They measure different things:
> - Refactoring Risk: "will a large rewrite collapse?"
> - AI Extension Risk: "will the next AI session regress?"

### Inputs (unchanged formula)

Factors 1-4 as before:

#### Factor 1: Size Multiplier

| LOC Range | File Count Range | Scale | Multiplier |
|-----------|-----------------|-------|-----------|
| < 2k | < 30 | TINY | 0.5 |
| 2k – 10k | 30 – 100 | SMALL | 0.7 |
| 10k – 30k | 100 – 300 | MEDIUM | 0.9 |
| 30k – 80k | 300 – 700 | LARGE | 1.1 |
| 80k – 200k | 700 – 1500 | VERY LARGE | 1.3 |
| > 200k | > 1500 | MASSIVE | 1.5 |

Use whichever classification (LOC or file count) produces the **higher** scale.

#### Factor 2: Health Deficit

```
health_deficit = 100 - vibe_health_score
```

#### Factor 3: Safety Net Penalty

| Test Coverage | Penalty Multiplier |
|--------------|--------------------|
| > 60% | 0.85 |
| 30% – 60% | 1.0 |
| 10% – 30% | 1.1 |
| 1% – 10% | 1.15 |
| 0% | 1.2 |

#### Factor 4: Performance & Memory Debt Multiplier

> **v4:** 只计 Phase 2 **确认后**的信号（`perf_debt_confirmed`）,不计 Step 8
> 裸 grep 候选——实测候选中大半是误报（持久 DOM 的一次性 addEventListener 等）。
> 报告同时披露 candidates → confirmed 两个数。

| Confirmed Debt Signal Count | Multiplier |
|------------------|-----------|
| 0 – 3 | 1.0 |
| 4 – 8 | 1.05 |
| 9 – 15 | 1.1 |
| 16 – 25 | 1.15 |
| 26+ | 1.2 |

### Formula

```
raw_risk = health_deficit × size_multiplier × safety_penalty × perf_debt_multiplier
refactoring_risk = clamp(round(raw_risk), 0, 100)
```

### Risk Levels

| Score | Level |
|-------|-------|
| 0 – 15 | MINIMAL |
| 16 – 35 | LOW |
| 36 – 55 | MODERATE |
| 56 – 75 | HIGH |
| 76 – 100 | EXTREME |

---

## AI Extension Risk Calculation (NEW in v3)

Where Refactoring Risk answers *"can humans rewrite this safely?"*, **AI Extension
Risk** answers *"will the next AI session regress the codebase?"* They are
independent and both belong in Section 2 of the report.

### Inputs

#### Factor E1: Pattern Drift Multiplier

Derived from Dimension 2 (Pattern Consistency):

| Dim 2 score | Multiplier |
|-------------|-----------|
| 12-14 | 1.0 |
| 9-11 | 1.15 |
| 5-8 | 1.3 |
| 0-4 | 1.5 |

#### Factor E2: Prohibition Deficit Multiplier

Derived from Dimension 8 (Explicit Prohibition Density):

| Dim 8 score | Multiplier |
|-------------|-----------|
| 5-6 | 0.85 (bonus — rules actively prevent regression) |
| 3-4 | 1.0 |
| 1-2 | 1.2 |
| 0 | 1.4 |

#### Factor E3: Context Artifact Deficit Multiplier

Derived from Dimension 5 (AI Context Artifacts):

| Dim 5 score | Multiplier |
|-------------|-----------|
| 8-10 | 0.9 |
| 5-7 | 1.0 |
| 2-4 | 1.2 |
| 0-1 | 1.4 |

#### Factor E4: Determinism Multiplier

Derived from Dimension 11:

| Dim 11 score | Multiplier |
|-------------|-----------|
| 3 | 1.0 |
| 2 | 1.05 |
| 1 | 1.1 |
| 0 | 1.2 |

### Formula

```
ai_ext_raw = (100 - vibe_health_score) × pattern_drift × prohibition_deficit × context_deficit × determinism
ai_extension_risk = clamp(round(ai_ext_raw), 0, 100)
```

### Risk Levels (same bands as Refactoring Risk)

| Score | Level |
|-------|-------|
| 0 – 15 | MINIMAL |
| 16 – 35 | LOW |
| 36 – 55 | MODERATE |
| 56 – 75 | HIGH |
| 76 – 100 | EXTREME |

### Calibration examples

| Profile | Health | Dim2 | Dim5 | Dim8 | Dim11 | Raw | Clamped | Level |
|---------|--------|------|------|------|-------|-----|---------|-------|
| AI-native (Anchor E) | 92 | 14 (×1.0) | 10 (×0.9) | 6 (×0.85) | 3 (×1.0) | 8×1.0×0.9×0.85×1.0 = 6.1 | **6** | MINIMAL |
| Human-exemplary, no AI docs (Anchor D-) | 78 | 13 (×1.0) | 4 (×1.2) | 1 (×1.2) | 3 (×1.0) | 22×1.0×1.2×1.2×1.0 = 31.7 | **32** | LOW |
| Growing, no fence (Anchor B) | 50 | 8 (×1.3) | 5 (×1.0) | 2 (×1.2) | 2 (×1.05) | 50×1.3×1.0×1.2×1.05 = 81.9 | **82** | EXTREME |
| Vibe MVP (Anchor A) | 22 | 4 (×1.5) | 0 (×1.4) | 0 (×1.4) | 1 (×1.1) | 78×1.5×1.4×1.4×1.1 = 252 | **100** | EXTREME |

### How to report

1. Show **both** Refactoring Risk and AI Extension Risk in Section 2.
2. In the assessment, identify the dominant amplifier:
   - If `pattern_drift × prohibition_deficit > 1.5` → "Pattern drift is the AI regression risk"
   - If `context_deficit > 1.2` → "Lack of AI context artifacts — add `AGENTS.md` and rules first"
   - If `determinism > 1.1` → "Non-deterministic code paths — stabilize before extending"
3. For HIGH/EXTREME AI Extension Risk, P0 remediation MUST include:
   - Create `AGENTS.md` if missing
   - Add first `.cursor/rules/*.mdc` or `AGENTS.md § conventions` section
   - Add first structural scan test
   - Convert top 3 drifting patterns into grep-verifiable `❌` prohibitions

---

## Drift Watch（v4 — 高分段先行指标）

**触发**：health ≥ 90。此时 deficit ≤ 10,两个乘法公式饱和在 MINIMAL,失去信息量
（实测 health 92→99 时输出恒为 1,毫无区分度）。报告 Section 2.2 在风险数字之外
**追加** Drift Watch 三指标——它们是**先行**指标,不会随高分饱和：

| 指标 | 计算 | 绿 | 黄 | 红 |
|---|---|---|---|---|
| 新增模块守卫密度 | 本轮新增结构守卫数 / 本轮新增一方模块数（自上次扫描的 git diff） | ≥ 1/10 | 1/20–1/10 | < 1/20 |
| 新增代码覆盖率 | 本轮 diff 新增行中被测试覆盖的比例（仅 coverage 宇宙内） | ≥ 60% | 30–60% | < 30% |
| 禁令陈旧数 | Step 12 中 pattern 已不存在但条目未清理的禁令数 + 台账中超过 2 轮未 verify 的条目数 | 0 | 1–2 | ≥ 3 |

任一指标红 → 报告给出针对性 P1 建议（补守卫 / 补测 / 清陈旧）;三绿 + 满级 →
"满级且无漂移征兆",这是 v4 对成熟仓库的最高评语。
