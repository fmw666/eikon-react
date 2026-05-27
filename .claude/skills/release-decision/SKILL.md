---
name: release-decision
description: Inspect commits since the last published release and decide whether to cut a new version of create-eikon-react (and at what semver bump), then draft the release commit + tag + npm publish steps. Use when the user asks to "check what's been released since X", "should I bump the version", "make a release", "发新版本", "提交一个新版本", or similar. Targets this monorepo's three-package layout (create-eikon-react public, @eikon/preview + @eikon/react private).
---

# Release decision skill

This monorepo publishes ONE package to npm: `create-eikon-react`. The other
two packages (`@eikon/preview`, `@eikon/react`) are `"private": true` and
never get a npm release — they're deployed (preview-site → Fly) or consumed
internally (template-react → synced into the CLI's tarball at build time).

So "should I release?" almost always means "should I bump
`create-eikon-react`?" — never the other two.

## What ships in the npm tarball

`packages/create-eikon-react/package.json` has:
```json
"files": ["dist", "template", "README.md", "LICENSE"]
```

- `dist/` — built fresh from `src/` by `prepublishOnly: pnpm build`
- `template/` — the user-facing scaffold output, **synced from
  `packages/template-react/` by `scripts/sync-template.mjs`** during build
  (the in-repo `packages/create-eikon-react/template/` is the committed
  snapshot — both update together in normal commits)
- `README.md`, `LICENSE`

**Therefore commits in these paths affect what users get from
`npx create-eikon-react`:**

- `packages/create-eikon-react/src/**`
- `packages/create-eikon-react/template/**`
- `packages/create-eikon-react/README.md`
- `packages/template-react/**` (synced into `template/` at publish time)

Commits **outside** those paths do NOT affect the tarball — they don't
warrant a release on their own:

- `packages/preview-site/**` — deployed to Fly, not npm
- `packages/create-eikon-react/scripts/**` — not in `files`
- `packages/create-eikon-react/__tests__/**` — not in `files`
- repo root, Dockerfile, `.github/`, `.claude/` — not in `files`

## Steps

### 1. Find the last published release

```bash
git tag --list 'create-eikon-react@*' | sort -V | tail -3
```

Use the latest tag (e.g. `create-eikon-react@1.0.1`) as `<LAST>`.

### 2. List all commits since `<LAST>` and classify each

```bash
git log --pretty=format:"%h%x09%s" <LAST>..HEAD
```

For each commit, find which packages it touches:

```bash
for sha in <commit-shas>; do
  echo "=== $sha ==="
  git show --stat --format="%h %s" $sha | head -3
  git show --stat --format="" $sha | awk '{print $1}' | grep -E '^packages/' \
    | awk -F/ '{print $1"/"$2}' | sort -u
done
```

A commit subject like `fix(preview-site): …` may still touch
`packages/template-react/` because preview-site work often coordinates
template changes. Always look at the actual paths, not just the scope tag.

### 3. Bucket commits by tarball impact

For each commit, ask: **"if I publish HEAD, will a user running
`npx create-eikon-react` see a different scaffold than from `<LAST>`?"**

- **In tarball, user-visible**: changes to `template/`, `template-react/src/`,
  `src/` (CLI behavior), `README.md`. These drive the version bump.
- **In tarball, user-invisible**: comment cleanups, internal refactors with
  no behavior change, DEV-only code paths gated by
  `import.meta.env.DEV` or `iframe` checks (the preview-site coordination
  shims usually fall here). Mention in changelog if notable, but don't
  drive the bump.
- **Out of tarball**: preview-site, scripts, tests, repo chore — list once
  in the analysis as "not in npm release", do not include in changelog.

### 4. Decide bump per semver

Walk the in-tarball, user-visible bucket:

- Any `feat:` that changes default scaffold output or adds a CLI capability
  → **minor** (`1.x.0`).
- A removed CLI flag or a default-behavior reversal that breaks scripted
  callers → arguably **major**, but for a 1.x project changing scaffold
  defaults, **minor with a clear changelog note** is the established
  convention here (see `1.0.0` → 2.1.0 → reset → 1.0.0 history; the team
  prefers stable major).
- Only `fix:` / `refactor:` / template-text edits → **patch** (`1.0.x`).
- Nothing user-visible in tarball → **don't release**, even if there are
  many commits. preview-site / repo chore commits ride the next release
  whenever it's earned.

### 5. Draft the release commit

Match the established style (see `git show 3a17764 5d99eec`):

```
chore(create-eikon-react): release v<NEW>

<one-paragraph summary of what users will see differently — written for
the npm consumer, not the contributor. Reference past version when useful.>

<optional bullet list of specific user-visible changes if more than one
is worth calling out>

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

The release commit itself should ONLY change
`packages/create-eikon-react/package.json`'s `version` field — no other
edits. Stage only that file.

### 6. Confirm with the user before publishing

Publishing is a public, hard-to-reverse action. Show the user:

1. The chosen version + reasoning ("minor because <commit> changes default
   scaffold").
2. The drafted release commit message.
3. The list of commits that will appear under this release for the
   changelog audience.

Wait for explicit "go" before:

- Committing the version bump
- Tagging (`git tag create-eikon-react@<NEW>`)
- Pushing (`git push origin main && git push origin create-eikon-react@<NEW>`)
- Publishing (`pnpm --filter create-eikon-react publish` — `prepublishOnly`
  runs build which runs `sync-template.mjs` then `tsup`)

If the user wants to amend the changelog, drop a flag, or hold the publish,
do NOT proceed past their requested step.

### 7. Post-publish smoke

`packages/create-eikon-react/scripts/smoke.mjs` exists for post-publish
verification against the live npm registry. Suggest running
`pnpm --filter create-eikon-react smoke` after the publish settles
(npm propagation can take ~30s).

## What this skill does NOT do

- Does NOT decide on releases for `@eikon/preview` or `@eikon/react` —
  they're private. Their commits ride main; preview-site auto-deploys to
  Fly on push.
- Does NOT auto-publish. The publish itself is a manual step the user
  approves after seeing the analysis.
- Does NOT regenerate CHANGELOG.md — there isn't one in this repo; the
  release commit body IS the changelog. If a CHANGELOG.md is added later,
  update this skill to write to it.

## Why this lives as a skill, not memory

Memory captures preferences and project facts that decay slowly. This
workflow has concrete steps, file paths, and command invocations that
need to be repeated identically every release — that's a skill's job.
The semver rules of thumb here are the project-specific calls (defaults-
change-as-minor, DEV-gated-as-non-bump, etc.), not the generic semver
spec, which is why this skill matters even though semver is well-known.
