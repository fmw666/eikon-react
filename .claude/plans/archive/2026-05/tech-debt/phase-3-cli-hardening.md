# Phase 3 — CLI Hardening

## Goal

Harden the scaffold pipeline so that user-visible failures, silent
miscompiles, and Win/POSIX divergences stop happening. Also dedup six
near-identical path predicates and tighten error UX. After this phase,
every public failure mode of `create-eikon-react` either produces a
clear diagnostic or has a test that catches it before publish.

## Dependencies

- Phase 0 (CI), Phase 2 (parity tests).

## Items

### P3.1 — `apply-ui-snapshot` cleanup on `--ui custom`

| | |
|--|--|
| **Where** | `packages/create-eikon-react/src/apply-ui-snapshot.ts:312` |
| **What** | When `ui === 'custom'`, the function early-returns. If `applyUiSnapshot` is re-run over a tree that previously had `--ui shadcn` (e.g. preview-site cache reuse), orphan `components.json` and `eslint.config.ui-snapshot.js` survive at the project root. |
| **How** | Before the early-return, unconditionally remove: `components.json`, `eslint.config.ui-snapshot.js`, plus any `src/components/animate-ui/` and `src/hooks/use-*` files that the snapshot would have placed. Use `unlink` ignoring ENOENT. |
| **Verify** | Add a unit test: scaffold with `shadcn`, then re-apply with `custom`, assert the orphans are gone. |

### P3.2 — Assert sync-ui-snapshots patches actually apply

| | |
|--|--|
| **Where** | `packages/create-eikon-react/scripts/sync-ui-snapshots.mjs:378` (`ensureCardTitleIsHeading`), and the other two `ensure*` patchers |
| **What** | Each patcher does multi-step regex surgery on registry-fetched files. If upstream renames or changes JSX shape, the regex misses, the patch silently skips, and a broken snapshot ships. |
| **How** | Each patcher returns `{changed: boolean}`. The driver function asserts `changed === true` for every patcher; if any returns `false`, abort with a descriptive error naming the patcher and the file it failed on. |
| **Verify** | Manually break the regex in one patcher, run `pnpm sync-ui-snapshots`, confirm it errors out instead of producing a broken snapshot. |

### P3.3 — Pin shadcn / animate-ui registry version

| | |
|--|--|
| **Where** | `packages/create-eikon-react/scripts/sync-ui-snapshots.mjs:131-145` |
| **What** | Registry list inlines `shadcn@latest`. Re-running sync in a year produces different snapshots even with no schema change because `@latest` floats. |
| **How** | Replace `@latest` with a pinned version. Add a header comment noting how to bump (and that bumping should run smoke tests for the new components). For animate-ui, pin to a specific commit/version of its registry. |
| **Verify** | Re-run sync twice, diff outputs — should be byte-identical. |

### P3.4 — Expand `apply-ui-snapshot` survivor check

| | |
|--|--|
| **Where** | `packages/create-eikon-react/src/apply-ui-snapshot.ts:158-172` |
| **What** | Survivor logic only checks `src/shared/ui/` basenames, but copies snapshot's `src/components/animate-ui/**`, `src/hooks/**`, `src/lib/**` unconditionally. Future strip pass that deletes a feature whose code lives in `src/hooks/` will see the snapshot resurrect helper files into orphan dirs. |
| **How** | Before copying, walk the snapshot's full file tree. For each file, compute its destination path in `cacheDir`. If the strip pass deleted the destination's parent directory (i.e., the user's scaffold doesn't have that feature), skip the copy. Document the rule: "snapshots only resurrect files that have a logical home in the user's scaffold." |
| **Verify** | Unit test: pre-delete `cacheDir/src/hooks/`, run snapshot apply, assert no `src/hooks/` files appear. |

### P3.5 — Derive `eslint.config.ui-snapshot.js` globs from the snapshot tree

| | |
|--|--|
| **Where** | `packages/create-eikon-react/src/apply-ui-snapshot.ts:472` (`buildUiSnapshotEslintConfig`) |
| **What** | Extra globs are hard-coded for `animate-ui` only. If shadcn ever ships hooks/lib alongside primitives, lint fails on the snapshot files. |
| **How** | Walk the snapshot's `src/` tree, compute the unique set of directories, and emit globs covering all of them. Drop the hard-coded animate-ui list. |
| **Verify** | Pre-add a fake `template-snapshots/shadcn/src/hooks/use-fake.ts`, run scaffold + lint, confirm it's covered without manual config changes. |

### P3.6 — Strict `parseArgs` (reject unknown flags)

| | |
|--|--|
| **Where** | `packages/create-eikon-react/src/index.ts:513` |
| **What** | `parseArgs` ignores unknown flags. `create-eikon-react my-app --platfrom=mobile` (typo) silently runs as `web` with no error. |
| **How** | After parsing, walk `process.argv` and assert every `--<flag>` is in a known whitelist. If any unknown, print `Unknown flag: --<flag>. Did you mean: <suggestion>?` (use Levenshtein on the whitelist) and exit non-zero. |
| **Verify** | `npx create-eikon-react test --platfrom=mobile` errors with a "did you mean --platform" suggestion. |

### P3.7 — `tryParseVariant` warns on invalid in `--yes` mode

| | |
|--|--|
| **Where** | `packages/create-eikon-react/src/index.ts:564-572` |
| **What** | Silently drops invalid values rather than warning. The header comment says this is intentional ("fall through to interactive prompt"), but in `--yes` mode there's no prompt — the user gets the default with no diagnostic. |
| **How** | When `--yes` is set, an invalid value should log a `log.warn` mentioning the value, the flag, and the chosen default. Match the style of `resolveVariants`'s explicit warn branch a few lines later. |
| **Verify** | `npx create-eikon-react test --yes --ui=invalid` emits a warning naming the bad value. |

### P3.8 — `initGit` surfaces commit errors

| | |
|--|--|
| **Where** | `packages/create-eikon-react/src/init-git.ts:21-29` |
| **What** | Catches and unconditionally swallows commit failure. Result: half-initialised repo with staged but uncommitted files, no warning. |
| **How** | Catch, then call `log.warn` with the actual error. Don't throw — git init failure should not abort scaffold — but the user must see the failure. |
| **Verify** | Force a git error (e.g., set `GIT_COMMITTER_NAME=` empty), scaffold, confirm a warning appears in the CLI output. |

### P3.9 — `installDeps` streams stderr on failure

| | |
|--|--|
| **Where** | `packages/create-eikon-react/src/install-deps.ts:8` |
| **What** | `stdio: 'ignore'` means a slow/failing pnpm install gives the user zero feedback. The error message after rejection is "exited with code N" — no stderr. |
| **How** | Use `stdio: 'pipe'`, buffer stderr, and on non-zero exit print the last 50 lines of stderr to the user. On success, drop it. Keep the spinner from `@clack/prompts` running. |
| **Verify** | Force a network error (e.g., bad registry URL via env), scaffold, confirm the user sees the actual pnpm error not just "exit 1". |

### P3.10 — `isBinary` reads magic bytes

| | |
|--|--|
| **Where** | `packages/create-eikon-react/src/strip-features.ts:339, 463` (`isBinary`) |
| **What** | Looks at extension and `>5MB size` only. A `.svg` (XML, not in the extension list) larger than 5MB gets treated as binary; a `.bin` extension is processed as text. Fonts beyond `.woff/.woff2/.ttf` (`.otf`, `.eot`) leak through. |
| **How** | Extend the extension allowlist: add `.otf`, `.eot`, `.ico`, `.webp`, `.avif`. Read the first 512 bytes when extension is unknown; if the byte distribution suggests binary (null bytes, >30% non-printable), treat as binary. Cache by stat result so re-reads are cheap. |
| **Verify** | Unit test: synthetic `.bin` file with text content is processed as text; `.otf` font is skipped. |

### P3.11 — Replace `PROJECT_NAME_TARGETS` allow-list with a scan

| | |
|--|--|
| **Where** | `packages/create-eikon-react/src/copy-template.ts:26` |
| **What** | Hard-coded list of files that get `__PROJECT_NAME__` substitution. New template files needing substitution silently miss it. |
| **How (option A)** | Walk the template tree post-copy, find any text file containing the literal `__PROJECT_NAME__`, run substitution. Drop the allow-list entirely. **Option B (less invasive)**: keep the allow-list but add the test from P2.5 to fence it. |
| **Recommendation** | Option A — the scan is O(template-size) and runs once per scaffold, which is negligible. The allow-list is a footgun with no upside. |
| **Verify** | Add `__PROJECT_NAME__` to a new template file, scaffold, confirm substitution happens without editing any allow-list. |

### P3.12 — Collapse 6 path predicates into 1 helper

| | |
|--|--|
| **Where** | `packages/create-eikon-react/src/strip-features.ts:306-331, 676-687` |
| **What** | Six near-duplicate predicates: `isInsideSupabaseDir/Tree`, `isInsideDesktopShellDir/Tree`, `isInsideMobileShellDir/Tree`. Three pairs of "absolute path with `\\`→`/` normalize" and "relative POSIX path". |
| **How** | Single helper `isInsideAny(absOrRel: string, segments: string[]): boolean` that normalizes once and checks if any segment is a path component. Six call sites collapse to three (one per axis). |
| **Verify** | Existing strip-features tests pass. Behavior unchanged. |

### P3.13 — Tighten `apply-ui-snapshot` parameter type

| | |
|--|--|
| **Where** | `packages/create-eikon-react/src/apply-ui-snapshot.ts:302`, callers in `index.ts:455` |
| **What** | Parameter is `ui: string` instead of `UiVariant`. Runtime guard catches typos but compile-time would catch them earlier. |
| **How** | Change signature to `ui: UiVariant`. Caller passes `opts.variants.ui ?? DEFAULT_VARIANTS.ui` (also fixes P3.14 default duplication). |
| **Verify** | Typecheck passes. A deliberate typo in caller now fails compile. |

### P3.14 — Fix `ui` default duplication

| | |
|--|--|
| **Where** | `packages/create-eikon-react/src/index.ts:455` |
| **What** | Defaults `opts.variants.ui` to literal `'animate-ui'` rather than `DEFAULT_VARIANTS.ui` from `strip-features.ts:19`. Same value today, but a future default change in one place won't propagate. |
| **How** | Import `DEFAULT_VARIANTS` and use `DEFAULT_VARIANTS.ui` in the fallback. |
| **Verify** | Change `DEFAULT_VARIANTS.ui` to a different valid value, confirm scaffold uses the new default without other edits. Revert. |

### P3.15 — Document `\1` backref invariant in `stripBlocksForVariant`

| | |
|--|--|
| **Where** | `packages/create-eikon-react/src/strip-features.ts:434-444` |
| **What** | Uses `\1` referring to the captured value across the begin→end span. Correct but undocumented. A future maintainer adding another capture group will break it without warning. |
| **How** | Add a comment block above the regex: "Capture group 1 is the variant value (e.g., 'mobile-drawer'). The `\1` back-reference in the closing marker pattern matches the same value, ensuring nested markers don't cross-pair. Adding capture groups before this point will shift `\1` and silently corrupt the strip." |
| **Verify** | Comment exists. (No test — defensive doc.) |

### P3.16 — Shared sandbox in `e2e.mjs`

| | |
|--|--|
| **Where** | `packages/create-eikon-react/scripts/e2e.mjs:539` |
| **What** | Each of 9 scenarios rebuilds + repacks + reinstalls the tarball into a fresh sandbox. ~30-60s wasted per CI run. |
| **How** | Build + pack the tarball once at the top of `e2e.mjs`. Install into one shared "primer" directory. For each scenario, copy the primer's `node_modules/.bin/create-eikon-react` path and run scaffold against a fresh project dir, but reuse the installed CLI binary. |
| **Verify** | `time pnpm e2e` cuts wall time roughly in half. CI run time visibly drops. |

### P3.17 — `e2e.mjs` bun scenario fails loud

| | |
|--|--|
| **Where** | `packages/create-eikon-react/scripts/e2e.mjs:604` |
| **What** | `pm-bun` scenario silently skips if bun isn't on PATH. On Win CI this means the bun rewrite is never validated end-to-end. |
| **How** | If `process.env.CI === 'true'`, fail loud when bun is missing (CI must install bun). Locally, log a clear "skipping bun scenario — install bun to validate" warning. |
| **Verify** | CI matrix adds `bun` install step. Trial PR confirms scenario actually runs. |

### P3.18 — Parallelize snapshot `copyDirRecursive`

| | |
|--|--|
| **Where** | `packages/create-eikon-react/src/apply-ui-snapshot.ts:131` |
| **What** | Walks serially. `walkAndStrip` already uses `runWithConcurrency` for the same kind of work. Animate-ui's deep `src/components/animate-ui/` subtree is the slowest scaffold step. |
| **How** | Reuse `runWithConcurrency` from strip-features (extract to shared helper if not already). Parallelism 8 matches the existing default. |
| **Verify** | Time scaffold with `--ui animate-ui` before/after; expect ~2-3× speedup on the snapshot copy step. |

## Phase exit criteria

- [ ] All 18 items above committed with stable IDs in commit messages
- [ ] `pnpm verify` and `pnpm e2e` green
- [ ] Manual scaffold of `--ui shadcn` then re-scaffold with `--ui custom` over the same dir leaves no orphans
- [ ] Typo in CLI flag now produces a clear "did you mean" error
- [ ] `pnpm sync-ui-snapshots` is byte-deterministic across two consecutive runs
