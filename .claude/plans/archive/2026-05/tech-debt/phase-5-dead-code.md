# Phase 5 — Dead Code & Naming

## Goal

The user explicitly said "no debt, no dead code remaining". This phase
sweeps the long tail of LOW-severity items the audit surfaced — things
that are individually tiny but collectively rot the codebase if left
in "miscellaneous" forever. Decide-then-delete is the rule: every item
either gets a fix, or an explicit "we keep this and here's why"
disposition. No "we'll get to it later".

## Dependencies

- Phase 1 (rules already match reality, so removals here don't widen drift)
- Phase 2 (parity tests catch any accidental over-deletion)
- D3 (decision on `examples` markers from the master plan)

## Items

### P5.1 — Remove or activate `.husky/_` gitignore

| | |
|--|--|
| **Where** | `.gitignore:50` |
| **What** | Excludes `.husky/_` but no `.husky/` exists. Dead config. |
| **How** | If P0.4 picks husky, this entry stays (correct exclusion). If P0.4 picks simple-git-hooks (recommended), remove the line. |
| **Verify** | `git ls-files --others --ignored --exclude-standard` no longer mentions husky-related paths. |

### P5.2 — Resolve `examples` inert markers per D3

| | |
|--|--|
| **Where** | `packages/template-react/src/features/examples/index.ts:17`, `packages/template-react/src/app/router.tsx:23-25, 41-56` |
| **What** | `index.ts:17` documents markers are "inert" but `router.tsx` still wraps imports with them. |
| **How (recommended option D3-b)** | Delete every `@eikon:feature(examples) begin/end` marker in `app/router.tsx`. Remove the documentation note. The `examples/` feature stays in the scaffold unconditionally. |
| **Verify** | `grep -rn '@eikon:feature(examples)' packages/template-react/src` returns nothing. P2.4 marker-balance test still passes. |

### P5.3 — Remove `authService` from public facade

| | |
|--|--|
| **Where** | `packages/template-react/src/features/auth/index.ts:50` |
| **What** | Exports `authService`. Architecture rule (`00-architecture.md:96`) says only the facade is public; service singletons are internal. |
| **How** | If P1.6 chose to soften the rule (recommended), keep the export — the rule now permits it. Otherwise, remove the export and update any cross-feature consumer. Audit shows no cross-feature import of `authService`, so removal is safe. |
| **Verify** | `grep -rn "from '@/features/auth'" packages/template-react/src` shows only facade-method usage; if P1.6 softened, this is documentation-aligned. |

### P5.4 — `supabase/client.ts` placeholder URL fails fast

| | |
|--|--|
| **Where** | `packages/template-react/src/shared/supabase/client.ts:50` |
| **What** | Constructs a real `SupabaseClient` even with placeholder URL. `console.warn` is the only signal. Production misconfig surfaces only when a `.from()` call fires (deep into UX). |
| **How** | If `VITE_SUPABASE_URL` matches the placeholder pattern (`your-project-id.supabase.co` or empty), throw at module load with a clear "Supabase not configured" message. The error halts boot, which is correct — a half-configured app shouldn't pretend to work. |
| **Verify** | Set placeholder URL, run dev server, confirm boot fails with a clear message instead of silently breaking later. |

### P5.5 — `RootLayout.tsx` dispatch type tightening

| | |
|--|--|
| **Where** | `packages/template-react/src/app/layouts/RootLayout.tsx:78` |
| **What** | Types dispatch as `Partial<Record<LayoutVariant, () => React.ReactElement>>`, but the layouts are typed as components, not zero-arg functions. TS structural typing forgives this; if any layout takes props later, it accepts silently. |
| **How** | Type as `Partial<Record<LayoutVariant, React.ComponentType>>`. The `<Picked />` JSX call still works. |
| **Verify** | Add a layout component with a required prop, confirm TS now errors at the dispatch table site. |

### P5.6 — `Toaster.tsx` `INITIAL_POSITION` safe fallback

| | |
|--|--|
| **Where** | `packages/template-react/src/shared/ui/toaster.tsx:47-60` |
| **What** | `INITIAL_POSITION = [...].at(0)!` — after strip, only one entry survives. If a future strip pass leaves zero entries (bug), `.at(0)!` returns `undefined` non-null-asserted. |
| **How** | Replace `!` with an explicit fallback: `[...].at(0) ?? 'top-right'`. The fallback is one of the four valid positions so behavior is defined even on the broken-strip case. |
| **Verify** | Synthetic test: empty positions array, `INITIAL_POSITION === 'top-right'`. |

### P5.7 — Tighten `vite.config.ts` react chunk path matching

| | |
|--|--|
| **Where** | `packages/template-react/vite.config.ts:88-90` |
| **What** | Chunk `react` matches `node_modules/react/`. Trailing slash misses pnpm-flattened paths under some setups. |
| **How** | Match with a regex: `/node_modules\/(\.pnpm\/.+\/)?react\//`. Same for `react-dom`. |
| **Verify** | `pnpm install` then `pnpm build` produces a `react` chunk that includes both root-installed and `.pnpm/`-flattened paths. |

### P5.8 — Force-exclude `.preview-cache/` via gitignore guard

| | |
|--|--|
| **Where** | `.gitignore`, `.gitattributes` (new if needed) |
| **What** | `.preview-cache/` is ignored, but a `git add -f` accidentally commits stripped variants of source. |
| **How** | Add `.preview-cache/ export-ignore` to `.gitattributes` (prevents inclusion in `git archive`). Add a pre-commit refusal: simple-git-hooks pre-commit checks `git diff --cached --name-only` for `.preview-cache/` and aborts. |
| **Verify** | Try `git add -f packages/template-react/.preview-cache/foo`, commit, hook blocks. |

### P5.9 — Resolve `store/` vs `stores/` ambiguity in feature shape

| | |
|--|--|
| **Where** | `packages/template-react/.agent/rules/30-testing.md`, `00-architecture.md`, `__tests__/structure/feature-shape.test.ts` |
| **What** | Rules reference both `stores/` (plural) and `store/` (singular). Test logic is implicit and not described. |
| **How** | Pick one (recommend `stores/` plural — current `tasks/` and `auth/` features both use plural). Update the singular references. Clarify in `feature-shape.test.ts` what the test enforces with a docstring at the top. |
| **Verify** | `grep -rn "store/" packages/template-react/.agent` shows no singular-form references. |

### P5.10 — Drop `tsup` no-sourcemap setting

| | |
|--|--|
| **Where** | `packages/create-eikon-react/tsup.config.ts` |
| **What** | `dts: false, sourcemap: false`. User errors point at minified-ish bundle with no source map. |
| **How** | Set `sourcemap: true`. `dts: false` is fine for a CLI binary (no public exports). Add `dist/*.map` to `files:` in `package.json` so the maps ship in the npm tarball. |
| **Verify** | Force a runtime error in CLI, stack points at original `.ts` source. Tarball size grows by ~50KB (acceptable). |

### P5.11 — Decide on `variants` parameter optionality

| | |
|--|--|
| **Where** | `packages/create-eikon-react/src/strip-features.ts:147` |
| **What** | Comment says "optional for backward compatibility" but the only caller (`index.ts:441`) always passes it. Fallback `= {}` masks regressions where variants accidentally drop. |
| **How** | Make the parameter required (drop the `= {}` default). Update the call site to be explicit. The "backward compatibility" comment was for an internal API never used externally — drop it. |
| **Verify** | TS compile passes. Deliberately drop variants in caller, TS errors. |

### P5.12 — Document or fix scaffold ordering comment

| | |
|--|--|
| **Where** | `packages/create-eikon-react/src/index.ts:455` |
| **What** | Comment says "Phase J ... runs AFTER stripFeatures so feature-strip doesn't fight the snapshot, and BEFORE rewritePackageManagerFields". Omits that `injectHtmlVariants` runs between them. |
| **How** | Update the comment to enumerate the actual order: `stripFeatures → applyUiSnapshot → injectHtmlVariants → rewritePackageManager`. Note explicitly that `applyUiSnapshot` must precede `injectHtmlVariants` because the snapshot can replace `index.html` (verify this is true — if not, document why the order is just convention). |
| **Verify** | Comment matches code by inspection. A future maintainer reading the comment alone can reproduce the order. |

## Phase exit criteria

- [ ] No file in the repo carries an `@eikon:feature(examples)` marker (per D3-b)
- [ ] No `console.warn`-only paths for production misconfiguration in template runtime
- [ ] `tsup` ships sourcemaps; user errors are debuggable from a stack trace alone
- [ ] All "TODO eventually" / "for backward compatibility" comments in audit-surfaced files are either removed (with the dead code) or refreshed
- [ ] `grep -rni 'eikon' README.md packages/*/README.md` shows consistent capitalization in user-facing prose
- [ ] `git status` after `pnpm install` from a clean clone is clean (no orphan dot-dirs)
