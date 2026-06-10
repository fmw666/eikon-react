# Changelog

All notable changes to the **vibe-risk-analyzer** skill are documented here.
This skill follows [Semantic Versioning](https://semver.org/).

---

## [4.1.0] — 2026-06-10

### Added — 治理层（用户直接要求,两个新文件）

- **[SELF-EVOLUTION.md](SELF-EVOLUTION.md)**：Phase 7 自进化反思——每次扫描/修复
  收尾跑 E1–E5 清单（误判/断点/新风险/阈值证据/临时口径）,沉淀进**有界候选区**
  （≤10 条,FIFO,复现 ≥2 个项目才够提案门槛）,有候选才向用户输出固定格式的
  「🧬 进化候选」提醒并询问是否发提案。**硬边界：运行中绝不静默修改任何规范文件。**
- **[CHANGE-GATE.md](CHANGE-GATE.md)**：五关变更门控,适用于对 skill 的一切修改
  （含门控自身）——G1 真实价值（三类准入+当场证据）、G2 通用性（规范文零项目专名,
  单项目特例分流到 .vibe-riskrc/台账/AGENTS.md,落地必跑泄漏 grep,单项目阈值证据
  只能进候选区）、G3 反臃肿（单提案净增 ≤150 行、one-in-one-out、各文件软上限、
  新文件需证明不可并入）、G4 可验证性（ID/公式/验收,分数语义变更必 bump rubric）、
  G5 流程（一切走提案+自查清单）。
- SKILL.md 接线：工作流加 Phase 7、Rules 15–16、参考文件表两行。

### 本次变更的门控自查（dogfooding）

```
[x] G1 价值：准入=修正已观察到的治理断点;证据=v4 落地当天即发生规范文项目专名
    泄漏 9 处(靠用户提醒才审计修复)+ v4 本身正是“一次运行的沉淀险些无处安放”的实例
[x] G2 通用：两个新文件零项目专名(落地后 grep 复核);候选区示例条目已项目匿名化
[x] G3 体量：净增=两个新文件(~140 行,各自 ≤120 上限内)+SKILL.md 接线 ~30 行;
    one-in-one-out 结论=不替换旧条目(治理层为全新职责,无可合并对象;两文件职责
    正交且被 SKILL.md 多处引用,满足新文件门槛)
[x] G4 验证：E1–E5/G1–G5 均为清单化可勾选项;不改分数语义,rubric 不动(minor bump)
[x] G5 流程：本 CHANGELOG 条目即提案记录(治理层自举:门控自其存在起生效)
```

---

## [4.0.0] — 2026-06-10

> 依据一次真实的极限压力测试（一个双包 workspace 真实项目的「扫描+修复」推到 92→99 / 94→96）
> 修正 v3 在评分真实性、AI 应用域、工具链韧性上的系统性缺陷。
> 完整论证与当场证据：[PROPOSAL-v4.md](PROPOSAL-v4.md)。

### Added — 评分真实性（P0）

- **Standing Deduction Ledger（扣分台账）**：history schema v3 增加
  `standing_deductions[]`（id/dimension/sub_item/points/kind/clearing_condition/
  `verify_cmd`/last_verified）。新增 **Step 14** 每轮逐条跑 `verify_cmd` 复核——
  仍成立/已失效（清除并公示）/恶化（升级）。`kind: policy|debt|disputed` 把
  "政策性上限"与"待还债务"显式分开。动机：实测上轮"42 个 console-only catch"
  的结论已陈旧（真实仅 8 处）,而 v3 流程会照单全修。
- **确定性组合公式 + 子项 ID + scorecard.json**：
  `维度分 = max(0, 满分 − min(cap, Σ生效子项))`,同一证据只计一次、分档互斥;
  每条扣分引用唯一 ID（`SRP-F2` 等）;`.vibe-risk/scorecard.json` 机读推导总分。
  **删除"拿不准就从宽"条款**——边界取低档并登记 `disputed`。动机：v3 下同一
  commit 出现 99/98 双口径。
- **`.vibe-riskrc.json`**：`vendorGlobs / dataAssetGlobs / generatedGlobs` 声明
  三方在树与纯数据资产;尺寸/重复阈值只算一方代码,三方单列报告区。动机：
  vendored fork 连续 4 轮靠 scope_note 散文自圆其说。
- **Remediation P-1 再裁定阶段**（两种模式都强制）：修复前逐条复测继承项,
  陈旧跳过并登记——绝不修复幻影问题。

### Changed — 核心指标（P1）

- **Module SRP 重构为 flow-cost 主指标**（SRP-W*：p90 业务流闭包 token）,
  文件尺寸降为辅助信号且按**占比**计;纯委托 facade、dataAsset、本轮拆分净新增
  的预警带文件豁免。动机：v3 的单文件阈值被机械拆分博弈——拆完 20 个 >2000
  文件,1200–2000 带反而 27→47。
- **Coverage 重构**：关键路径覆盖为主指标;强制**分母审计**（include/exclude
  与统计宇宙必须入报告）;历史对比用 covered_lines 绝对增量（**重构中性**——
  v3 下纯结构拆分使百分比 55.3→50.6 并被扣分）;新增 `ui_heavy` 画像
  （守卫 ≥5 + 关键路径有测 → 低全局 % 不再重罚）。
- **Perf-debt 只计 confirmed**：Step 8 输出 candidates,Phase 2 裁定后才进
  Factor 4 乘数;报告披露 candidates→confirmed 转化率。
- **满级语义 + Drift Watch**：total ≥ 95 = "AI-native 满级"（报告不再写
  "距满分差 N 分"——实测最后几分只能用伤害性操作换）;health ≥ 90 时风险公式
  饱和,追加 Drift Watch 三先行指标（新增模块守卫密度 / diff 新增代码覆盖率 /
  禁令陈旧数）。
- **Monorepo 默认每包独立趋势线 + scorecard**,加权平均降级为可选汇总行。

### Added — AI 应用域（P2）

- **Dimension 13: AI App Surface（8 分,条件激活）**：Step 0 检出 LLM 信号
  （SDK / provider 注册表 / SSE chat / prompt 资产 / agent CLI spawn）时启用;
  检查提示词资产与变更守门、流式错误帧与 abort/超时卫生、成本护栏、provider
  抽象、agent 协议漂移登记表。激活时 `total = round(raw/108×100)`,未激活
  12 维照旧——非 AI 项目零影响。推荐矩阵新增 prompt-change-guard /
  sse-error-path spec / provider-divergence-registry 三行。

### Added — 工具链韧性（P3）

- **每个工具配失效判据与兜底链**：madge 别名空真 → `--ts-config` → skott →
  自带 import-scan;knip 无 workspace 配置 → documented skip 不扣分;
  audit 显式打官方 registry;react-doctor 定位为 advisory findings feed,
  永不作为 headline 分数。**空真（vacuous pass）必须如实报告**。
- **`references/scripts/` 三个参考实现**（全部经真实仓库验证）：
  `census.mjs`（class-aware 普查,--file 模式可作台账 verify_cmd）、
  `catch-audit.mjs`（**注释感知**——先认意图注释再判静默,v3 式审计的 42→8
  误报由此修复）、`graph-fallback.mjs`（无 graphviz 的目录级依赖 SVG,
  上行边高亮疑似跨层违例）。
- **执行环境陷阱清单**写入 automated-scanning.md 开头：shell cwd 跨调用持久、
  CRLF 锚点、多层转义蒸发、镜像源无 audit 端点。

### Migration guide — 从 v3.x 升级

1. history v2 → v3：bump `schema_version`,从最近条目的 top_issues/scope_note
   **播种台账**（每条 `kind: "disputed"`,首轮 Step 14 转正或清除）。
2. **v4 分数与 v3 不可直接对比**（SRP/coverage 口径变了）：v4 首轮在报告注明
   基线重置,history 条目带 `rubric: "v4"`;旧条目缺省视为 v3。
3. 有 vendored/生成代码的项目：先建 `.vibe-riskrc.json`,否则全树按一方代码
   从严计——这是显式声明制,skill 不再替你猜。

---

## [3.0.0] — 2026-04-23

### 核心定位调整

从"传统代码质量审计器"重新定位为**真正的 AI-as-maintainer 风险分析器**。
旧版本 (v2.x) 的 10 维度评分体系本质上是把人类工程规范做成了 checklist；
v3 把"AI 作为唯一长期维护者"的心智特征落到了权重、维度与评分细则里。

### Added — 新增 3 个维度

- **AI Context Artifacts (10 分)** — 评估 `AGENTS.md`、`.cursor/rules/*.mdc`、
  `.claude/skills/*/SKILL.md`、ADR、`docs/architecture/*` 等"AI 长期记忆"载体
  的完备度。此前仅在 Section 8 作为"建议"，现正式进入核心评分。
- **Explicit Prohibition Density (6 分)** — 量化 workspace 里可 `grep` 验证的
  ❌ 条款数（例如 `PR-001`、`PR-012` 格式的禁令），评估"AI 下一次会话是否有足
  够的围栏避免倒车"。
- **Determinism & Side-Effect Hygiene (3 分)** — 扫描 `typeof window`、
  `useState(Date.now())`、`Math.random()` 渲染期调用、import-time 副作用等
  破坏 AI"同样输入同样输出"假设的 pattern。原先散落在 Complexity/Performance 里。

### Changed — 权重重组

总分仍为 100。调整如下（Complexity 维度被吸收进 Module SRP）：

| 维度 | v2.x | v3.0.0 | 变化 | 理由 |
|---|---|---|---|---|
| Module Granularity & SRP | 18 | **14** | -4 | 合并 Complexity，但仍降权（AI 对大文件敏感主因是 token 成本，非认知负担） |
| Pattern Consistency | 12 | **14** | +2 | AI 从既有代码"归纳"写法，对 drift 敏感度 >> 人类 |
| Type Safety & Contracts | 7 | **12** | +5 | 类型/JSDoc 是 AI **唯一**不运行代码就能校验契约的手段 |
| Test Coverage & Structural Invariants | 9 | **12** | +3 | 含新增"结构性扫描测试"子项（如 `hydration-safety.test.js`）；AI 的唯一反馈回路 |
| **AI Context Artifacts** | — | **10** | new | 见上 |
| Architecture & Structure | 11 | **8** | -3 | 降权让位给 AI-specific 维度 |
| Dependency Health | 11 | **7** | -4 | 降权（对 AI 维护的直接影响小于契约/测试） |
| **Explicit Prohibition Density** | — | **6** | new | 见上 |
| Naming & Discoverability | 9 | **6** | -3 | 降权 |
| Duplication & Dead Code | 9 | **5** | -4 | 降权 |
| **Determinism & Side-Effect Hygiene** | — | **3** | new | 见上 |
| Complexity | 7 | — | removed | 并入 Module SRP（对 AI 并非独立痛点） |
| Security & Tooling Config | 7 | **3** | -4 | 剥离 README（移入 AI Context）、formatter（移入 Pattern）；仅保留硬编码密钥 + linter |
| **合计** | **100** | **100** | — | |

### Changed — 阈值与算法

- **文件大小阈值从 LOC 改为近似 token 数**（`chars/4`），消除 Python/TSX/Go
  密度差异带来的偏差。500 LOC → ~2000 tokens 为新阈值。
- **`any` usage 计分细化**：未注释的 `any` 按原规则扣分；带
  `// AI: unknown external` 或 `@ts-expect-error` 注释的 `any` 折半计分。
- **测试覆盖按关键路径分层**：auth / payment / data-mutation 路径的 0 覆盖
  扣分权重 ×2（原先全库一个百分比）。
- **`any` / 覆盖率 / 文件大小**等原"绝对阈值"调整为"项目规模归一化"。

### Changed — 重构风险公式

新增 **AI Extension Risk** 作为平行指标：

- **旧指标 `Refactoring Risk`** 保留，含义仍是"人类/AI 大规模重写的崩溃概率"。
- **新指标 `AI Extension Risk`** 独立计算，衡量"下一次 AI 会话安全扩展的概率"，
  公式：`(100 - vibe_health) × pattern_drift_mult × prohibition_deficit_mult × context_artifact_deficit_mult`。
- 两个指标在 Section 2 并列呈现。

### Changed — 漂移追踪

- `.vibe-risk-history.json` schema 升级为 v2：记录逐维度分数，而非仅总分。
- Section 10 "Score History" 输出**每维度斜率**，负斜率（逐次退步）触发告警。
- 向后兼容：v1 history 自动识别并迁移。

### Changed — 工作流

- **Phase 6 可视化**从"交互式 localhost"改为**静态 SVG/PNG 落盘到项目相对目录
  `.vibe-risk/dependency-graph.svg`**（跨平台：Windows / macOS / Linux / cloud），
  适配 cloud agent / CI 等非交互环境。cloud agent 如有专用 artifacts 挂载点可
  覆盖为绝对路径（如 `/opt/cursor/artifacts/`）。可选保留 `--interactive`
  标志恢复旧行为。
- **Phase 2 Step 6 "Performance deep dive"** 与 Phase 1 Step 8 合并去重。
- **remediation-prompt.md 新增 `autonomous` 模式**：`{mode}` 占位符支持
  `interactive`（原行为，每步等确认）或 `autonomous`（AI 直接按 P0→P1→P2
  连续执行并自审），由 skill 生成时根据执行环境自动选择。

### Changed — 校准锚点（Anchors）

- Anchor D "Exemplary" 从"dependency-cruiser + 80% coverage + TS strict"
  扩展为 **"+ `AGENTS.md` + 结构性扫描测试 + 可验证 ❌ 规则 > 20 条"**。
- 新增 **Anchor E: "AI-native project"（86-100）**——明确区分"人类工程模范"与
  "AI 维护模范"两类健康画像。

### Added — 新增自动化扫描步骤

`references/automated-scanning.md` 新增：

- **Step 11 — AI Context Artifact Census**：扫描 `AGENTS.md` /
  `.cursor/rules` / `.claude/skills` / `docs/architecture` / ADR 数量与覆盖面。
- **Step 12 — Explicit Prohibition Density**：grep `❌` / `PR-\d+` / "不得" /
  "prohibited" 等模式，统计可验证条款密度。
- **Step 13 — Structural Invariant Tests**：glob `src/**/__tests__/**` +
  scan for `readFileSync`/`glob` 调用，识别"全库结构扫描测试"。

### Removed

- **Complexity 作为独立维度**（7 分）— 并入 Module SRP。
- Section 9 "Security & Tooling" 下的 README / formatter 检查项 — 迁移到
  AI Context Artifacts 与 Pattern Consistency。

### Migration guide — 从 v2.x 升级

1. **历史数据**：v1 `.vibe-risk-history.json` 会被自动迁移，
   但新维度（AI Context / Prohibition Density / Determinism / Structural
   Invariants）在旧数据中显示为 `null`，斜率计算从 v3 首次扫描开始。
2. **分数绝对值不可直接对比**：v2 → v3 同项目的总分通常下降 5–15 分，因为新
   维度暴露了此前未评估的 AI-maintainability 缺口。这是**特性**，不是 bug。
3. **自定义配置**：如果你 fork 了 skill 调整过权重，重新对照 v3 维度表分配。

---

## [2.0.0] — 2026-03-02 (baseline)

v2.x 系列——10 维度 100 分制，初版 vibe coding risk analyzer。参见
`scoring-reference.md` v1.3.0 历史归档（如需）。

主要能力：
- 10 维度评分（Module SRP / Pattern / Architecture / Dependency / Naming /
  Duplication / Complexity / Type Safety / Security / Test Coverage）
- 4 因子重构风险公式（health × size × safety × perf_debt）
- Quick / Full 双模式
- `.vibe-risk-history.json` 持久化（v1 schema）
- 交互式 skott 依赖图
- 一键 remediation prompt（interactive only）
