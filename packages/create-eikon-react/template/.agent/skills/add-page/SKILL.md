---
id: add-page
title: Add a route-level page
description: Add a new route inside an existing feature, including the page component, route declaration, navigation entry, and tests.
keywords: [page, route, navigation, new page]
applies_to: ["src/features/**/pages/**", "src/features/**/routes.tsx"]
---

# Skill: add a route-level page

Use when the user asks to "add a page" or "create a new route" that belongs to an existing feature. If the page constitutes a new capability (its own state, its own data model), use [add-feature](../add-feature/SKILL.md) instead.

## Step list

1. **Identify the host feature.** A page lives inside the feature it conceptually belongs to. Avoid creating "misc" or "shared" feature dumping grounds.

2. **Create `src/features/<feature>/pages/<PageName>.tsx`:**

   ```tsx
   import { useTranslation } from 'react-i18next';

   export function <PageName>() {
     const { t } = useTranslation();
     return (
       <section className="space-y-4">
         <h1 className="text-2xl font-semibold tracking-tight">
           {t('<feature>.<pageKey>.title')}
         </h1>
         {/* page body */}
       </section>
     );
   }
   ```

3. **Register the route in `src/features/<feature>/routes.tsx`:**

   ```tsx
   import { Route } from 'react-router-dom';
   import { <ExistingPage> } from './pages/<ExistingPage>';
   import { <PageName> } from './pages/<PageName>';

   export const <feature>Routes = (
     <>
       <Route path="/<existing>" element={<ExistingPage />} />
       <Route path="/<new-path>" element={<PageName />} />
     </>
   );
   ```

   If `routes.tsx` previously exported a single `<Route>`, wrap multiple routes in a `<>` fragment.

4. **Add a navigation entry** (if the page should be reachable from the header). Edit [src/app/layouts/RootLayout.tsx](../../../src/app/layouts/RootLayout.tsx)'s `navLinks` array.

5. **Add i18n keys.** For every locale in `src/shared/i18n/locales/`, add the `<feature>.<pageKey>.*` group.

6. **Add a smoke test** under `src/features/<feature>/__tests__/pages/<PageName>.test.tsx`:

   ```tsx
   import { render, screen } from '@testing-library/react';
   import { MemoryRouter } from 'react-router-dom';
   import { <PageName> } from '../../pages/<PageName>';

   describe('<<PageName> />', () => {
     it('renders the heading', () => {
       render(
         <MemoryRouter>
           <<PageName> />
         </MemoryRouter>
       );
       expect(
         screen.getByRole('heading', { level: 1 })
       ).toBeInTheDocument();
     });
   });
   ```

7. Run `pnpm lint`, `pnpm typecheck`, `pnpm test`.

## Completion checklist

- [ ] Page component is in `pages/`, exported as a named export.
- [ ] Route registered inside the feature's `routes.tsx`.
- [ ] Path is unique across the app router (no collision with existing routes).
- [ ] i18n keys exist in every locale.
- [ ] Smoke test asserts at least the heading or a stable element.

## Don't

- Don't put the route declaration directly in `src/app/router.tsx`. The feature owns its routes.
- Don't create a new feature just for one page — extend an existing one if it fits.
