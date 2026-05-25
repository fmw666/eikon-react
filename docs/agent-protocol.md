# `.agent/` Protocol Specification

This document specifies the `.agent/` directory shape that every project scaffolded from this template ships with. The protocol is **vendor-neutral**: any AI coding agent (Cursor, Claude Code, GitHub Copilot Workspace, Codex, custom LLM pipelines, generic shell scripts) can read it without needing a product-specific manifest.

## Goals

1. **Single source of truth.** Conventions live in one place, not duplicated into per-vendor folders.
2. **Discoverable.** A fresh agent reading `.agent/README.md` learns exactly how to navigate.
3. **Composable.** Rules constrain behavior; skills describe specific tasks. They are read together.
4. **Diffable & reviewable.** Every rule and skill is plain Markdown with YAML frontmatter; pull requests review them like any other code change.

## Top-level shape

```
<project root>/
└── .agent/
    ├── README.md            # how to use this directory (mandatory)
    ├── rules/               # hard constraints, read in numeric order
    │   ├── 00-architecture.md
    │   ├── 10-react-conventions.md
    │   ├── 20-tailwind-v4.md
    │   ├── 30-testing.md
    │   ├── 40-state-management.md
    │   ├── 50-animate-ui.md
    │   ├── 60-i18n.md
    │   ├── 70-commit-style.md
    │   ├── 80-quality-system.md
    │   └── 90-platform-targets.md
    └── skills/              # task playbooks, looked up by relevance
        ├── add-animate-ui-component/SKILL.md
        ├── add-data-feature/SKILL.md
        ├── add-feature/SKILL.md
        ├── add-i18n-keys/SKILL.md
        ├── add-locale/SKILL.md
        ├── add-modal/SKILL.md
        ├── add-page/SKILL.md
        ├── add-zustand-store/SKILL.md
        ├── customize-design/SKILL.md
        ├── customize-toast/SKILL.md
        ├── enable-supabase/SKILL.md
        └── write-component-test/SKILL.md
```

## How agents are expected to use it

1. Read `.agent/README.md` first.
2. Load every file under `.agent/rules/` in **filename order** (the numeric prefix is the read order — `00-` before `10-` before `20-` etc.).
3. For each user request, inspect the `description` and `keywords` of each file under `.agent/skills/` and load the SKILL.md whose match is best.
4. Treat rules as **non-negotiable** unless the user explicitly approves a deviation.
5. After producing changes, verify the relevant rules still hold and that tests live in the right place per `30-testing.md`.

## File format

Every `rules/*.md` and every `skills/<name>/SKILL.md` MUST begin with a YAML frontmatter block:

```yaml
---
id: <stable kebab-case id>
title: <short human-readable title>
description: <one or two sentence summary used by agents to gate relevance>
applies_to: ["src/**", "__tests__/**"]    # optional, glob list
keywords: [feature, scaffold]              # optional, helps semantic-search agents
severity: must | should | may              # rules only; default "must"
---
```

Required fields:

- `id` — unique, stable kebab-case identifier. Used for cross-references.
- `title` — human-readable display name.
- `description` — one to two sentences. Should be readable in isolation.

Optional fields:

- `applies_to` — array of glob patterns. If absent, the rule applies repo-wide.
- `keywords` — array of free-form tags to help search.
- `severity` — for rules only; one of `must` (default), `should`, `may`.

After the frontmatter, the body is regular Markdown.

## Rule conventions

- **Numeric prefix.** Filenames use a two-digit prefix (`00-`, `10-`, …) to guarantee a stable read order even on platforms that don't sort directory listings predictably. Leave gaps (10, 20, 30) so new rules can be inserted without renumbering.
- **Hard constraints only.** A rule says what MUST or MUST NOT happen. Things that are "nice to have" go in a skill.
- **Cite source files.** Rules link to the configuration that enforces them (e.g. `eslint.config.js`, `tsconfig.app.json`). When a rule is also a lint rule, agents and humans get the same answer.
- **No examples-only rules.** Every rule has a normative section; examples are illustration, not the contract.

## Skill conventions

A skill is a **task playbook**: a self-contained recipe for one recognizable operation. Each skill lives in its own directory:

```
.agent/skills/<id>/
└── SKILL.md
```

The directory shape allows future expansion (template files, fixtures, sub-docs) without changing the URL contract.

A SKILL.md MUST contain, in order:

1. The YAML frontmatter (with at least `id`, `title`, `description`, ideally `keywords`).
2. A short **Background** section: when to use this skill, when not to.
3. A numbered **Step list**: explicit, ordered actions an agent should take.
4. A **Completion checklist**: machine-verifiable bullet points the agent must confirm before declaring the task done.
5. Optionally: **Don't** / common mistakes.

When a skill expects code to be inserted, the SKILL.md should embed the template fenced as a normal Markdown code block — not as a separate file — so the contract is fully self-describing.

## Cross-references

- Rules MAY reference each other by relative path (`./40-state-management.md`).
- Skills MAY reference rules and other skills (`../../rules/30-testing.md`, `../write-component-test/SKILL.md`).
- Documentation outside `.agent/` (the repo's `docs/` folder, READMEs) MAY link into `.agent/` but should not duplicate its content. `.agent/` is the canonical source.

## Evolving the protocol

This protocol is intentionally minimal. Three rules govern its evolution:

1. **Backward compatibility.** Adding a new field is allowed; removing or repurposing an existing one is a breaking change.
2. **Vendor neutrality.** Anything that names a specific agent product belongs in that product's docs, not in `.agent/`.
3. **Reviewability.** Every rule and skill is plain Markdown reviewable in a normal pull request. Generated assets (JSON manifests, embeddings) MAY supplement but never replace the source files.

## Why not just `AGENTS.md`?

The single-file `AGENTS.md` convention is great for very small projects, but at the scale of a starter that ships ~8 rules and ~7 skills, a single file becomes hard to navigate, hard to diff, and hard to selectively load (an agent loading the full document spends tokens on rules irrelevant to the current task). The `.agent/` directory keeps each rule and skill loadable in isolation while still being easy for a human to browse.

If your project is small enough that an `AGENTS.md` works, that's fine — you can collapse the `.agent/` directory into a single file once it stops growing. The conventions documented here will still apply.
