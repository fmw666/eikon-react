---
id: testing
title: Testing strategy with Vitest + Testing Library
description: Where tests live, what they must cover, and how to write them. Replaces the legacy Jest setup.
applies_to: ["src/**/__tests__/**", "__tests__/**"]
severity: must
---

# Testing

## Tooling

- Runner: **Vitest** (`pnpm test`, `pnpm test:watch`, `pnpm test:coverage`).
- DOM: **happy-dom**.
- Helpers: **@testing-library/react**, **@testing-library/user-event**, **@testing-library/jest-dom** (extended matchers).
- Global setup lives in [__tests__/setup.ts](../../__tests__/setup.ts) and registers `jest-dom` matchers + autoclean.

## Where tests go

- Per-feature tests live inside `src/features/<name>/__tests__/`, **mirroring** the source layout:

  ```
  src/features/counter/
  ├── stores/counterStore.ts
  ├── components/CounterDisplay.tsx
  └── __tests__/
      ├── stores/counterStore.test.ts
      └── components/CounterDisplay.test.tsx
  ```

- Shared utility tests live in `src/shared/<area>/__tests__/`.
- True cross-cutting tests (e.g. router smoke tests, app shell wiring) live in the top-level `__tests__/`.
- File suffix is `.test.ts` or `.test.tsx`. Do not use `.spec.*` (Vitest config does accept both, but the convention is `.test`).

## What to test

Every new feature ships with at least:

1. **Pure logic tests**: stores, reducers, helpers, services in isolation.
2. **Component tests**: render the user-facing entrypoint of the feature with realistic props; assert on observable DOM behavior, not internal state.
3. **Hook tests** (when the hook contains non-trivial logic): use `renderHook` from `@testing-library/react`.

Snapshot tests are discouraged — they encode coupling without intent. Use targeted assertions (`getByRole`, `getByText`) instead.

## How to write a test

- Prefer Testing Library queries that mirror how users interact: `getByRole`, `getByLabelText`, `getByText`. Fall back to `getByTestId` only when accessibility queries are infeasible.
- Use `userEvent` (not `fireEvent`) for any interaction more complex than a single click — it models real user keyboard/mouse sequences.
- Mock at the module boundary closest to the I/O. For a feature with a `services/` layer, mock the service via `vi.mock('@/features/foo/services/...')`, not the global `fetch`.
- Async assertions go through `findBy*` queries or `await waitFor(...)`. Never sleep with `setTimeout`.

## What NOT to test

- Implementation details (CSS class strings, internal state shape, lifecycle ordering). Test the **contract**.
- Third-party libraries (Radix, Motion, React Router). Trust their tests.
- Visual styling. Visual regressions belong in Storybook/Chromatic if introduced later.

## Coverage

Coverage is collected by `pnpm test:coverage` via v8. Aim for ≥80% on feature code; the threshold is not enforced in CI by default — add `--coverage --reporter=text-summary` to commands when needed.
