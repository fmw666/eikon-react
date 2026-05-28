# Phase 0 — CI Foundation

## Goal

Stand up the verification machinery the rest of the plan leans on. After
this phase, **every code change in Phases 1–5 is verifiable by CI and
gated by `prepublishOnly`**. Today neither exists.

## Dependencies

None — this is the first phase.

## Decisions referenced

- D1 (version bump strategy) — must be made before P0.3.
- D2 (pre-commit hook tool) — must be made before P0.4.

## Items

### P0.1 — Create `.github/workflows/ci.yml`

| | |
|--|--|
| **Where** | `.github/workflows/ci.yml` (new) |
| **What** | No CI exists. `template/.agent/rules/80-quality-system.md:13` claims one does. |
| **How** | Workflow with two jobs: (1) `verify` runs `pnpm install --frozen-lockfile && pnpm verify` on Ubuntu and Windows in matrix (Win matters because the CLI runs on user machines and `e2e.mjs` has Win-specific `rm` issues already). (2) `audit` runs `pnpm audit --audit-level=moderate` and `lockfile-lint`. Trigger on `push` to `main` and `pull_request`. Use `pnpm/action-setup@v4` and `actions/setup-node@v4` with Node 20.10. Cache pnpm store. |
| **Verify** | Open a no-op PR, confirm both jobs run green. |

### P0.2 — Add test gate to `prepublishOnly`

| | |
|--|--|
| **Where** | `packages/create-eikon-react/package.json:30` |
| **What** | `prepublishOnly: pnpm build` ships any code that compiles, even if tests fail. |
| **How** | Replace with `pnpm typecheck && pnpm lint && pnpm test && pnpm e2e:quick && pnpm build`. The `--quick` e2e covers default scaffold without the 9 full scenarios — the full e2e runs in CI on PR. |
| **Verify** | Deliberately break a unit test, run `pnpm --filter create-eikon-react publish --dry-run`, confirm it fails before any tarball is created. Restore the test. |

### P0.3 — Resolve version drift per D1

| | |
|--|--|
| **Where** | `package.json:3`, `packages/template-react/package.json:4`, `packages/preview-site/package.json` |
| **What** | Root `2.0.0`, template `2.0.0`, CLI `1.2.0`. No coherent meaning. |
| **How (recommended option b)** | Set root and `@eikon/preview` and `@eikon/template-react` to `"version": "0.0.0-private"`. Keep CLI at `1.2.0` as the only public version. Add a CI step that asserts the three private packages stay at the placeholder. |
| **Verify** | `git ls-files '*/package.json' \| xargs grep -H '"version"'` shows CLI as the only non-placeholder. |

### P0.4 — Add pre-push hook per D2

| | |
|--|--|
| **Where** | Root `package.json`, new `.simple-git-hooks.json` (or husky equivalent) |
| **What** | `.gitignore:50` excludes `.husky/_` but `.husky/` doesn't exist; no hook system at all. |
| **How (recommended simple-git-hooks)** | Add `simple-git-hooks` as devDep, configure `pre-push: pnpm verify`. Run `pnpm dlx simple-git-hooks` in `postinstall`. Document opt-out via `git push --no-verify` for emergencies (but warn this bypasses the only local gate). |
| **Verify** | `git push` to a throwaway branch, confirm `pnpm verify` runs. Make a typecheck error, confirm push is blocked. |

### P0.5 — Add `pnpm audit` and lockfile integrity check to `verify.mjs`

| | |
|--|--|
| **Where** | `scripts/verify.mjs:31-37`, new `scripts/check-lockfile.mjs` |
| **What** | `verify` covers correctness but not supply-chain. Today a malicious dep update merges silently. |
| **How** | Append two steps after `lint`: (1) `pnpm audit --audit-level=high --registry=https://registry.npmjs.org/` (registry pin matters because the user's default may be a mirror without an audit endpoint); (2) `node scripts/check-lockfile.mjs` — a custom guard that asserts every `packages:` entry in `pnpm-lock.yaml` carries an `integrity:` field and that no `tarball:` URL leaks in. (`lockfile-lint` only supports npm/yarn lockfiles — pnpm-lock.yaml uses pure integrity hashes with no embedded URLs, so URL-host validation is not meaningful here; the integrity-presence check is.) Both run before `build`/`e2e` so failures surface fast. |
| **Verify** | Run `pnpm verify` — both steps log output. The audit step caught 4 real high+ CVEs (happy-dom <20.8.9, glob <10.5.0); fixed by pnpm overrides + bumping direct deps. |

### P0.5b — Fix CVEs surfaced by P0.5 audit

| | |
|--|--|
| **Where** | Root `package.json` (pnpm overrides), `packages/{preview-site,template-react,create-eikon-react/template}/package.json` |
| **What** | First run of `pnpm audit` revealed 1 critical + 3 high vulnerabilities — all in test-only deps (`happy-dom` <20.8.9 and a transitive `glob` <10.5.0 via `@vitest/coverage-v8`). |
| **How** | Add root `pnpm.overrides`: `happy-dom: ^20.8.9`, `glob@>=10.2.0 <10.5.0: ^10.5.0`. Bump direct happy-dom from `^17.0.0` to `^20.8.9` in three packages. Re-run audit; expect zero. Re-run full test suite to confirm happy-dom v20's "JS evaluation off by default" change doesn't break our React testing-library suite (it doesn't — we don't `<script>`-eval in test fixtures). |
| **Verify** | `pnpm audit --audit-level=high --registry=https://registry.npmjs.org/` reports "No known vulnerabilities found". `pnpm test` passes 96 + 225 tests. |

### P0.6 — Document `files:` whitelist matches reality

| | |
|--|--|
| **Where** | `packages/create-eikon-react/package.json:10-16`, `packages/create-eikon-react/README.md`, `.claude/skills/release-decision/SKILL.md` |
| **What** | `files:` lists `dist`, `template`, `template-snapshots`, `README.md`, `LICENSE`. README and release-decision skill only mention four — `template-snapshots` is undocumented but ships in the tarball. |
| **How** | Update README's "What's in the package" section and release-decision skill's "What ships in the npm tarball" section to include `template-snapshots/` with a one-line explanation that it carries pre-baked shadcn / animate-ui sources for `--ui` swaps. |
| **Verify** | `grep -l template-snapshots packages/create-eikon-react/README.md .claude/skills/release-decision/SKILL.md` returns both. |

## Phase exit criteria

- [x] `.github/workflows/ci.yml` exists with `verify` matrix job (Ubuntu + Windows)
- [x] `pnpm --filter create-eikon-react publish --dry-run` fails when a test fails
- [x] `pnpm verify` includes `pnpm audit` + lockfile integrity steps
- [x] Pre-push hook registered via simple-git-hooks postinstall
- [x] Three private packages share `0.0.0-private`; CLI keeps `1.2.0`
- [x] README and release-decision skill mention `template-snapshots/`
- [x] Audit reports zero known vulnerabilities (P0.5b)
