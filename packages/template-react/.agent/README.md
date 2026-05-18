# `.agent/` — Portable AI Coding Agent Protocol

This directory is the **single source of truth** for how any AI coding agent (Cursor, Claude Code, Codex, GitHub Copilot Workspace, generic LLM-driven scripts, etc.) should reason about and modify this codebase.

If you are an AI agent, **read this file first**, then load every file under `rules/` in numeric order, and consult the relevant `skills/` entry whenever you are about to start a recognizable task.

Humans editing this project should also follow these rules — they encode the team's conventions, not just AI scaffolding.

---

## Directory layout

```
.agent/
├── README.md                    <- this file
├── rules/                       <- hard constraints, read top-to-bottom in numeric order
│   ├── 00-architecture.md
│   ├── 10-react-conventions.md
│   ├── 20-tailwind-v4.md
│   ├── 30-testing.md
│   ├── 40-state-management.md
│   ├── 50-animate-ui.md
│   ├── 60-i18n.md
│   └── 70-commit-style.md
└── skills/                      <- task playbooks, invoke when the task matches
    ├── add-feature/SKILL.md
    ├── add-page/SKILL.md
    ├── add-animate-ui-component/SKILL.md
    ├── add-zustand-store/SKILL.md
    ├── add-i18n-keys/SKILL.md
    ├── write-component-test/SKILL.md
    └── enable-supabase/SKILL.md
```

## How an agent should use this directory

1. Read `.agent/README.md` (this file).
2. Read every file in `.agent/rules/` in filename order. Treat them as **non-negotiable constraints**.
3. Inspect the user's request. For each match against a skill's `description` / `keywords`, load the corresponding `skills/<name>/SKILL.md` and follow its step list.
4. When implementing, **never** silently break a rule. If a rule must be violated, surface the conflict to the user and ask for confirmation.
5. After completing a task, ensure the change still satisfies every rule (especially `00-architecture.md`'s feature-boundary import constraints) and that the relevant tests live under `__tests__/`.

## Rule file frontmatter schema

Every file under `rules/` and `skills/<name>/SKILL.md` MUST start with a YAML frontmatter block:

```yaml
---
id: <stable kebab-case id>
title: <short human-readable title>
description: <1–2 sentence summary an agent uses to decide relevance>
applies_to: ["src/**"]            # optional glob list this guidance applies to
keywords: [feature, scaffold]     # optional, helps semantic-search-driven agents
severity: must | should | may     # rules only; default is "must"
---
```

Fields not listed here may be added by callers but should be ignored by parsers.

## Conventions referenced repeatedly

- The repository uses **feature-first** architecture under `src/features/<name>/`. Cross-feature imports may only target a feature's barrel `index.ts`.
- The CSS strategy is **Tailwind v4 CSS-first**: theme tokens live in `src/styles/index.css` under `@theme`; do not introduce a `tailwind.config.js`.
- Tests live in `__tests__/` directories **inside** each feature (mirroring its source tree). Cross-cutting setup lives in the root `__tests__/setup.ts`.
- Visible strings go through i18next (`useTranslation`); do not hard-code copy in components.
- Optional modules are wrapped with comment markers of the form `// @evomap:feature(<name>) begin … // @evomap:feature(<name>) end`. The CLI uses these markers to strip code when a user opts a feature out; **do not remove these markers** unless intentionally removing the feature itself.

## Updating this protocol

When the team changes a convention, update both:

1. The relevant rule in `rules/` (or add a new numeric file)
2. Any skill in `skills/` that referenced the old convention

Treat `.agent/` as production code: review rule changes in PRs the same way you review source changes.
