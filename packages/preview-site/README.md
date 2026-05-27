# @eikon/preview

Interactive playground for the Eikon React template — pick the parameter combo you'd hand to `create-eikon-react`, see the file tree it would write to disk and a live preview of the running app, then copy the equivalent CLI command.

This package does **not** ship to end users. It's a UX layer over `template-react` and the strip engine.

## Where it sits in the monorepo

```
template-react/   ← source of truth (React app + @eikon:variant markers)
      │
      │ reads LIVE (fs + chokidar watcher)
      ▼
preview-site/     ← this package
      │
      ▼
 Playground UI:
   • Left  pane: file tree + read-only code (what create-eikon-react would write)
   • Right pane: <iframe> running a max-capability bundle of the template
```

See the [root README](../../README.md#architecture) for the full picture, including how `create-eikon-react` consumes the same `template-react/` directory via a build-time snapshot.

## Two rendering paths

The playground splits its work into two channels with very different cost profiles:

1. **File-tree / code view (left)** — pure strip, no Vite. Each request hits `server/simulate-strip.ts` which walks `template-react/` and applies the strip engine to a single file (or returns the post-strip file list). This is what `create-eikon-react` will actually write to the user's disk for that combo, byte-for-byte (validated by `__tests__/strip-drift.test.ts`).

2. **Live iframe preview (right)** — one Vite build per `templateRev`, NOT per parameter combo. The bundle is built with `keepAllVariants: true` so every variant of the visual axes (`design`, `ui`, `layout`, `toastPosition`) coexists; switching is a runtime postMessage, not a rebuild. Cold-start time is amortised across every combo a user tries during a session.

The iframe path is a deliberate departure from "what the end user gets" in exchange for instant switching — see the trade-offs documented in `server/builder.ts`. The file-tree path remains byte-accurate.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start Vite dev server + middleware (build/strip/template-rev endpoints). |
| `pnpm build` | Vite build for the SPA shell. |
| `pnpm build:server` | tsup bundle for the production Node server. |
| `pnpm build:all` | Both of the above. |
| `pnpm build:check` | `tsc -b --noEmit && vite build` — used in CI / pre-commit. |
| `pnpm prebuild-variants` | Pre-build the max-capability bundle for the current `templateRev`. |
| `pnpm start` | Run the production server (expects `pnpm build:all` to have run). |
| `pnpm test` | Vitest — strip-drift parity, hash-schema, simulator. |
| `pnpm lint` | ESLint flat config (`--max-warnings 0`). |
| `pnpm typecheck` | TypeScript build mode, no emit. |

## Local development

From the workspace root:

```bash
pnpm install
pnpm --filter @eikon/react dev      # (optional) run the template standalone in another window
pnpm --filter @eikon/preview dev    # playground at http://localhost:3100
```

Edits to `packages/template-react/src/**` invalidate the playground's templateRev automatically; the iframe rebuilds and remounts. Edits to `packages/preview-site/**` use Vite HMR.
