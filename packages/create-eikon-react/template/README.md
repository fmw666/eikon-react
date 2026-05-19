# Eikon React Template

React 19 + Tailwind CSS v4 + animate-ui starter with a feature-first architecture and a portable `.agent/` collaboration protocol that AI coding agents can read directly.

This package is the canonical template consumed by `npx create-eikon-react`. It is also runnable standalone for template authoring and review.

## Tech stack

- **React 19** + **TypeScript 5.6+**
- **Vite 6** + **Tailwind CSS v4** (CSS-first config via `@theme`)
- **animate-ui style** components (`motion` + Radix primitives, copy-paste friendly)
- **Zustand** state, **TanStack Query** async data (optional, `@eikon:feature(query)`)
- **React Router v7**, **React Hook Form** + **zod**
- **i18next** (en/zh) — included by default
- **Supabase** client (optional, `@eikon:feature(supabase)`)
- **Vitest** + **Testing Library** with `__tests__/` colocated per feature
- **ESLint 9 flat config** + **Prettier** with `import/no-restricted-paths` guarding feature boundaries

## Project structure

```
src/
├── app/             # Application shell (providers, router, layout, global pages)
├── features/        # Feature-first modules; each owns components/hooks/stores/services
│   ├── home/
│   └── counter/
├── shared/          # Cross-feature ui, lib, hooks, i18n, supabase, etc.
└── styles/          # Tailwind v4 entry (@import + @theme tokens)
__tests__/           # Global test setup; per-feature tests live alongside the feature
.agent/              # Rules and skills that AI agents must follow when editing this project
```

## Conventions enforced by ESLint

- A feature may not import another feature's internals. Cross-feature use must go through `features/<name>/index.ts`.
- `shared/` may never depend on `features/`.
- `app/` only sees a feature through its public `index.ts` / `routes.tsx`.

## Scripts

| Command            | What it does                                |
| ------------------ | ------------------------------------------- |
| `pnpm dev`         | Start Vite dev server on `http://localhost:3000` |
| `pnpm build`       | Type-check and produce a production build   |
| `pnpm preview`     | Preview the production build locally        |
| `pnpm test`        | Run Vitest test suite                       |
| `pnpm test:watch`  | Watch mode                                  |
| `pnpm test:coverage` | Run tests with coverage report            |
| `pnpm lint`        | ESLint flat config check                    |
| `pnpm typecheck`   | TypeScript only (no build output)           |

## Working with AI agents

Read [`.agent/README.md`](./.agent/README.md) first — it documents the rule and skill catalogue that any AI agent should consult before making changes.
