---
id: animate-ui
title: animate-ui style component library
description: How to use, extend, and add motion-aware UI primitives. Defines when to reach for motion vs. plain CSS transitions.
applies_to: ["src/shared/ui/**", "src/features/**/components/**"]
severity: must
---

# animate-ui primitives

This template adopts the **animate-ui** philosophy: shadcn-style primitives that you own and copy-paste into `src/shared/ui/`, but with motion built in via the [`motion`](https://motion.dev) library (the successor to framer-motion).

## Where primitives live

- All ui primitives live in `src/shared/ui/`. Each primitive is one file named in lowercase (`button.tsx`, `dialog.tsx`, `tabs.tsx`, `card.tsx`, `toaster.tsx`).
- Primitives are **never** feature-specific. Anything visual that exists only inside one feature lives in `features/<feature>/components/`.

## Adding a new primitive

1. Decide if a Radix primitive is needed for accessibility (dropdowns, dialogs, popovers, tabs, tooltips → yes). Install the relevant `@radix-ui/react-*` package.
2. Create `src/shared/ui/<name>.tsx` and write:
   - A `cva` variants definition for visual variants.
   - A `forwardRef`-wrapped component that composes Radix + `motion`.
   - Type-only re-exports for sub-parts (e.g. `DialogContent`, `DialogTitle`).
3. Use theme tokens (`var(--color-primary)`, `var(--radius-md)`) — never raw hex.
4. Add at least one test under `src/shared/ui/__tests__/<name>.test.tsx` covering accessibility (`getByRole`) and one variant.

See [src/shared/ui/button.tsx](../../src/shared/ui/button.tsx) as the canonical example.

## Modal primitives (`dialog`, `sheet`, `command`)

The template ships three overlay primitives, all built on Radix + `motion/react`, and **never** swappable via a `--ui` axis. Pick by *intent*, not aesthetics — see [skills/add-modal/SKILL.md](../skills/add-modal/SKILL.md) for the full decision tree.

- **`src/shared/ui/dialog.tsx`** — centred overlay built on `@radix-ui/react-dialog` with a `motion.div` content wrapper inside `<AnimatePresence>`. Use for confirmations, forms, sized panels, nested confirms, or a fullscreen surface (override `DialogContent`'s `className` with the `left-0 top-0 h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 rounded-none p-0` recipe). The `<DialogTitle>` + `<DialogDescription>` pair is required for a11y — if a use case truly has no description, pass an empty `description=""` instead of skipping it.
- **`src/shared/ui/sheet.tsx`** — edge-anchored drawer with `side="top" | "right" | "bottom" | "left"`. Header + footer stay pinned; `<SheetBody>` owns its own vertical scroll. Top/bottom panels grow to fit content up to `max-h-[80vh]`. **Note:** the file ships behind the `@eikon:variant(layout=mobile-drawer) file` marker — it is only kept for the `mobile-drawer` layout out of the box. To use a Sheet under a different layout, copy the file (and drop the marker) into your scaffolded project.
- **`src/shared/ui/command.tsx`** — searchable command palette wrapping [`cmdk`](https://cmdk.paco.me). Exports `Command`, `CommandDialog`, `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`, `CommandItem`, `CommandSeparator`, `CommandShortcut`. The file is gated by `@eikon:feature(examples) file` and `cmdk` is listed under `PACKAGE_DEPS_BY_FEATURE.examples` in `packages/create-eikon-react/src/strip-features.ts`, so both the file and the dependency are pruned together when `--features` excludes `examples`. Bind ⌘K / Ctrl+K with a `keydown` listener that calls `preventDefault()` before toggling `open`.

For a globally-openable Modal driven by a store (auth, role switcher, app-wide composer), mirror the `features/auth` feature: a vanilla zustand store + selectors + a controlled `XModal` + an `XModalMount` mounted next to `<Toaster />` in [src/app/providers.tsx](../../src/app/providers.tsx). The Modal primitive stays presentational; the Mount wrapper owns toasts + i18n preload.

These three primitives + the feature-level Modal pattern are showcased end-to-end in `features/examples`: `DialogShowcasePage` (basics / sizes / nested / fullscreen), `SheetShowcasePage` (4 sides + scrollable body), `CommandShowcasePage` (⌘K + inline) and `SignInModalShowcasePage` (mount + 2 triggers). Use those pages as runnable references when extending behaviour.

## Toast notifications

- Toasts are mounted exactly once in [src/app/providers.tsx](../../src/app/providers.tsx) via `<Toaster />` from `@/shared/ui/toaster`. Business code fires events imperatively via `import { toast } from '@/shared/ui/toaster'` (`toast.success`, `toast.error`, `toast.promise`, …). The imperative API surface comes from [`sonner`](https://sonner.emilkowal.ski/).
- Toast **styling** is design-driven — it reads CSS tokens (`--color-card`, `--color-border`, `--radius-md`, `--surface-border-width`) that the active design preset already controls. No separate style files exist; the design preset determines the look automatically.
- Toast **position** is the only user-facing config (`--toast-position`): `top-right` (default), `top-center`, `bottom-center`, `bottom-right`. Position is wired via `@eikon:variant(toastPosition=...)` markers inside `toaster.tsx`.
- Tweaking toast styling or position is covered in [skills/customize-toast/SKILL.md](../skills/customize-toast/SKILL.md).

## When to use `motion/react`

Reach for `motion/react` when one of these is true:

- The animation involves **enter/exit** transitions of conditional UI (`<AnimatePresence>`).
- The animation involves **layout shifts** that need spring physics (`layoutId`, `layout`).
- The animation involves **gesture-driven** values (`whileHover`, `whileTap`, drag).
- You need **shared element** transitions between routes.

Use a plain Tailwind utility (`transition-colors`, `transition-transform`, `duration-150`) when:

- The animation is a one-shot color, opacity or transform change tied to a state class (`hover:`, `focus-visible:`).
- The cost of bringing in `motion/react` for this component would be the only reason for an extra render.

## Motion guidelines

- Default transition: `{ type: 'spring', stiffness: 380, damping: 28 }` for UI; `{ duration: 0.15 }` for simple opacity fades.
- Respect prefers-reduced-motion. Wrap large layout animations in a check:

  ```tsx
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  ```

  (Or pass `transition={{ duration: reduce ? 0 : 0.2 }}`.)
- Don't animate `width`/`height` from layout — animate `scale`, `transform`, `opacity` instead.
- Each motion component must remain useful **without** motion: if `motion` were stripped, the component should still render correctly statically.

## Don't

- Don't pull in `framer-motion` or `react-spring`. Use `motion` only.
- Don't add a parallel "design system" folder. Everything ui lives under `src/shared/ui/`.
- Don't render `motion.*` components inside loops without keys — `<AnimatePresence>` requires stable keys.
