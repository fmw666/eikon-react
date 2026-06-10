# Vibe Risk Analyzer v4 改进提案

> **状态：已落地（4.0.0,2026-06-10）**——全部条目（P0–P3 + 附录指引）已写入
> SKILL.md / scoring-reference.md / report-template.md / remediation-prompt.md /
> references/automated-scanning.md / references/scripts/*,见 CHANGELOG 4.0.0。
> 本文保留作设计论证与证据档案。

> 依据：2026-06-10 在一个双包 workspace 真实项目（web 根包 92→99 + Electron 桌面包 94→96 的同场「扫描+修复」）
> 中对 v3.0.0 的极限压力测试。所有问题均有当场证据（见文末附录 A），按优先级排列。
> 本文是提案，不是变更——采纳时逐条落入 SKILL.md / scoring-reference.md / report-template.md /
> references/*，并在 CHANGELOG.md 记录 4.0.0。

**四大主题**：①评分机制的真实性与可复现性 ②AI 应用域适配 ③工具链韧性 ④自身结论的防陈旧。

---

## P0 — 评分真实性（不修则分数失去公信力）

### 1. 扣分台账（Standing Deduction Ledger）— 把扣分从散文变成数据

**问题**：v3 的既往扣分埋在 history 的 `scope_note` 散文里（"42 个 console-only catch 是 standing −1"），
下一轮扫描靠 agent 读懂上一轮 agent 的措辞。本次实测该结论已经**过期**（多数 catch 早已带意图注释，
真正待修仅 ~8 处），但流程没有任何机制发现这一点。

**提案**：history schema v3 增加 `standing_deductions` 注册表，扫描时先校验、再打分：

```json
"standing_deductions": [
  {
    "id": "SD-001",
    "dimension": "module_srp",
    "points": -2,
    "kind": "policy",                  // policy=政策选择 | debt=待还债务 | disputed=口径分歧
    "reason": "vendored localAgentService.js 8859 tok 锁 >4000 档",
    "clearing_condition": "上游升级或 §53 政策变更后拆分",
    "verify_cmd": "node census --file src/main/vendor/services/localAgentService.js",
    "registered": "2026-06-09",
    "last_verified": "2026-06-10"
  }
]
```

- 扫描 Phase 1 末尾新增 **Step 14：台账复核** —— 逐条跑 `verify_cmd`，结果只有三种：
  `仍成立`（沿用）/ `已失效`（清除并在报告标注「陈旧扣分清除」）/ `恶化`（升级）。
- `kind: policy` 的扣分在报告中单独成节（"政策性上限"），与债务区分——直接回应"问题真实反映程度"。
- 报告 Section 10 增加台账 diff 表（新增/清除/维持）。

**验收**：同一棵树连续两轮扫描，扣分集合 diff 为空；人为造一条陈旧台账，扫描能自动清除。

### 2. 维度评分确定性 — 消灭「从宽/严格」双重读法

**问题**：本次 root 终局分在 99（从宽）与 98（严格）之间二选一，只因 1200–2000 带文件该扣 −1 还是 −2、
函数级子扣分是否与文件级叠加没有定义。若机械叠加 scoring-reference 的所有子表，拆完 20 个 god-file 后
module_srp 反而只有 8 分——显然违背设计意图。"When in doubt choose the more lenient" 是把可复现性
让渡给了运气。

**提案**：
- 每个维度给出**组合公式**而非并列表格。统一规则：`维度分 = max(0, 满分 − min(cap, Σ生效项))`，
  且**同一证据只计一次**（文件尺寸与函数尺寸取其大者；band 与 >2000 不叠加同一文件）。
- 子扣分表每行增加 `id`（如 `SRP-F2`），报告的 Deductions 表必须引用 id——可机读、可 diff。
- 删除"从宽"条款，改为：**边界情况按公式取低档，并在台账登记 `disputed` 待下轮复核**。
- 新增 `scorecard.json` 工件（每维度：触发的子项 id 列表 + 数值），作为报告附件与 history 的依据。

**验收**：两个不同 agent 对同一 commit 打分，12 维全部一致；scorecard.json 能完整推导出总分。

### 3. Vendored / 生成代码的一等公民声明

**问题**：v3 没有"三方在树"概念。desktop 连续四轮扫描都在 scope_note 里手工解释 vendored fork 为何
不拆（8859 tok 锁 −2），每轮重新辩论口径；animate-ui、prettier 豁免也全靠各项目自觉。

**提案**：支持项目根 `.vibe-riskrc.json`（无则全树视为一方代码，向后兼容）：

```json
{
  "vendorGlobs": ["src/main/vendor/**", "**/animate-ui/**"],
  "dataAssetGlobs": ["**/LogoWordmark.tsx", "**/*.data.js"],
  "generatedGlobs": ["**/icons-subset.json"]
}
```

- **一方代码严格打分**；vendored 不进 module_srp/duplication 阈值统计，但单列"三方在树健康"报告区
  （体积、与上游 diff 是否登记、升级阻塞）。dataAsset（纯数据大字符串，如 2617 tok 的 SVG 路径）
  不触发 god-file 逻辑。
- 配套：census 输出 `class` 字段（source/test/data/vendored/generated），Step 1 按类分桶。

**验收**：对本仓 desktop 重扫，无需任何 scope_note 口径解释即可得出与人工裁定一致的 module_srp。

### 4. 修复流程加「再裁定」前置步（remediation-prompt.md）

**问题**：autonomous 模板直接按上轮 top_issues 开修。本次若照单全收，会去"修复"42 处其实健康的 catch。

**提案**：两种模式的 TODO List 前强制插入 **P-1 阶段**：

```
### P-1 — 再裁定（修复前必做）
0. 对每条来自上轮报告/台账的待修项，先用其 verify_cmd（或最小复测）确认仍然成立。
   已失效 → 标记"陈旧"并跳过；恶化 → 升级优先级。产出一行 diff 摘要后才进入 P0。
```

**验收**：在 history 里埋一条已修复的假 issue，autonomous 执行会跳过它并在摘要中标注陈旧。

---

## P1 — 核心指标重构（module_srp 与 coverage 的反常激励）

### 5. module_srp v4：从「单文件尺寸」到「理解成本」

**问题（Goodhart 实锤）**：本次把 20 个 >2000 tok 文件全拆掉，预警带（1200–2000）却从 27 涨到 47——
质量从一个档位被推进了下一个档位；且按 v3 表格，6+ 带文件该扣得更狠。同时大量拆分产物是"委托 facade
+ 子模块"，AI 读一条业务流反而要打开 5 个文件。v3 的理论依据（上下文窗口成本）并没有被它自己的指标度量。

**提案**：
- 主指标改为 **flow-cost**：对入口/管理器层抽样 N 条调用链，计算"理解该链需装载的总 token
  （文件去重后求和）"，对 p90 设阈值。文件尺寸降级为辅助信号。
- 实现可以很轻：madge/import 图 + census token 表即可算，给出参考脚本（见 §12）。
- 配套三条豁免：**纯委托 facade**（>80% 行是 re-export/一行委托）不计带；**dataAsset** 不计（§3）；
  **拆分后净增带文件数**在同一轮报告中标注但不扣分（给重构一个落地缓冲期，下一轮才计入）。
- 1200–2000 带的扣分以**占比**（band_files / source_files）替代绝对数，消除"项目越大越亏"。

**验收**：对本仓 root 重打分：拆分前后 flow-cost 应可见改善（API 层收敛、去重），而不是出现
"拆完反而逼近更重扣分"的悖论。

### 6. coverage v4：分母审计 + 重构中性 + 关键路径为主

**问题三连**：①本次重构使行覆盖从 55.3% 跌到 50.6%——同样的行为、同样的测试，仅因拆分扩大了
插桩分母，**指标惩罚健康重构**；②vitest 的 `coverage.include` 白名单使两批新测试起初根本不计入，
skill 从不审计分母里有什么；③desktop 3.27% 被扣 −2，但 22 个结构守卫 + TS strict + 关键路径行为测试
对 UI 重型 Electron 应用是合理安全网——档位是按 web 服务校准的。

**提案**：
- Step 6 增加**分母审计**：读 coverage 配置的 include/exclude 并打印"统计宇宙"；report 必含该清单。
- 主指标换成 **关键路径覆盖**（v3 已采集但只是小修正项），全局 % 降为次要；
  比较口径用 **covered_lines 绝对增量**而非百分比（重构中性）。
- 新增项目画像 `ui_heavy`（renderer/组件占比 > 60% 时自动判定）：该画像下 `<30% → −2` 放宽为
  `结构守卫 ≥ N 且关键路径有行为测试 → −1 封顶`，并把「typecheck strict + 守卫数」计入反馈环得分。

**验收**：在本仓重演"只拆分不改行为"的提交，coverage 维度分不变。

### 7. perf-debt：确认后才进乘数

**问题**：`addEventListener` 147 vs `remove` 21 多为持久 DOM 的一次性绑定，纯 grep 计数直接喂进
风险乘数；Phase 2 写了"verify false positives"但数字早已入账。

**提案**：Step 8 输出 `candidates`，Phase 2 抽样裁定后产出 `confirmed`；乘数公式只吃 `confirmed`。
报告同时展示两个数（candidates → confirmed），转化率本身就是误报率信号。

---

## P2 — AI 应用域模块（用户痛点：分析"AI 项目"时的盲区）

### 8. 新增可选维度「AI Application Surface」

**问题**：v3 是"AI 作为维护者"视角，对"AI 作为应用域"零感知。本项目是 LLM 应用，真实风险面——
提示词契约、流式错误路径、abort/超时卫生、成本护栏、agent CLI 协议漂移——全部不在 12 维之内；
项目自己发明的 SYSTEM_MESSAGE 字节级一致契约和 §53 fork 差异登记表恰恰是最有价值的工件，skill 无法识别更无法奖励。

**提案**：Step 0 检测到 LLM 特征（`@anthropic-ai/*`、openai、provider/prompt 目录、SSE+chat 路由等）
时激活第 13 维 **AI App Surface（8 分）**，未激活时按 Quick-mode 规则重归一化（不惩罚非 AI 项目）：

| 检查项 | 分值 | 可自动化的判定 |
|---|---|---|
| 提示词资产管理 | 2 | prompts 是否集中/版本化；是否有"提示词变更 → 哪个测试守门"的映射（BDD/golden/eval 任一） |
| 流式与中断卫生 | 2 | SSE/stream 错误帧路径有测试；AbortSignal 贯通到子进程/HTTP；超时有上限与兜底 kill |
| 成本与限流护栏 | 1 | 请求体上限、消息条数/字符上限、rate-limit 中间件、超时可配 |
| 模型/Provider 抽象 | 1 | 单一 provider 注册表；新增厂商不改调用方（fan-in 检查） |
| 凭据与密钥面 | 1 | LLM key 全部 env 化 + .env.example + 校验器（v3 security 已覆盖一半，挪重） |
| Agent 协议漂移登记 | 1 | 存在 vendored agent CLI 时，要求差异登记表（§53 模式）且每条带验证方式 |

- 同步在「Agent Rules & Skills 推荐矩阵」加行：检测到 LLM 应用 → 推荐 `[RULE] prompt-change-guard`、
  `[TEST] sse-error-path.spec`、`[DOC] provider-divergence-registry`。

**验收**：对本仓激活后，§53 表和 SSE 心跳/错误帧测试应转化为得分项；对纯工具库项目该维度不出现。

### 9. 高分段的指标失效与「满分语义」

**问题**：health ≥ 92 后 deficit 太小，AI Extension Risk 公式饱和在 MINIMAL，失去信息量；同时最后
1–4 分只能靠伤害性操作换（拆 47 个中型文件 / 拆 vendored fork），**满分被机械锁死**反而动摇整个量表的可信度。

**提案**：
- 明确满分语义：**95+ 即 "AI-native 满级"**（Anchor E 范围本来就是 88–100），报告在 ≥95 时输出
  "满级；剩余扣分均为台账内政策项"而不是"差 N 分"。
- 高分段（≥90）把 AI Extension Risk 替换为 **Drift Watch 三指标**：新增代码的守卫密度
  （guards/新模块）、新增代码覆盖率（仅本轮 diff）、禁令陈旧数。三者都是先行指标，不会饱和。

### 10. Monorepo：把「每包独立趋势线」扶正

**问题**：v3 写的是加权平均，会掩盖单包回归。本仓自发演化出 root 与 desktop 两条 history 的惯例,
四轮实践证明远优于平均。

**提案**：SKILL.md monorepo 节改为：默认**每包一条 history + 一份 scorecard**，报告做并列对照
（本次报告的双列模板可直接收编为 report-template v4 的 monorepo 变体）；加权平均仅作为可选汇总行。

---

## P3 — 工具链韧性与工程细节

### 11. 每个工具配「失效判据 + 替代路径」

本次实测的失效清单与建议兜底：

| 工具 | 实测问题 | v4 兜底 |
|---|---|---|
| madge | TS 路径别名（@/、@shared）下 0 文件处理，"无循环"是空真 | 检测 alias → 自动注入 `--ts-config`；仍失败则降级 skott / 自带 import-scan 脚本；报告必须标注"空真"风险 |
| knip | 无 workspace 配置时对兄弟包全量误报 | 提供 knip workspace 最小配置模板；未配置则跳过且不计 dead-code 子分 |
| madge --image | graphviz 缺失直接失败 | 收编本次的 census+import→SVG 自绘脚本为 `references/graph-fallback.mjs`（目录级聚合，效果更可读） |
| react-doctor | 给 48 分 vs 本体系 96 分，信号互相打架 | 明确定位为 **advisory findings feed**：产出进 Phase 2 triage，永不作为 headline 数字并列展示 |
| npm/pnpm audit | 镜像源（npmmirror）无 audit 端点 | 文档化 `--registry=https://registry.npmjs.org` 显式打官源（本仓已实践三轮） |

### 12. 收编参考实现脚本

本次手写并验证过的三个脚本应进 `references/scripts/`，结束"每轮扫描现写一遍"的浪费：
- `census.mjs`——token 普查（含 source/test/data/vendored 分类；**教训**：test 判定不要用
  `/features//` 这种宽松正则,会把 React 的 features 目录误伤）；
- `catch-audit.mjs`——**注释感知**的静默 catch 审计（剥注释前先判定"是否带理由注释"，
  这是 v3 误报 42→实际 8 的直接原因）；
- `graph-fallback.mjs`——无 graphviz 的目录级依赖图 SVG。

### 13. 跨平台与执行环境陷阱（写进 automated-scanning.md 开头）

本次踩过、值得固化为告警的坑：**Bash 工具的 cwd 会跨调用持久**（一次 `cd desktop &&` 让后续三条
命令静默跑错目录，包括一次背景覆盖率任务）→ 规定扫描命令一律绝对路径或 `-C`/`--prefix`；
CRLF 仓库里所有锚点替换要 `\r?\n` 容错；多层引号转义（bash→node→regex）易蒸发 `\D`/`\n` →
建议补丁脚本写文件执行而非内联 `-e`。

---

## 落地顺序与兼容性

| 批次 | 内容 | 破坏面 |
|---|---|---|
| 4.0.0-a | §1 台账 + §2 确定性公式 + §4 再裁定 + §12 脚本收编 | history schema v2→v3（含迁移：旧 scope_note 保留为只读） |
| 4.0.0-b | §3 vendored 声明 + §5 module_srp flow-cost + §6 coverage v4 + §7 confirmed-only | 分数不可与 v3 直接对比 → history 条目加 `rubric: "v4"` 标记，报告首轮注明基线重置 |
| 4.1.0 | §8 AI App Surface + §9 高分段 Drift Watch + §10 monorepo | 新增维度按 Quick-mode 重归一化，无迁移成本 |
| 4.1.x | §11/§13 文档与兜底 | 无 |

---

## 附录 A：本提案的证据索引（2026-06-10 双包项目扫描场）

| 提案条目 | 当场证据 |
|---|---|
| §1/§4 台账+再裁定 | 历史"42 console-only catch"实测大半已带注释，真实待修 ~8 处 |
| §2 确定性 | root 终局 99（从宽）vs 98（严格）双口径并存,被迫写进 scope_note |
| §3 vendored | desktop 连续 4 轮靠 scope_note 解释 8859 tok fork 的 −2;animate-ui/prettier 豁免全靠项目自觉 |
| §5 Goodhart | 拆 20 个 >2000 文件后,1200–2000 带 27→47;LogoWordmark.tsx 2617 tok/30 行纯 SVG 数据被计 god-file |
| §6 覆盖率 | 重构使 55.3%→50.6%（分母+313 行）;vitest include 白名单漏计两批新测试;desktop 3.27% vs 22 守卫 |
| §7 perf-debt | addEventListener 147:21,多为一次性绑定,裸计数入乘数 |
| §8 AI 域 | SYSTEM_MESSAGE 字节契约、§53 fork 登记表、SSE 心跳/错误帧测试均为项目自创,v3 无感知 |
| §9 饱和 | root deficit=1 后两个风险公式输出 1/1,信息量为零;最后 1 分需拆 47 文件 |
| §11 工具 | madge 别名空真、knip 误报、graphviz 缺失手写 SVG、react-doctor 48 vs 96 |
| §13 环境 | `cd desktop` cwd 漂移连坐三条命令;CRLF 锚点失配两次;`\D` 在双层转义中蒸发 |
