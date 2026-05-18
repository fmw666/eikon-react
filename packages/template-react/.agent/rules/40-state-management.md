---
id: state-management
title: State management decision tree
description: When to reach for useState, useReducer, Zustand, or TanStack Query. Avoid layering them without a reason.
applies_to: ["src/**/*.{ts,tsx}"]
severity: must
---

# State management

Always pick the **least powerful** primitive that solves the problem.

## Decision tree

```
Does the state belong to a single component and not need to survive remounts?
  └── YES → useState / useReducer (local state)
  └── NO  ↓

Is it server / remote data with fetching, caching, retries, mutations?
  └── YES → TanStack Query (@evomap:feature(query))
  └── NO  ↓

Is it client-side, cross-feature, or cross-route?
  └── YES → Zustand store (in feature/<name>/stores/ or shared/stores/)
  └── NO  → Reconsider: maybe it's derivable. Do not store it.
```

## Local state (`useState` / `useReducer`)

- Default choice. Don't promote to a store just because a component grew.
- Use `useReducer` when state transitions form a small state machine (3+ related actions).

## Zustand (client state)

- One store per **logical domain** (counter, theme, auth-session). Do not create a giant root store.
- Stores live in `features/<name>/stores/<storeName>.ts` when feature-owned, or `src/shared/stores/` when truly cross-feature (rare).
- Select narrow slices to minimize rerenders:

  ```ts
  const value = useCounterStore((s) => s.value);
  ```

- Avoid putting derived values in the store. Derive in the selector or component.
- Persistence (localStorage, etc.) goes through Zustand middleware (`persist`); document the migration story before adding versioned persistence.

## TanStack Query (server state)

- Use for any data loaded from a backend (Supabase, REST, GraphQL).
- Query keys are arrays, prefixed with the feature name: `['counter', 'history', userId]`.
- Co-locate query/mutation hooks in `features/<name>/services/` or `features/<name>/hooks/`. They wrap a thin async function that hits the API.
- Don't shoehorn UI flags into TanStack Query cache. Use local state or a Zustand store.

## Context API

- Use sparingly. React context is appropriate for **stable values** that genuinely concern many descendants (theme, current user, feature flags).
- A context whose value changes often will cause widespread rerenders; use Zustand instead.

## Don't

- Don't combine Redux/MobX/Jotai with the above stack. Pick one of the three primitives this template ships with.
- Don't sync server data into a Zustand store. That bypasses TanStack Query's invalidation and breaks staleness guarantees.
- Don't store form state in Zustand. Use React Hook Form locally.
