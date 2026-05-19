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
- **animate-ui style** primitives (`motion` + Radix) under `src/shared/ui/`
- **Feature-first** architecture with ESLint-enforced boundaries
- **`.agent/` protocol**: portable rules + skills any AI coding agent can read
- **Vitest** + **Testing Library** wired with `__tests__/` colocation
- Optional **Supabase** (auth + db + storage) and **TanStack Query**

## CLI flags

The CLI is interactive by default. You can pass a positional project name to skip the first prompt:

```bash
npx create-eikon-react my-awesome-app
```

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

| id      | flags                          | covers                                         |
| ------- | ------------------------------ | ---------------------------------------------- |
| lean    | `--no-supabase --no-query`     | Bare-minimum scaffold; both optional features off |
| default | `--no-supabase --query`        | TanStack Query but no Supabase (recommended)   |
| full    | `--supabase --query`           | Every optional feature on                      |

## License

MIT
