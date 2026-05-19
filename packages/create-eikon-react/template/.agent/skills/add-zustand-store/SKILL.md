---
id: add-zustand-store
title: Add a Zustand store to a feature
description: Create a Zustand store inside a feature, expose it via the feature barrel, and write its unit tests.
keywords: [zustand, store, state, client state]
applies_to: ["src/features/**/stores/**", "src/shared/stores/**"]
---

# Skill: add a Zustand store

Use when the user asks for client-side state that needs to survive component unmount, be shared across siblings, or persist across routes. Re-read [rules/40-state-management.md](../../rules/40-state-management.md) to confirm Zustand is the right tool — usually it is not, and `useState` will do.

## Step list

1. **Decide ownership.** Feature-scoped state → `src/features/<feature>/stores/<name>Store.ts`. Cross-feature state → `src/shared/stores/<name>Store.ts` (rare; justify it in the PR description).

2. **Define the state shape and actions** in one file:

   ```ts
   import { create } from 'zustand';

   export interface <Name>State {
     value: number;
     // …
     increment: () => void;
     reset: () => void;
   }

   export const use<Name>Store = create<<Name>State>((set, _get) => ({
     value: 0,
     increment: () => set((s) => ({ value: s.value + 1 })),
     reset: () => set({ value: 0 }),
   }));
   ```

3. **Export from the feature barrel.** In `src/features/<feature>/index.ts`:

   ```ts
   export { use<Name>Store } from './stores/<name>Store';
   export type { <Name>State } from './stores/<name>Store';
   ```

   Only export what consumers actually need. Internal helpers stay private.

4. **Consume with narrow selectors.** In components:

   ```ts
   const value = use<Name>Store((s) => s.value);
   const increment = use<Name>Store((s) => s.increment);
   ```

   Do not select the whole state object — that defeats Zustand's bailout-on-equal-reference rerender behavior.

5. **Persistence (only if needed).** Wrap with the `persist` middleware:

   ```ts
   import { persist } from 'zustand/middleware';

   export const use<Name>Store = create<<Name>State>()(
     persist(
       (set) => ({ /* … */ }),
       { name: '<feature>:<name>', version: 1 }
     )
   );
   ```

   Document the migration story whenever you change the persisted shape.

6. **Write tests** under `src/features/<feature>/__tests__/stores/<name>Store.test.ts`:

   ```ts
   import { beforeEach, describe, expect, it } from 'vitest';
   import { use<Name>Store } from '../../stores/<name>Store';

   describe('<name>Store', () => {
     beforeEach(() => {
       use<Name>Store.getState().reset();
     });

     it('starts at zero', () => {
       expect(use<Name>Store.getState().value).toBe(0);
     });
     // …
   });
   ```

7. Run `pnpm test`, `pnpm lint`, `pnpm typecheck`.

## Completion checklist

- [ ] Store file under `<feature>/stores/`.
- [ ] State + actions defined in a single `interface`.
- [ ] Exported through the feature's `index.ts` if external code needs it.
- [ ] Consumers select narrow slices.
- [ ] Tests reset state in `beforeEach` and cover every action.
- [ ] If persisted: `version` is set and migration is documented.

## Don't

- Don't combine multiple unrelated domains into one store.
- Don't store server data in Zustand — use TanStack Query.
- Don't store form state in Zustand — use React Hook Form locally.
- Don't put derived values in the store. Derive in the selector.
