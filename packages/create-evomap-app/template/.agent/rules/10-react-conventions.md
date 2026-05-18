---
id: react-conventions
title: React 19 + TypeScript component conventions
description: Authoring rules for React 19 components, hooks, props, and refs in this codebase.
applies_to: ["src/**/*.{ts,tsx}"]
severity: must
---

# React 19 conventions

## Components

- **Function components only.** No class components, no `React.FC` typing alias — type props directly via an `interface` / `type`.
- File and exported component names use **PascalCase**; the filename matches the default-exported component when one exists, e.g. `CounterDisplay.tsx` exports `CounterDisplay`.
- Co-locate small subcomponents in the same file when they are tightly coupled and not reused elsewhere. Promote them to their own file once they exceed ~40 lines or get reused.
- Server-only or environment-specific code must guard with `typeof window` checks; the template is currently CSR-only but rules should remain SSR-safe.

## Hooks

- Custom hooks are named `useSomething` and live in `<feature>/hooks/` (or `shared/hooks/` if cross-cutting).
- Hooks must obey the rules of hooks (no conditional calls). Lint enforces this via `react-hooks/rules-of-hooks`.
- Effects: prefer event handlers and derived values over `useEffect`. Use `useEffect` only for synchronization with **external** systems (subscriptions, focus, document title, etc.).
- `useState` initializer functions must be cheap; expensive initialization belongs in a memoized initializer (`useState(() => createX())`).
- React 19 enables automatic memoization for many patterns. Do **not** wrap everything in `useCallback`/`useMemo` reflexively — only when profiling or a referential-equality contract demands it.

## Props

- Define `interface FooProps { ... }` adjacent to the component.
- Use `React.ReactNode` for children, `React.ComponentPropsWithoutRef<'tag'>` to extend native elements, `React.ComponentPropsWithoutRef<typeof Comp>` to wrap Radix-style primitives.
- Discriminated unions are preferred over boolean prop pairs when behavior changes:

  ```ts
  type Variant =
    | { kind: 'text'; text: string }
    | { kind: 'icon'; icon: ReactNode };
  ```

## Refs and forwarding

- Use `React.forwardRef` for primitives that wrap a native element and need a ref (`Button`, `Input`, etc.).
- React 19's `ref` as a regular prop is fine in new code; existing primitives in `src/shared/ui/` use `forwardRef` for compatibility.

## Imports

- Use the `@/` alias for any cross-directory import (`@/shared/ui/button`, `@/features/counter`). Reserve relative paths for siblings within the same directory or for `__tests__/` referencing the unit under test.
- Type-only imports use the inline syntax: `import { type CounterState } from '@/features/counter'`. Lint (`@typescript-eslint/consistent-type-imports`) enforces this.
- Import order: built-ins → external → `@/...` internal → relative parent → sibling → index → type, with blank lines between groups (Prettier doesn't enforce this; ESLint's `import/order` does).

## Error handling and loading states

- Routes that fetch data should render an explicit loading state and error state; never rely on undefined intermediate values.
- Throwing from a component is acceptable when an upstream `ErrorBoundary` exists; otherwise return an error UI.

## Anti-patterns to avoid

- `default export` is acceptable for `main.tsx`-style entries but **prefer named exports** for components and hooks. Named exports improve grep-ability and IDE refactor safety.
- Do not put network requests directly in components. Put them in `services/` and call from hooks (`useFooQuery`) or events.
- Do not store derivable values in state; derive them during render or with `useMemo` when expensive.
