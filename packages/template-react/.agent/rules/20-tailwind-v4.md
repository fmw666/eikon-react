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
- The light/dark/system runtime switch lives in [src/shared/theme/themeStore.ts](../../src/shared/theme/themeStore.ts). It owns the `<html>` class toggle, `localStorage['theme']`, and the `prefers-color-scheme` listener. Don't add another path that mutates the same DOM class.

## Design presets (`design` variant axis)

- The template ships six scaffold-time design presets, each modelled after a publicly-documented design system so users immediately recognise the look: `default` (neutral baseline), `apple` (Apple HIG / systemBlue + SF Pro), `linear` ([linear.app/brand](https://linear.app/brand) lavender-blue + Inter), `anthropic` ([Anthropic brand](https://github.com/anthropics/skills/blob/main/skills/brand-guidelines/SKILL.md) Crail orange + Lora serif), `vercel` ([Geist](https://vercel.com/geist/colors) monochrome ink), and `notion` (warm gray + blue). Each is a pair of CSS blocks in [`src/styles/index.css`](../../src/styles/index.css), wrapped in `@eikon:variant(design=<name>) begin/end` markers. The CLI's `--design <name>` flag keeps only the chosen pair and strips the rest.
- Each preset covers **six token dimensions** (all Tailwind v4 namespaces, see token namespace table in the skill): colour palette (`--color-*`), corner radii (`--radius-*`), font family (`--font-{sans,serif,mono}`), font-weight scale (`--font-weight-*`), type scale + line-height (`--text-*` + `--text-*--line-height`), tracking (`--tracking-*`), density (`--spacing`), and shadow (`--shadow-*`). Only the colour palette is required — everything else is overridden only when the preset's brand voice demands it. Because Tailwind v4 utilities (`text-sm`, `p-6`, `font-medium`, `shadow-md`, …) consume these tokens directly, **components don't change between presets** — the visual difference is entirely token-driven.
- One additional non-utility dimension: **scrollbar** (`--scrollbar-{size,thumb,thumb-hover,track,thumb-radius,thumb-border}`). These live alongside the Tailwind tokens inside each preset's `@theme` + `.dark` blocks but don't generate utilities — they're consumed by a single set of `::-webkit-scrollbar` rules (plus Firefox `scrollbar-color`) in `@layer base`. Override per preset whenever the gutter geometry or thumb fill matters for the brand voice (Vercel: monochrome near-square; Linear: narrow architectural; Apple: cool tube; etc.).
- **Every preset MUST ship both halves**: an `@theme { ... }` block overriding light-mode tokens AND a `.dark { ... }` block overriding dark-mode tokens. Skipping the `.dark` half causes the base `.dark` block earlier in the file to leak through, silently reverting `--color-primary` (and friends) to the default palette. The typography / spacing / shadow tokens live inside the `@theme` block — they don't normally need dark-mode counterparts unless a preset's shadow tint changes between modes.
- Adding a new preset, switching the default, or tweaking tokens are all covered step-by-step in [skills/customize-design/SKILL.md](../skills/customize-design/SKILL.md) — read it before editing `index.css`.
- The known-value list lives in three places that MUST stay in lock-step: the CSS markers, `VARIANT_CHOICES.design` in [`packages/create-eikon-react/src/index.ts`](../../../create-eikon-react/src/index.ts), and `design.values` in [`packages/preview-site/src/lib/params-schema.ts`](../../../preview-site/src/lib/params-schema.ts).

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

When a component needs animation, **import primitives from `motion/react`** (see `50-ui-axis.md`); do not write CSS keyframes in component files.
