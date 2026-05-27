# create-eikon-react

Scaffold an AI-Coding-Agent-friendly React app in seconds.

```bash
npx create-eikon-react my-app
# or
pnpm create eikon-react my-app
```

## What you get

- **React 19** + **TypeScript** + **Vite 6**
- **Tailwind CSS v4** (CSS-first `@theme`)
- **UI primitives** under `src/shared/ui/` — choose `--ui custom` (project-authored Radix + `motion`), `--ui shadcn` ([shadcn](https://ui.shadcn.com/) registry), or `--ui animate-ui` ([animate-ui](https://animate-ui.com/) registry, default)
- **Feature-first** architecture with ESLint-enforced boundaries
- **`.agent/` protocol**: portable rules + skills any AI coding agent can read
- **Vitest** + **Testing Library** wired with `__tests__/` colocation
- **TanStack Query** for server-state, wired by default
- Optional **Supabase** (auth + db + storage)

## CLI flags

The CLI is interactive by default. You can pass a positional project name to skip the first prompt:

```bash
npx create-eikon-react my-awesome-app
```

Non-interactive flags worth knowing about:

| flag                           | values                              | default      | what it changes                                                                 |
| ------------------------------ | ----------------------------------- | ------------ | ------------------------------------------------------------------------------- |
| `--platform`                   | `web`, `desktop`, `mobile`          | `web`        | Adds `apps/desktop` (Tauri) or `apps/mobile` (Capacitor) shells                 |
| `--supabase` / `--no-supabase` | —                                   | on           | Includes/excludes the Supabase client + auth wiring                             |
| `--ui`                         | `custom`, `shadcn`, `animate-ui`    | `animate-ui` | **Picks which library lives in `src/shared/ui/`** (real swap, not just styling) |
| `--design`                     | `default`, `linear`, `apple`, …     | `default`    | Picks one of 14 design presets (CSS variables + dark variants)                  |
| `--layout`                     | `stacked`, `sidebar`, …             | `stacked`    | Picks the root layout shell                                                     |
| `--toast-position`             | `top-right`, `bottom-center`, …     | `top-right`  | Where `<Toaster />` mounts                                                      |
| `--pm`                         | `pnpm`, `npm`, `bun`                | `pnpm`       | Pins `engines` / `packageManager` and rewrites aggregate scripts                |

`--ui custom` keeps the project-authored Radix wrappers under `src/shared/ui/`. `--ui shadcn` and `--ui animate-ui` lay down components copied 1:1 from the upstream registry (with a `components.json` at the project root so `npx shadcn add <next>` keeps working post-scaffold).

## What's in the npm package

The published tarball (`pnpm pack`) contains:

- `dist/` — compiled CLI binary (built fresh by `prepublishOnly`)
- `template/` — the scaffold tree (synced from `packages/template-react/` at build time)
- `template-snapshots/{shadcn,animate-ui}/` — pre-baked UI library sources for `--ui shadcn` and `--ui animate-ui`. Empty for `--ui custom` (project-authored components stay in `template/src/shared/ui/`).
- `README.md`, `LICENSE`

## Local development

This package ships its own template payload (`./template/`). Re-sync the source template before testing locally:

```bash
pnpm --filter create-eikon-react build
node packages/create-eikon-react/dist/index.js my-test-app
```

## End-to-end testing

The repository ships a self-contained e2e runner at [scripts/e2e.mjs](./scripts/e2e.mjs) that simulates the real `npx` install path: it builds the CLI, runs `npm pack`, installs the resulting tarball into a sandbox, invokes the binary the same way `npx` would, then verifies the generated project.

```bash
pnpm e2e:quick                  # ~20s — verifies scaffolding & feature stripping
pnpm e2e                        # ~2-5 min — also runs install/test/build inside each scenario
pnpm e2e -- --only lean,full    # restrict to named scenarios
pnpm e2e -- --keep              # keep the temp directory after the run
```

Scenarios:

| id                   | flags                                                                  | covers                                                              |
| -------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------- |
| default              | `--no-supabase`                                                        | Web scaffold with TanStack Query baseline, no Supabase              |
| full                 | `--supabase`                                                           | Adds Supabase on top of the baseline                                |
| variants             | `--no-supabase --design linear --layout sidebar --ui custom --toast-position bottom-center` | Exercises every variant axis, custom UI primitives stay in place    |
| variants-shadcn      | `--no-supabase --ui shadcn`                                            | Lays down the shadcn snapshot + asserts `components.json` and shadcn deps |
| variants-animate-ui  | `--no-supabase --ui animate-ui`                                        | Lays down the animate-ui snapshot + asserts `src/components/animate-ui/` and motion deps |
| pm-npm               | `--no-supabase --pm npm`                                               | `engines` / `packageManager` / aggregate scripts switched to npm    |
| pm-bun               | `--no-supabase --pm bun`                                               | Same shape as pm-npm but for bun                                    |

> **Note:** `variants-shadcn` and `variants-animate-ui` only run the scaffold + verify steps — install/test/build are gated until a maintainer has populated the snapshots via `pnpm sync-ui-snapshots`. See [template-snapshots/README.md](./template-snapshots/README.md) for the populate procedure.

## License

MIT
