# Phase 2 — Parity Tests

## Goal

Lock truth sources behind tests so future regressions in Phases 3–5
fail fast. The audit found at least four places where two or three
files must agree but no test enforces it. Each such place is a future
silent breakage.

## Dependencies

- Phase 0 (CI runs the new tests).
- Phase 1 (rules now match reality so test assertions can pin "reality").

## Items

### P2.1 — UI primitives parity test

| | |
|--|--|
| **Where** | `packages/create-eikon-react/__tests__/ui-snapshot-parity.test.ts` (new) |
| **What** | The seven UI primitive names live in three files with no fence: `apply-ui-snapshot.ts:72` `REPLACEABLE_UI_FILES`, `scripts/sync-ui-snapshots.mjs:49` `COMPONENTS`, and `ANIMATE_UI_REGISTRY_MAP` keys at `sync-ui-snapshots.mjs:78`. Adding an 8th primitive in any one place silently misses the others. |
| **How** | Test imports all three lists (extract as named exports if not already), asserts they have the same set of keys. Also asserts every key has a matching file at `template-snapshots/shadcn/src/shared/ui/<key>.tsx` and `template-snapshots/animate-ui/src/shared/ui/<key>.tsx`. |
| **Verify** | Add a fake 8th name to one list locally, confirm test fails with a clear "lists drift" message; revert. |

### P2.2 — Fix `skip-list.ts` and add parity test

| | |
|--|--|
| **Where** | `packages/create-eikon-react/src/skip-list.ts:64`, `packages/create-eikon-react/scripts/sync-template.mjs:35`, `__tests__/skip-list-parity.test.ts:119` |
| **What** | Skip list says `.snapshots`. Actual directory is `template-snapshots/` (sibling of `template/`, no leading dot). The entry is dead config. Test pins the wrong name. |
| **How** | Replace `.snapshots` with the actual directory name in `skip-list.ts` and `sync-template.mjs`. Update the parity test to pin both the skip-list and the sync-script's exclusion list against a single source-of-truth constant. |
| **Verify** | `grep -rn '\.snapshots' packages/create-eikon-react/src packages/create-eikon-react/scripts` returns nothing. Parity test green. |

### P2.3 — Platform-axis parity test

| | |
|--|--|
| **Where** | `packages/create-eikon-react/__tests__/platform-parity.test.ts` (new) |
| **What** | Adding a platform axis means three independent edits: `index.ts:106` `PLATFORM_OVERRIDES`, `strip-features.ts:527` `PLATFORM_SCRIPTS`, `VARIANT_CHOICES.platform`. Only CLI ↔ schema is fenced today (via `cli-schema-parity.test.ts`). |
| **How** | Test asserts the keys of `PLATFORM_OVERRIDES`, `PLATFORM_SCRIPTS`, and `VARIANT_CHOICES.platform` are identical sets. |
| **Verify** | Add a fake platform value to one file, test fails. Revert. |

### P2.4 — Marker balance test

| | |
|--|--|
| **Where** | `packages/template-react/__tests__/structure/marker-balance.test.ts` (new) |
| **What** | Audit found 54 `begin` vs 55 `end` across `src/**/*.{ts,tsx,css}`. May be benign (prose containing the word "end") but no test catches an actual mismatch. |
| **How** | Walk all `.ts/.tsx/.css/.html` files under `template-react/src/` and `template-react/index.html`. Count `@eikon:variant(...) begin` and `@eikon:variant(...) end` markers, asserting balanced pairs **per variant key per file** (not just global count). For each file, assert every `begin` has a matching `end` for the same `(axis=value)` tuple, and vice versa. |
| **Verify** | Manually unbalance a marker in a test fixture, confirm error message names the file and the unmatched marker. |

### P2.5 — No-orphan-token test

| | |
|--|--|
| **Where** | `packages/create-eikon-react/__tests__/no-orphan-tokens.test.ts` (new) |
| **What** | `PROJECT_NAME_TARGETS` (`copy-template.ts:26`) is a hard-coded list of files that get `__PROJECT_NAME__` substitution. If a future template file gains a `__PROJECT_NAME__` reference and the maintainer forgets to add it to the list, the token leaks into the user's scaffolded project. |
| **How** | Test scans the entire `template/` tree post-scaffold (use the existing e2e fixture or create a minimal scaffold in a temp dir). Asserts no file under the scaffold contains the literal strings `__PROJECT_NAME__` or any other `__[A-Z_]+__` pattern. |
| **Verify** | Add a `__PROJECT_NAME__` to a template file not in the allow-list, run test, confirm failure. Revert. |

### P2.6 — Design-class-name validity test

| | |
|--|--|
| **Where** | `packages/create-eikon-react/__tests__/design-class-validity.test.ts` (new) |
| **What** | `index.ts:50-65` declares 14 design preset values. `inject-html-variants.ts` builds class names like `design-<value>`. No test asserts the values are valid CSS identifier suffixes (someone adds `'design with spaces'` and the class breaks silently). |
| **How** | For each value in `VARIANT_CHOICES.design`, assert it matches `/^[a-z][a-z0-9-]*$/` and that `template-react/src/styles/index.css` contains a `:root.design-<value>` rule. |
| **Verify** | Add `'invalid name'` to choices, test fails with both class-name and missing-CSS-rule errors. Revert. |

### P2.7 — Simulate-strip drift test

| | |
|--|--|
| **Where** | `packages/preview-site/__tests__/simulate-strip-drift.test.ts` (new) |
| **What** | `simulate-strip.ts` re-implements the CLI's `strip-features.ts` for the preview-site file-tree panel. The two implementations can drift silently. The audit notes this test was promised by `simulate-strip.ts:39-43` comment but isn't enforced. |
| **How** | For a fixed set of inputs (cover all variant axes), run both `simulateStripTree()` and an actual `stripFeatures()` against a temp copy of `template/`. Assert the output file lists are identical. Run for ~6 input combinations covering edge cases (each platform, each ui, each design—at least one combo per axis). |
| **Verify** | Modify a strip rule in one implementation only, test fails listing the divergent files. Revert. |

## Phase exit criteria

- [ ] Six new test files exist and pass under `pnpm verify`
- [ ] Each test, when seeded with a deliberate regression, produces a clear failure message naming the offending file
- [ ] CI on a no-op PR runs the new tests in <30s additional wall time
- [ ] `__tests__/skip-list-parity.test.ts` no longer pins the wrong directory name
