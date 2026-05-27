# Repo audit skill

Full-repo health check across the three packages of this monorepo. Spawns
**three parallel general-purpose subagents** — one per lane — then
synthesises their punch lists into a single prioritized backlog
(P0/P1/P2/P3) the user can act on.

## Why a skill

The audit needs to:
- Cover three packages with very different concerns (CLI, server, template)
- Stay parallel (serial would burn ~15 minutes of wall time)
- Use **general-purpose** subagents — `Explore` is forbidden because its
  description explicitly excludes code review and cross-file consistency
  checks (it reads excerpts, not whole files; review needs whole files)
- Produce file:line-cited findings, not vague impressions
- Filter out stylistic preference and existing TODO/FIXME noise

If you re-derive prompts from scratch each time, prompt drift produces
inconsistent quality across runs. This skill pins the prompts.

## Lane scope

The three lanes map 1:1 to the three packages plus a cross-cutting fold-in:

| Lane | Package(s) | Owner of |
|------|-----------|----------|
| A — CLI | `packages/create-eikon-react/` | scaffold flow, snapshots, e2e/smoke scripts, npm tarball shape |
| B — Preview-site | `packages/preview-site/` + repo-root `Dockerfile`, `fly.toml` | iframe shell, postMessage protocol, build cache, simulate-strip, Fly deploy |
| C — Template + cross-cutting | `packages/template-react/` + repo root | feature architecture, AI agent rules, variant markers, CI, release tooling, docs drift |

Lane C deliberately bundles the template and root-repo concerns because
the template's `.agent/rules/*` and the root CI/release path are tightly
coupled — splitting them produces overlap.

## Steps

### 1. Brief the user

Before spawning anything, confirm the user wants a full audit (not a
narrow targeted review). Mention wall time (~5–8 min), that the output
is a prioritized punch list, and that **no code is written**.

### 2. Spawn three subagents in a single message

Use **Agent** with `subagent_type: "general-purpose"`, **all three in one
tool-call block** (parallel). Do NOT spawn serially. Do NOT use Explore.

Use the prompt templates in `lane-prompts/` — they are concrete, demand
file:line citations, cap items at ~30 per lane, and require a severity
tag (high/med/low) on every item. Each prompt also explicitly excludes
stylistic-preference items and existing TODO/FIXME noise.

The prompts reference key files by absolute path, but the subagent
should be free to follow imports / read related files — don't restrict.

Each agent must:
- Cite WHERE (file:line if available)
- State WHAT in one line
- Tag SEVERITY (high/med/low)
- Stay under the lane's word cap (Lane C is 1000 words; A and B are 800)
- Skip stylistic items
- Skip items already in TODO/FIXME comments unless load-bearing

### 3. Synthesise

When all three return, fold their findings into one prioritized list.
Drop duplicates (the lanes overlap on Phase J ui-snapshot territory in
particular — same finding from two angles is one item, citing both
locations).

Bucket every item into:

- **P0 — Trust/correctness break.** Things that cause silent miscompiles,
  ship wrong code to npm users, or contradict published rules. AI rule
  drift goes here because rules are the template's headline value prop —
  agents reading them produce wrong code if the rule is wrong.
- **P1 — Architecture weakness.** Single sources of truth that aren't
  fenced by a parity test, missing abstractions, dead config entries,
  hot paths that will fail under modest load, etc.
- **P2 — Robustness & DX.** Error handling, timeouts, concurrency caps,
  log quality, install-feedback, slow inner loops.
- **P3 — Doc/naming drift.** README claims that don't match reality,
  inconsistent project name capitalisation, etc.

Within each bucket, prefer the **fewest, most-load-bearing** items
first. A 30-line list with five concrete fixes beats a 100-line list
the user won't read.

### 4. Output format

```markdown
## P0 — <one-line bucket purpose>

| # | Where | What |
|---|-------|------|
| 1 | path:line | one-line problem statement |
...

## P1 — ...
...
```

End with a **suggested execution order** — a 3–5 line "what would I do
this week vs next week" recommendation. The user typically wants to
know which 3 things to do first, not the full graph.

### 5. Never auto-fix from the audit

The audit's product is a punch list, **not a stream of edits**. If the
user wants to act, that's a separate request and may warrant
EnterPlanMode. Auto-fixing 30 issues invisibly is the opposite of what
they asked for.

## What this skill does NOT do

- Does NOT use the `Explore` agent. Explore is for locating code, not
  reviewing it. Its tool description forbids design-doc auditing and
  cross-file consistency checks for a reason.
- Does NOT run any code, tests, or builds. It's a static read-only
  review.
- Does NOT write to files. Output is conversational; if the user wants
  the audit persisted, ask before writing a markdown file.
- Does NOT pick a release version, commit, push, or publish. That's
  `release-decision`'s territory.
- Does NOT replace targeted code review of a specific PR. Use it when
  the user asks "audit the project" / "find tech debt" / "where can the
  architecture improve" — not for a single-file question.

## Invariants for future maintainers

If you change this skill, preserve:
- **Parallel subagents.** Sequential review takes ~3× longer with no
  quality gain.
- **general-purpose, not Explore.** This is the load-bearing constraint
  — Explore returns excerpts and will miss content past its read window.
- **File:line citations required.** Without them the punch list is not
  actionable.
- **~30 items per lane cap.** Caps force the agent to prioritize. Lifting
  the cap produces a 200-line dump nobody reads.
- **P0/P1/P2/P3 buckets, not a flat severity field.** Buckets force
  trade-off thinking; severity tags alone don't.

## Files

- `lane-prompts/lane-a-cli.md` — Lane A prompt template
- `lane-prompts/lane-b-preview.md` — Lane B prompt template
- `lane-prompts/lane-c-template.md` — Lane C prompt template
