---
id: customize-design
title: Customize the design theme / tokens
description: Tweak existing theme tokens, switch between built-in design presets, or add a brand-new preset that plugs into the `--design` CLI variant axis. Light + dark coverage is mandatory.
keywords:
  [
    theme,
    design,
    tokens,
    palette,
    branding,
    dark mode,
    color scheme,
    variant,
    tailwind v4,
    preset,
    skin,
  ]
applies_to:
  - "src/styles/**"
  - "src/shared/theme/**"
---

# Skill: customize the design / theme

Use whenever the user asks to "change the colour scheme", "rebrand the
template", "add a dark blue theme", "switch the default look to
Linear", or "expose another preset to the CLI". Re-read
[rules/20-tailwind-v4.md](../../rules/20-tailwind-v4.md) first — it
encodes the non-negotiables (CSS-first, no `tailwind.config.js`, no
hex/rgb in components, tokens live in `@theme`).

## Built-in presets (the `--design <value>` CLI choices)

Each preset is modelled after a real, publicly-documented design
system so users immediately recognise the look. Anchor colours below
are the **brand-source values**; the actual `index.css` blocks
translate them to OKLCH for perceptual-uniform contrast checking.

| value       | Inspired by                  | Anchor palette                          | Typography                | Vibe                                |
| ----------- | ---------------------------- | --------------------------------------- | ------------------------- | ----------------------------------- |
| `default`   | (none — neutral baseline)    | violet `#7B5BD9`-ish on white           | system-ui                 | Brand-agnostic; safe start.         |
| `apple`     | Apple HIG / iOS 17+          | `#007AFF` systemBlue on `#FAFAFA`       | SF Pro / -apple-system    | Friendly, generous radii, native.   |
| `linear`    | [linear.app/brand]           | `#5E6AD2` lavender-blue on `#F4F5F8`    | Inter Variable            | Crisp, productivity tool, compact.  |
| `anthropic` | [Anthropic brand guidelines] | `#d97757` Crail orange on `#faf9f5`     | Lora (body) / Poppins (h) | Warm, humanist, editorial, serif.   |
| `vercel`    | [Vercel Geist]               | Ink `#000` / `#FFF` + `#0070F3` accent  | Geist Sans                | Strict monochrome, "less is more".  |
| `notion`    | Notion editor                | warm gray + `#2eaadc` blue              | Inter                     | Document-heavy, dashboard-friendly. |

[linear.app/brand]: https://linear.app/brand
[Anthropic brand guidelines]: https://github.com/anthropics/skills/blob/main/skills/brand-guidelines/SKILL.md
[Vercel Geist]: https://vercel.com/geist/colors

Switch the project to one of these at scaffold time:

```bash
pnpm dlx create-eikon-react my-app --design linear --yes
pnpm dlx create-eikon-react my-app --design anthropic --layout sidebar --yes
```

Or pick one interactively in the playground (`pnpm preview:dev` → Design dropdown).

## How theming works in this template (one-screen primer)

```
┌──────────────────────────────────────────────────────────────────┐
│ src/styles/index.css        ← ONE FILE, the only place tokens    │
│ ├── @theme  { … }           ← light-mode defaults                │
│ ├── .dark   { … }           ← dark-mode defaults                 │
│ ├── @eikon:variant(design=default)   ← presets, each pair        │
│ ├── @eikon:variant(design=apple)     │ of @theme + .dark         │
│ ├── @eikon:variant(design=linear)    │ overrides                 │
│ ├── @eikon:variant(design=anthropic) │                           │
│ ├── @eikon:variant(design=vercel)    │                           │
│ └── @eikon:variant(design=notion)    ┘                           │
└──────────────────────────────────────────────────────────────────┘
        │                                          │
        ▼                                          ▼
 src/shared/theme/themeStore.ts            src/shared/ui/*.tsx
   (light | dark | system,                  bg-[var(--color-primary)]
    cycles + persists)                      text-[var(--color-foreground)]
                                            border-[var(--color-border)]
```

Three immutable rules:

1. **Components never hard-code colours.** Always reach for
   `bg-[var(--color-xxx)]`, `text-[var(--color-xxx)]`, etc. If the
   token doesn't exist, add it to `@theme` first.
2. **Every preset MUST ship both halves** — an `@theme` block AND a
   `.dark` block — otherwise the base `.dark` from earlier in the
   same file will punch through the preset's `--color-primary` and
   silently revert it.
3. **Don't touch `themeStore.ts`** unless you are changing the
   `light / dark / system` mechanism itself. The store handles class
   toggling, localStorage, and `prefers-color-scheme`; presets and
   token tweaks never need it.

---

## Decision tree — which task am I doing?

```
Is the user asking to …
├── "change the primary colour" / tweak one token
│       → Task A: edit @theme / .dark in index.css
├── "switch the default to Linear" / "use the Anthropic look"
│       → Task B: change the default in TWO schemas + verify
├── "add a sky-blue theme" / "expose another preset (e.g. Material You)"
│       → Task C: full preset checklist (CSS + CLI + playground)
└── "add a new colour token (e.g. --color-success)"
        → Task D: token addition (touch @theme, .dark, every preset)
```

---

## Task A — tweak existing tokens

Smallest possible change. Use when the user just wants to nudge a
colour (e.g. "make primary slightly more teal").

1. Open
   [src/styles/index.css](../../../src/styles/index.css) and locate
   the relevant `@theme { ... }` block.
2. Change the OKLCH value. Prefer keeping the existing channel format
   (the file standardises on `oklch(L C H)`); don't sprinkle hex /
   rgb — they don't get the perceptual-uniformity benefit and they
   clash with the rule from `20-tailwind-v4.md`.
3. If the token is one whose contrast flips in dark mode (e.g.
   `--color-primary`, `--color-background`, `--color-foreground`,
   `--color-card`), update the matching value in `.dark { ... }`
   too. Aim for **≥ 4.5:1** contrast against the corresponding
   `*-foreground` token (use the OKLCH lightness channel as a quick
   proxy — see "Contrast cheatsheet" below).
4. Run `pnpm --filter @eikon/react dev` and toggle the
   `ThemeToggle` in the top-right of the running app. The change
   should hot-reload; if dark mode is now broken, you skipped step 3.

Tokens you almost never need to touch:

- `--font-sans` — only change if the brand owns a typeface.
- `--radius-sm / --radius-md / --radius-lg` — only change to express
  a brand voice (e.g. `vercel` = near-zero, `apple` = generous round).

---

## Task B — switch the default preset

Use when the user wants the freshly-scaffolded project to look like
e.g. `linear` instead of `default`. Two places must change in
lock-step:

1. **CLI default** — edit
   [packages/create-eikon-react/src/strip-features.ts](../../../../create-eikon-react/src/strip-features.ts)
   `DEFAULT_VARIANTS`:

   ```ts
   export const DEFAULT_VARIANTS: VariantSelections = {
     design: 'linear',   // ← was 'default'
     layout: 'stacked',
     ui: 'animate-ui',
   };
   ```

2. **Playground default** — edit
   [packages/preview-site/src/lib/params-schema.ts](../../../../preview-site/src/lib/params-schema.ts)
   `PARAMS[design].default`:

   ```ts
   {
     id: 'design',
     kind: 'enum',
     values: [...],
     default: 'linear',   // ← was 'default'
     ...
   }
   ```

3. (Optional, **don't** unless requested) re-baseline the unstripped
   template's appearance by re-ordering the variant blocks in
   `index.css` so the new preset's tokens win when nothing is
   stripped. In practice this only matters for screenshots — the
   CLI strips all but one variant anyway.

Verification:

```bash
pnpm --filter create-eikon-react test     # asserts DEFAULT_VARIANTS shape
pnpm --filter @eikon/preview build         # playground compiles
```

---

## Task C — add a brand-new preset (e.g. `cyberpunk`)

Use whenever the user wants a new design option exposed to the
`--design` flag and the playground dropdown. The work crosses 3
files; do them in this order, otherwise the CLI will accept a value
that produces a styled-as-default project.

Pro tip: if the new preset is modelled after a real product (Stripe,
Material You, GitHub Primer, Atlassian, Carbon, etc.), open the
brand-source page first, lift the anchor colours, then translate them
to OKLCH. Keep a comment at the top of the CSS block citing the
source URL — future readers will thank you.

### Step 1 — define the preset in CSS

Edit
[src/styles/index.css](../../../src/styles/index.css), append a new
block at the end of the **design axis** section (after `notion`):

```css
/* @eikon:variant(design=cyberpunk) begin */
@theme {
  --color-primary: oklch(0.7 0.27 320);          /* neon magenta */
  --color-primary-foreground: oklch(0.1 0 0);
  --color-secondary: oklch(0.18 0.04 280);
  --color-secondary-foreground: oklch(0.92 0.18 180);
  --color-accent: oklch(0.85 0.2 180);           /* electric cyan */
  --color-accent-foreground: oklch(0.1 0 0);
  --color-ring: oklch(0.7 0.27 320);
  --radius-lg: 0.25rem;
  --radius-md: 0.125rem;
  --radius-sm: 0rem;
  --font-sans: 'JetBrains Mono', ui-monospace, monospace;
}
.dark {
  --color-background: oklch(0.12 0.04 280);
  --color-foreground: oklch(0.95 0.18 180);
  --color-card: oklch(0.16 0.05 280);
  --color-card-foreground: oklch(0.95 0.18 180);
  --color-border: oklch(0.7 0.27 320);
  --color-input: oklch(0.7 0.27 320);
  --color-primary: oklch(0.78 0.27 320);
  --color-primary-foreground: oklch(0.1 0 0);
  --color-secondary: oklch(0.2 0.06 280);
  --color-secondary-foreground: oklch(0.95 0.18 180);
  --color-accent: oklch(0.6 0.22 180);
  --color-accent-foreground: oklch(0.1 0 0);
  --color-ring: oklch(0.78 0.27 320);
}
/* @eikon:variant(design=cyberpunk) end */
```

Checklist for the preset itself:

- [ ] Block is wrapped in the exact marker `@eikon:variant(design=<name>) begin/end` so `strip-features` can find it.
- [ ] Contains BOTH an `@theme { ... }` block (light) and a `.dark { ... }` block (dark). Skipping the dark block is the #1 mistake — the base `.dark` will leak through.
- [ ] Override at least: `--color-primary`, `--color-primary-foreground`, `--color-ring`, `--color-accent`. Override more (`--color-background`, `--color-card`, `--color-border`, `--font-sans`, `--radius-*`) only when the preset's identity demands it.
- [ ] All values use `oklch(...)`. Don't mix in `#hex` / `rgb(...)` / `hsl(...)` — the codebase only uses OKLCH in `index.css` and we want to keep grep clean.
- [ ] Pass the **contrast cheatsheet** (see below).

### Step 2 — register in the CLI

Edit
[packages/create-eikon-react/src/index.ts](../../../../create-eikon-react/src/index.ts)
`VARIANT_CHOICES.design`:

```ts
const VARIANT_CHOICES = {
  design: [
    'default',
    'apple',
    'linear',
    'anthropic',
    'vercel',
    'notion',
    'cyberpunk',   // ← add at the end; order = display order in the prompt
  ] as const,
  ...
};
```

This single edit drives three things:

1. The interactive `select` prompt during `create-eikon-react`.
2. The `--design cyberpunk` flag validation in non-interactive mode.
3. The set of values the type system narrows to.

### Step 3 — register in the playground

Edit
[packages/preview-site/src/lib/params-schema.ts](../../../../preview-site/src/lib/params-schema.ts)
to extend BOTH `values` AND `valueLabels`:

```ts
{
  id: 'design',
  kind: 'enum',
  values: [
    'default', 'apple', 'linear',
    'anthropic', 'vercel', 'notion',
    'cyberpunk',
  ],
  default: 'default',
  cliFlag: 'design',
  label: 'Design',
  axis: 'design',
  valueLabels: {
    default: 'Default (neutral violet)',
    apple: 'Apple HIG (systemBlue + SF Pro)',
    linear: 'Linear (lavender-blue + Inter)',
    anthropic: 'Anthropic (Claude orange + serif)',
    vercel: 'Vercel Geist (mono ink)',
    notion: 'Notion (warm gray + blue)',
    cyberpunk: 'Cyberpunk (neon)',   // ← keep the format consistent
  },
},
```

`valueLabels` is purely cosmetic (the dropdown label); the CLI and URL
hash still use the raw `value`. Missing entries fall back to the
raw value, so a missing label is graceful but ugly.

### Step 4 — verify end-to-end

```bash
# 1. The CSS marker actually strips correctly.
pnpm --filter create-eikon-react test

# 2. Scaffold into a throwaway dir and visually confirm.
node packages/create-eikon-react/dist/index.js my-cyberpunk-app \
     --design cyberpunk --yes --no-install --no-git
# inspect: my-cyberpunk-app/src/styles/index.css should contain ONLY
# the cyberpunk block from the design axis.

# 3. Playground compiles + the new option appears.
pnpm --filter @eikon/preview dev
# open http://localhost:5173 and choose Design → Cyberpunk
```

### Step 5 — run the gates

```bash
pnpm lint
pnpm typecheck
pnpm test
```

The structure guard tests don't enforce the design axis specifically,
but the variant-strip tests + CLI tests do — they'll catch a missing
end marker or a value that's in the CSS but not in `VARIANT_CHOICES`.

---

## Task D — add a new colour token (e.g. `--color-success`)

Use when the design needs a semantic colour that isn't covered by the
existing token set (most common: success / warning / info).

1. Add the variable to the **base** `@theme` and the base `.dark` in
   [src/styles/index.css](../../../src/styles/index.css):

   ```css
   @theme {
     ...
     --color-success: oklch(0.55 0.16 150);
     --color-success-foreground: oklch(0.98 0 0);
   }
   .dark {
     ...
     --color-success: oklch(0.72 0.16 150);
     --color-success-foreground: oklch(0.14 0.05 150);
   }
   ```

2. **If any existing design preset should override this token**, add
   matching entries to that preset's `@theme` AND `.dark` blocks too.
   It's fine — and usually preferred — for presets to inherit the
   base value silently; only override when the preset's identity
   demands a different success colour (e.g. `vercel` would want a
   monochrome success badge with a black-on-white check icon, not a
   coloured pill).

3. Consume in components via the same pattern:

   ```tsx
   className="bg-[var(--color-success)] text-[var(--color-success-foreground)]"
   ```

4. Don't forget the corresponding `*-foreground` pair. Every colour
   used as a background needs a foreground partner with adequate
   contrast.

---

## Contrast cheatsheet

OKLCH's `L` channel is roughly perceptual lightness. As a rule of
thumb on this template:

| Pair                                         | `L_bg` | `L_fg` | `|ΔL|` | OK?  |
| -------------------------------------------- | ------ | ------ | ------ | ---- |
| `--color-background` ↔ `--color-foreground`  | 1.00   | 0.18   | 0.82   | Yes  |
| `--color-primary` ↔ `--color-primary-foreground` | 0.55 | 0.98  | 0.43   | Yes  |
| `--color-muted` ↔ `--color-muted-foreground` | 0.96   | 0.45   | 0.51   | Yes  |

Targets:

- Body text on background: `|ΔL| ≥ 0.5` (≈ 4.5:1 in sRGB).
- Large headlines / button labels: `|ΔL| ≥ 0.35` is usually safe.
- For brand accents on background, also check the chroma — a high-C
  primary on a high-C background is hard to read even when L
  contrasts.

If you're unsure, paste both OKLCH values into
[oklch.com](https://oklch.com) and read off the WCAG ratio.

---

## Completion checklist

- [ ] All token edits live in `src/styles/index.css`. No new
      `*.css` file. No `tailwind.config.js` introduced.
- [ ] Every preset block has BOTH `@theme` and `.dark` halves.
- [ ] Every override uses `oklch(...)`. No hex / rgb / hsl.
- [ ] `--color-X` always paired with `--color-X-foreground` if it
      can appear as a background.
- [ ] If a new preset value was added: `VARIANT_CHOICES.design`
      (CLI) AND `params-schema.ts` `design.values` (playground)
      both list it. `valueLabels` carries a human-friendly label.
- [ ] If the default preset was changed: `DEFAULT_VARIANTS.design`
      in `strip-features.ts` AND `default` in `params-schema.ts`
      both moved.
- [ ] `pnpm lint && pnpm typecheck && pnpm test` is green.
- [ ] Smoke-checked the preset in BOTH light and dark mode in the
      running app (the `ThemeToggle` in the header cycles
      light → dark → system).

## Common mistakes

- **Forgetting the `.dark` half of a preset.** The base `.dark`
  block earlier in `index.css` still applies, and its values for
  `--color-primary`, `--color-background`, etc. will leak through.
  Visible symptom: dark-mode primary looks like the default violet
  even though light-mode is clearly your new preset.
- **Adding a value to `VARIANT_CHOICES.design` but no CSS block.**
  `strip-features` will silently produce a default-looking project
  (no block to keep, so all blocks get stripped, base `@theme`
  wins). Add the CSS block first.
- **Adding a CSS block but not updating `VARIANT_CHOICES.design`.**
  The CLI's `--design <newname>` validation rejects the value
  silently and falls back to the default; user reports "the flag
  did nothing".
- **Hard-coding colours inside a component to "see how it would
  look".** Don't — that's a one-way ratchet. Add a token (Task D)
  or override an existing one (Task A), and consume via
  `var(--color-...)`.
- **Editing `themeStore.ts` to switch presets at runtime.** Presets
  are scaffold-time, not runtime. If you actually need a runtime
  "skin" switcher (rare — e.g. allowing end users to pick from N
  palettes), open a design discussion first; it's a different
  architecture (multiple `.dark`-like classes on `<html>`, store
  manages which one is active).

## See also

- [rules/20-tailwind-v4.md](../../rules/20-tailwind-v4.md) —
  Tailwind v4 CSS-first contract; theme tokens, dark mode,
  forbidden patterns.
- [src/shared/theme/themeStore.ts](../../../src/shared/theme/themeStore.ts) —
  the light/dark/system runtime switch (don't touch unless you're
  changing the switch mechanism itself).
- [packages/create-eikon-react/src/strip-features.ts](../../../../create-eikon-react/src/strip-features.ts) —
  the `@eikon:variant` marker grammar; read if you're adding a new
  axis (not just a new value).
