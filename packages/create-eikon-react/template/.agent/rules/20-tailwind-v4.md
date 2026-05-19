---
id: tailwind-v4
title: Tailwind CSS v4 styling rules
description: How to style components using Tailwind v4 utilities and theme tokens. Forbids legacy v3 patterns.
applies_to: ["src/**/*.{tsx,css}"]
severity: must
---

# Tailwind v4 conventions

## Configuration is in CSS, not JS

- The single Tailwind entrypoint is [src/styles/index.css](../../src/styles/index.css). It uses `@import "tailwindcss";` and declares all theme tokens inside `@theme { ... }`.
- **Do not create a `tailwind.config.js` / `.ts`** — the template is intentionally CSS-first.
- Theme tokens (colors, radii, fonts) are CSS custom properties named `--color-foo`, `--radius-lg`, `--font-sans`, etc. Adding a new token means editing `@theme` in `index.css` only.

## Composition rules

- Compose Tailwind utilities directly on JSX. Use the `cn()` helper from [@/shared/lib/cn](../../src/shared/lib/cn.ts) when conditionally toggling classes; it merges with `tailwind-merge` so conflicting utilities resolve to the last one.
- **Do not use `@apply`** inside component CSS. The only acceptable use of `@apply` is inside `src/styles/index.css` for `@layer base { ... }` truly global resets.
- Avoid arbitrary values (`bg-[#ff00ff]`) when a token exists. Reach for the token first: `bg-[var(--color-primary)]`.

## Dark mode

- Dark mode is class-based and toggled by adding `dark` to `<html>`. The variant is declared with `@variant dark (&:where(.dark, .dark *))` in `index.css`.
- Override tokens for dark mode by setting the same `--color-*` variables inside `.dark { ... }`. Components reference tokens (`bg-[var(--color-background)]`), so dark mode is automatic.

## Variant-rich components (`cva`)

Use [`class-variance-authority`](https://cva.style/docs) when a single component has multiple visual variants:

```ts
const button = cva(
  'inline-flex items-center justify-center ...',
  {
    variants: { variant: { default: '...', ghost: '...' }, size: { sm: '...', md: '...' } },
    defaultVariants: { variant: 'default', size: 'md' },
  }
);
```

Expose the variant props via `VariantProps<typeof button>` so consumers get autocomplete and type safety.

## Forbidden patterns

- `@apply` in feature CSS files (or `.module.css`).
- Inline `style={{ ... }}` for layout / color / spacing. It is acceptable only for genuinely dynamic values (`style={{ width: dynamicPx }}`).
- Re-introducing v3-era `tailwind-merge` config files. v3 plugin configs do not apply to v4.
- A `tailwind.config.js` of any form.

## Animation styling

When a component needs animation, **import primitives from `motion/react`** (see `50-animate-ui.md`); do not write CSS keyframes in component files.
