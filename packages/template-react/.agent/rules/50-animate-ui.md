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

- All ui primitives live in `src/shared/ui/`. Each primitive is one file named in lowercase (`button.tsx`, `dialog.tsx`, `tabs.tsx`, `card.tsx`, `toaster.tsx`). The one exception is `toaster.tsx`: it is a dispatcher that re-exports one of seven sibling `*-toaster.tsx` files under `src/shared/ui/toaster/`, picked by the `--toast` variant axis (see "Toast notifications" below).
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

## Toast notifications (`toast` variant axis)

- Toasts are mounted exactly once in [src/app/providers.tsx](../../src/app/providers.tsx) via `<Toaster />` from `@/shared/ui/toaster`. Business code fires events imperatively via `import { toast } from '@/shared/ui/toaster'` (`toast.success`, `toast.error`, `toast.promise`, …). The imperative API surface comes from [`sonner`](https://sonner.emilkowal.ski/) and is **identical across every preset** — switching presets never touches feature code.
- The template ships seven scaffold-time toast presets, each a thin Sonner wrapper varying position / chrome / classNames: `default` (top-right, richColors), `minimal` (bottom-center, no chrome), `apple` (top-center frosted banner), `glass` (top-right glassmorphism), `terminal` (bottom-left mono on dark), `floating-bar` (bottom-center wide pill), and `stacked-cards` (bottom-right `expand=true`). Each lives in its own `src/shared/ui/toaster/<name>-toaster.tsx` with a first-line `@eikon:variant(toast=<value>) file` marker, and the dispatcher at `src/shared/ui/toaster.tsx` picks exactly one to re-export as `Toaster` via `.at(0)!`. The CLI's `--toast <value>` flag keeps only the chosen sibling and strips the rest. This is the same dispatcher pattern used by `app/layouts/RootLayout.tsx` for the `layout` axis.
- Preset card styling MUST consume design tokens (`bg-[var(--color-card)]`, `border-[var(--color-border)]`, `text-[var(--color-card-foreground)]`, `shadow-lg`) so the active design preset and dark mode flow through automatically. The deliberate exception is `terminal-toaster.tsx`, which fixes its own dark neutral background as part of the preset's identity.
- Adding a new toast preset, switching the default, or tweaking an existing preset are all covered step-by-step in [skills/customize-toast/SKILL.md](../skills/customize-toast/SKILL.md) — read it before editing `toaster.tsx` or its sibling directory.
- The known-value list lives in three places that MUST stay in lock-step: the marker comments + sibling files, `VARIANT_CHOICES.toast` in [`packages/create-eikon-react/src/index.ts`](../../../create-eikon-react/src/index.ts), and `toast.values` in [`packages/preview-site/src/lib/params-schema.ts`](../../../preview-site/src/lib/params-schema.ts).

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
