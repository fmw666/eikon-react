# Phase 6 — Verification & Smoke

## Goal

Close-out gate. Before declaring "no debt remaining", run an end-to-end
verification covering every surface that an external user touches:
scaffolded apps, the playground iframe, the npm tarball contents, and
the Fly deploy. Then re-run `/repo-audit` to confirm a clean punch list.

## Dependencies

- Phases 0–5 all complete and committed.

## Verification matrix

### V1 — Automated chain

Run from a clean checkout (no `.preview-cache/`, no `node_modules`):

```bash
git clean -fdx -e .env*
pnpm install --frozen-lockfile
pnpm verify
```

Must pass on:
- macOS (or Linux dev box)
- Windows (the platform most CLI users run on)

CI matrix from P0.1 covers both. Run locally on whichever platform the
maintainer is on as a sanity check.

### V2 — Tarball shape

```bash
pnpm --filter create-eikon-react pack
tar -tf packages/create-eikon-react/create-eikon-react-*.tgz | sort > /tmp/tarball-contents.txt
```

Manually inspect `/tmp/tarball-contents.txt`. Must contain:
- `package/dist/index.js` (CLI binary)
- `package/dist/*.map` (sourcemaps from P5.10)
- `package/template/**` (scaffold tree)
- `package/template-snapshots/{shadcn,animate-ui}/**` (UI library snapshots)
- `package/README.md`, `package/LICENSE`

Must NOT contain:
- `package/__tests__/`
- `package/scripts/`
- `package/src/` (source TypeScript)
- `package/tsup.config.ts`, `package/tsconfig.json`
- Any `.preview-cache/`, `.snapshots/`, `node_modules/`

If any unexpected file appears, audit `files:` in `package.json` and
the `.npmignore` (if present).

### V3 — Manual scaffold smoke (all three `--ui` values)

```bash
TARBALL=$(realpath packages/create-eikon-react/create-eikon-react-*.tgz)

for ui in custom shadcn animate-ui; do
  rm -rf /tmp/smoke-$ui
  pnpm dlx $TARBALL /tmp/smoke-$ui --ui $ui --no-supabase --pm pnpm --yes
  cd /tmp/smoke-$ui
  pnpm install
  pnpm typecheck
  pnpm lint
  pnpm test
  pnpm build
  cd -
done
```

For each scaffold, manually inspect:

- `src/shared/ui/button.tsx`:
  - `--ui custom`: matches `template/src/shared/ui/button.tsx` checksum
  - `--ui shadcn`: matches `template-snapshots/shadcn/src/shared/ui/button.tsx` checksum
  - `--ui animate-ui`: matches `template-snapshots/animate-ui/src/shared/ui/button.tsx` checksum
- `components.json`: present for shadcn/animate-ui, absent for custom
- `eslint.config.ui-snapshot.js`: present for shadcn/animate-ui, absent for custom
- No `__PROJECT_NAME__` literal anywhere in the tree
- No `@eikon:variant(...)` or `@eikon:feature(...)` markers anywhere

### V4 — Manual playground smoke

```bash
pnpm --filter @eikon/preview dev
```

Open `http://localhost:3100/`, exercise:

- Cycle `--ui` between `custom` / `shadcn` / `animate-ui`. Each click triggers a "building" indicator; the iframe re-renders with visibly different button hover behavior:
  - `custom`: subtle hover shadow (Radix-based)
  - `shadcn`: default shadcn hover (no motion)
  - `animate-ui`: scale-on-hover from `whileHover={{ scale: 1.05 }}`
- Cycle through 14 design presets — each re-themes without rebuilding (runtime CSS class swap)
- Cycle through 4 layouts and 4 toast positions — runtime swaps, no rebuild
- Click "Reset" in params panel — all axes return to defaults including platform (P4.28)
- Open a file in the file panel — content matches `simulateStripFileContent` for the chosen variants
- Edit a file in `template-react/` (in another terminal) — within 30s the playground HMRs (P4.11)

### V5 — Fly deploy smoke

```bash
fly deploy
fly status -a eikon-react-preview
curl -sI https://eikon-react-preview.fly.dev/
curl -s https://eikon-react-preview.fly.dev/healthz
```

Expectations:
- Deploy completes within 5 minutes
- Both machines `started` after deploy
- `/` returns 200 with HTML
- `/healthz` returns 200
- `fly logs -a eikon-react-preview` shows structured JSON (P4.25)
- First request for each `ui` value returns <500ms (pre-warmed per P4.1)

### V6 — Re-run `/repo-audit`

```bash
# In a new Claude Code session
/repo-audit
```

Expected output: a punch list with **zero P0 items** and **≤5 P1 items**.

If any P0 surfaces, that item escaped Phase 0–5 — fix and rerun. If P1
items remain, document them as "accepted debt" in a new file
`.claude/plans/accepted-debt.md` with explicit reasoning per item. Do
not silently keep them.

## Exit criteria

- [ ] V1 — `pnpm verify` green on Win + macOS/Linux
- [ ] V2 — tarball contents exactly match expected shape
- [ ] V3 — all 3 `--ui` scaffolds pass install + typecheck + lint + test + build
- [ ] V4 — playground exercises all axes without errors
- [ ] V5 — Fly deploy reachable, healthcheck passing, structured logs visible
- [ ] V6 — `/repo-audit` returns zero P0 items
- [ ] (If accepted debt remains) `accepted-debt.md` documents each remaining P1 with explicit rationale

## Post-cleanup

Immediately after V6 passes:

1. **Cut a release.** Use the `release-decision` skill. The cumulative
   changes across Phases 0–5 are user-visible (default scaffold
   correctness, new `--ui` axis docs, snapshot determinism) so this is
   at minimum a minor bump from current `1.2.0` → `1.3.0`.
2. **Update CHANGELOG.** This plan's phase IDs (P0.1, P3.5, etc.) make
   excellent changelog entries. The release-decision skill will fold
   them into a release commit body.
3. **Archive this plan.** Move `.claude/plans/tech-debt-cleanup.md` and
   the `tech-debt/` directory into `.claude/plans/archive/2026-05/`
   for historical reference. Keep the `.claude/skills/repo-audit/`
   skill in place — it's the recurring tool that produced this plan
   and will produce future ones.
