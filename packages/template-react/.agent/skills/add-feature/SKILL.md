---
id: add-feature
title: Add a new feature module
description: End-to-end playbook for scaffolding a new feature under src/features/ with its store, components, route, public barrel, and tests.
keywords: [feature, scaffold, module, new]
applies_to: ["src/features/**"]
---

# Skill: add a new feature

Use this skill whenever the user asks for "a new feature", "a new page with its own state", "a new module", or any similarly scoped capability.

## Background

The codebase is feature-first (see [.agent/rules/00-architecture.md](../../rules/00-architecture.md)). Every feature owns its components, state, services, route, and tests. Cross-feature imports must go through `features/<name>/index.ts`.

## Step list

1. **Confirm the feature name.** Use kebab-case for the directory (`user-profile`), camelCase for symbols (`useUserProfileStore`). Avoid generic names like `common`, `utils`, `core`.

2. **Create the directory skeleton:**

   ```
   src/features/<name>/
   ├── components/
   ├── hooks/
   ├── stores/
   ├── services/
   ├── pages/
   ├── routes.tsx
   ├── types.ts
   ├── index.ts
   └── __tests__/
       ├── components/
       ├── hooks/
       └── stores/
   ```

   Omit subdirectories that aren't needed yet (no empty folders).

3. **Define the public API in `index.ts` first.** Decide what the feature is willing to be consumed under. A typical first version:

   ```ts
   export { <name>Routes } from './routes';
   ```

4. **Write `routes.tsx`** with one or more `<Route>` elements:

   ```tsx
   import { Route } from 'react-router-dom';
   import { MyPage } from './pages/MyPage';

   export const <name>Routes = (
     <>
       <Route path="/<path>" element={<MyPage />} />
     </>
   );
   ```

5. **Implement the page** under `pages/MyPage.tsx`. Wire i18n via `useTranslation()` (see `60-i18n.md`); never hard-code copy.

6. **If the feature has state**, add a Zustand store under `stores/<name>Store.ts` (see [add-zustand-store/SKILL.md](../add-zustand-store/SKILL.md)).

7. **Register the feature in the app router.** In [src/app/router.tsx](../../../src/app/router.tsx):

   ```tsx
   import { <name>Routes } from '@/features/<name>';
   // …
   {<name>Routes}
   ```

   If the feature has a navigation entry, also update the layout (e.g. [src/app/layouts/RootLayout.tsx](../../../src/app/layouts/RootLayout.tsx)).

8. **Add translation keys.** In every file under `src/shared/i18n/locales/`, add a `<name>: { … }` namespace with at least every key the new page uses.

9. **Write tests.** At minimum:
   - One test per non-trivial function in `stores/` or `services/`.
   - One render test per page asserting the user-facing contract.

10. **Verify boundaries.** Run `pnpm lint` and `pnpm typecheck`. ESLint's `import/no-restricted-paths` will catch accidental cross-feature imports.

## Completion checklist

- [ ] Directory created with only the subdirectories actually needed.
- [ ] `index.ts` exports exactly the symbols intended for external use.
- [ ] Route is registered in `src/app/router.tsx`.
- [ ] No file outside this feature imports from inside it except via `@/features/<name>`.
- [ ] i18n keys exist in every locale file.
- [ ] `pnpm lint`, `pnpm typecheck`, and `pnpm test` all pass.

## Common mistakes

- Importing another feature's component directly (`@/features/foo/components/Bar`). Use that feature's `index.ts` barrel.
- Putting cross-feature helpers in this feature's `hooks/` or `services/`. Promote them to `src/shared/`.
- Hard-coding visible strings instead of using `t('<name>.key')`.
