---
id: customize-toast
title: Customize the toast notification preset
description: Tweak an existing toast preset, switch the default, add a brand-new preset that plugs into the `--toast` CLI variant axis, or (rarely) swap the underlying library. Business code keeps using `toast.success/error/info/...` from `@/shared/ui/toaster` regardless of preset.
keywords:
  [
    toast,
    notification,
    snackbar,
    sonner,
    toaster,
    preset,
    variant,
    banner,
    notification center,
    glassmorphism,
  ]
applies_to:
  - "src/shared/ui/toaster.tsx"
  - "src/shared/ui/toaster/**"
---

# Skill: customize the toast / notification preset

Use whenever the user asks to "change how toasts look", "move
notifications to the bottom", "use a glass-style toaster", "switch to
react-hot-toast", or "add a new toast preset". The imperative API
(`toast.success('...')`, `toast.error('...')`, etc.) is **identical
across every preset** — business code in features never has to change.

## Built-in presets (the `--toast <value>` CLI choices)

Every preset is a thin wrapper around Sonner's `<Toaster>` that varies
position, density, chrome (richColors / closeButton), duration, and
classNames. Status colour (success / error / warning) is conveyed by
the Sonner-rendered icon in every preset — only `default` and
`stacked-cards` also wash the card with `richColors`.

| value           | Position         | Vibe / source                                   | Key knobs                                                  |
| --------------- | ---------------- | ----------------------------------------------- | ---------------------------------------------------------- |
| `default`       | top-right        | Sonner recommended default                      | `richColors`, `closeButton`, `shadow-lg`, rounded-md       |
| `minimal`       | bottom-center    | Linear / Vercel / Notion — short, no chrome     | duration 3000, no rich colors, no close button, `shadow-sm`|
| `apple`         | top-center       | macOS / iOS notification banner                 | rounded-2xl, frosted-glass card, `ring-1`, larger duration |
| `glass`         | top-right        | Arc / Raycast glassmorphism                     | `backdrop-blur-2xl`, half-opacity card, `shadow-2xl`       |
| `terminal`      | bottom-left      | VSCode / GitHub CLI / devtools panel            | `font-mono`, fixed `bg-neutral-900` (ignores light/dark)   |
| `floating-bar`  | bottom-center    | VSCode bottom notification slot                 | `min-w-80 max-w-2xl`, single-line, tight vertical padding  |
| `stacked-cards` | bottom-right     | Discord / Slack desktop notification stack      | `expand=true`, `richColors`, `closeButton`, `shadow-2xl`   |

Pick one at scaffold time:

```bash
pnpm dlx create-eikon-react my-app --toast minimal --yes
pnpm dlx create-eikon-react my-app --toast apple --design apple --yes
```

Or interactively via the playground (`pnpm preview:dev` → Toast dropdown).

## How toast wiring works in this template (one-screen primer)

```
src/shared/ui/toaster.tsx                 ← dispatcher (single file)
   │
   ├── re-exports `toast` from 'sonner'   ← identical API in every preset
   └── picks ONE `<XxxToaster />` to       
       re-export as `Toaster` via .at(0)  
                                          
src/shared/ui/toaster/                    ← one sibling per preset
   ├── default-toaster.tsx                // @eikon:variant(toast=default) file
   ├── minimal-toaster.tsx                // @eikon:variant(toast=minimal) file
   ├── apple-toaster.tsx                  // @eikon:variant(toast=apple) file
   ├── glass-toaster.tsx                  // @eikon:variant(toast=glass) file
   ├── terminal-toaster.tsx               // @eikon:variant(toast=terminal) file
   ├── floating-bar-toaster.tsx           // @eikon:variant(toast=floating-bar) file
   └── stacked-cards-toaster.tsx          // @eikon:variant(toast=stacked-cards) file
```

> The dispatcher and feature code import preset components by their named export (PascalCase, `DefaultToaster` / `MinimalToaster` / …), but the **filenames** are kebab-case to satisfy the `src/shared/ui/**/*.tsx` shadcn-lineage rule in [eslint.config.js](../../../eslint.config.js).

What strip-features does:

- At CLI strip time, every `@eikon:variant(toast=X)` **block** in
  `toaster.tsx` collapses to ONE entry (the chosen preset), and every
  unchosen **sibling file** is removed whole-file by its own first-line
  marker. The final scaffolded project contains exactly one
  `*-toaster.tsx` next to the dispatcher.
- In the **unstripped** template (when you `pnpm dev` template-react
  directly or run tests against `src/`), all seven imports coexist and
  `.at(0)` returns the first entry — the schema default (`default`).
  Reorder the variant blocks in `toaster.tsx` to change the unstripped
  default; the CLI default is configured separately (see Task B).

Three immutable rules:

1. **The dispatcher's exports are fixed.** It always re-exports
   `Toaster` (the chosen preset) AND `toast` (the imperative API
   from `sonner`). Business code never imports from
   `@/shared/ui/toaster/Xxx` directly — only from
   `@/shared/ui/toaster`. This keeps preset switching truly
   non-invasive.
2. **Every preset uses the same imperative API surface.** Sonner's
   `toast.success / toast.error / toast.warning / toast.info /
   toast.promise / toast.message` work in every preset. Don't add
   preset-specific helpers (e.g. `toast.terminal('...')`); if you
   need terminal-only behaviour, put it inside `terminal-toaster.tsx`'s
   classNames or `toastOptions`.
3. **Style tokens come from `@theme`, not hardcoded values.** Card
   colours, borders, and shadows reference design tokens
   (`var(--color-card)`, `var(--color-border)`, `shadow-lg`) so the
   active design preset and dark mode flow through automatically.
   The single deliberate exception is `TerminalToaster` — its dark
   neutral background is the whole point of the preset, so it ignores
   the theme tokens on purpose.

---

## Decision tree — which task am I doing?

```
Is the user asking to …
├── "make toasts appear at the bottom" / "remove the close button"
│       → Task A: tweak an existing preset's props
├── "use the apple-style toaster by default" / "switch the default to minimal"
│       → Task B: change the default in TWO schemas
├── "add a brutalist toaster" / "expose another preset (e.g. material)"
│       → Task C: full preset checklist (sibling file + dispatcher + CLI + playground)
└── "switch the library to react-hot-toast / radix-ui"
        → Task D: library swap (rare — read the warning first)
```

---

## Task A — tweak an existing preset

Smallest possible change. Use when the user just wants to nudge one
preset (e.g. "make `glass` last longer", "show the close button on
`minimal` too").

1. Open the sibling file for the preset you're editing, e.g.
   [src/shared/ui/toaster/glass-toaster.tsx](../../../src/shared/ui/toaster/glass-toaster.tsx).
2. Change props on `<SonnerToaster ... />` — see Sonner's docs for the
   full list (`position`, `duration`, `richColors`, `closeButton`,
   `expand`, `offset`, `gap`, `visibleToasts`, `theme`, …).
3. To restyle the card itself, edit `toastOptions.classNames.toast` —
   keep design-token utilities (`bg-[var(--color-card)]`,
   `text-[var(--color-card-foreground)]`, `border-[var(--color-border)]`,
   `shadow-lg`, `rounded-md`) so the active design preset and dark
   mode keep flowing through.
4. `pnpm --filter @eikon/react dev`, click any "Show toast" button on
   the Counter page to spot-check both light and dark mode.

What you almost never need to touch:

- **`Toaster` name / export shape.** The dispatcher imports every
  sibling by a specific named export (`DefaultToaster`,
  `MinimalToaster`, …). Renaming the function inside a sibling breaks
  the dispatcher's `import { DefaultToaster } from ...` line.
- **The dispatcher itself.** Unless you're adding a brand-new preset
  (Task C), `toaster.tsx` shouldn't change.
- **`@/shared/ui/toaster` import paths in features.** They're
  preset-agnostic on purpose.

---

## Task B — switch the default preset

Use when the user wants freshly-scaffolded projects to look like e.g.
`minimal` instead of `default`. Two places must change in lock-step:

1. **CLI default** — edit
   [packages/create-eikon-react/src/strip-features.ts](../../../../create-eikon-react/src/strip-features.ts)
   `DEFAULT_VARIANTS`:

   ```ts
   export const DEFAULT_VARIANTS: VariantSelections = {
     design: 'default',
     layout: 'stacked',
     ui: 'animate-ui',
     toast: 'minimal',   // ← was 'default'
   };
   ```

2. **Playground default** — edit
   [packages/preview-site/src/lib/params-schema.ts](../../../../preview-site/src/lib/params-schema.ts)
   `PARAMS[toast].default`:

   ```ts
   {
     id: 'toast',
     kind: 'enum',
     values: [...],
     default: 'minimal',   // ← was 'default'
     ...
   }
   ```

3. (Optional, **don't** unless requested) re-baseline the unstripped
   template's appearance by re-ordering the `@eikon:variant(toast=...)`
   blocks in `src/shared/ui/toaster.tsx` so the new preset's import
   comes first — `.at(0)` returns whichever sibling is listed first
   when nothing is stripped. The CLI strips all but one variant
   anyway, so this only matters for unstripped dev / screenshots.

Verification:

```bash
pnpm --filter create-eikon-react test     # asserts DEFAULT_VARIANTS shape
pnpm --filter @eikon/preview build         # playground compiles
```

---

## Task C — add a brand-new preset (e.g. `brutalist`)

Use whenever the user wants a new toast option exposed to the
`--toast` flag and the playground dropdown. The work crosses 4 places;
do them in this order, otherwise the CLI will accept a value that
produces a `default`-looking project (or worse, a compile error).

### Step 1 — write the sibling file

Create
[src/shared/ui/toaster/brutalist-toaster.tsx](../../../src/shared/ui/toaster/) (filename is kebab-case to satisfy the `src/shared/ui/**` ESLint rule):

```tsx
// @eikon:variant(toast=brutalist) file
/**
 * @file brutalist-toaster.tsx
 * @description Brutalist preset — hard 2px black border, no rounding,
 * no shadow, all-caps title.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Third-party Libraries ---
import { Toaster as SonnerToaster } from 'sonner';

// =================================================================================================
// Component
// =================================================================================================

function BrutalistToaster() {
  return (
    <SonnerToaster
      position="top-left"
      duration={4000}
      toastOptions={{
        classNames: {
          toast:
            'rounded-none border-2 border-[var(--color-foreground)] bg-[var(--color-background)] text-[var(--color-foreground)] shadow-none px-3 py-2',
          title: 'text-xs font-bold uppercase tracking-widest',
          description: 'text-xs',
        },
      }}
    />
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export { BrutalistToaster };
```

Checklist for the sibling file:

- [ ] **Filename is kebab-case** (e.g. `brutalist-toaster.tsx`). `src/shared/ui/**` follows the shadcn lineage rule in [eslint.config.js](../../../eslint.config.js); PascalCase filenames here fail `eikon/filename-case-by-path`.
- [ ] **First line is exactly** `// @eikon:variant(toast=<name>) file`. No leading blank line, no banner before it — `strip-features` only honours file markers on the very first line.
- [ ] Exported function is named `<PascalCaseName>Toaster` (e.g. `BrutalistToaster`). The dispatcher imports by name; misnaming this function silently produces a typecheck error AFTER strip but the dispatcher itself still parses. (The filename ↔ export linkage rule `eikon/filename-matches-export` accepts `<kebab-name>.tsx` exporting a `<PascalName>` symbol — same shape as `button.tsx`/`Button`.)
- [ ] Wraps Sonner's `<SonnerToaster ... />`. Do NOT introduce a new top-level provider — the preset is a styling/configuration layer only.
- [ ] Style hooks (`toastOptions.classNames.toast / .title / .description`) consume design tokens (`var(--color-card)`, `var(--color-border)`, …) unless the preset's identity demands a hard-coded palette (the way `TerminalToaster` does).
- [ ] No new imperative API. Reach for Sonner's `toast.*` from the dispatcher's re-export instead of adding helpers.

### Step 2 — wire it into the dispatcher

Edit [src/shared/ui/toaster.tsx](../../../src/shared/ui/toaster.tsx)
and add two paired block-markers — one for the import, one for the
array entry — at the **end** of each existing list (order is the
unstripped-dev default tie-breaker):

```tsx
// @eikon:variant(toast=brutalist) begin
import { BrutalistToaster } from './toaster/brutalist-toaster';
// @eikon:variant(toast=brutalist) end
```

```tsx
const Toaster = [
  // ... existing entries ...
  // @eikon:variant(toast=brutalist) begin
  BrutalistToaster,
  // @eikon:variant(toast=brutalist) end
].at(0)!;
```

The marker grammar lives in
[packages/create-eikon-react/src/strip-features.ts](../../../../create-eikon-react/src/strip-features.ts) — both
`begin/end` blocks for the same axis/value MUST be balanced or the
file ends up with a dangling `begin` after strip.

### Step 3 — register in the CLI

Edit [packages/create-eikon-react/src/index.ts](../../../../create-eikon-react/src/index.ts)
`VARIANT_CHOICES.toast`:

```ts
const VARIANT_CHOICES = {
  ...
  toast: [
    'default', 'minimal', 'apple', 'glass',
    'terminal', 'floating-bar', 'stacked-cards',
    'brutalist',   // ← add at the end; order = display order in the prompt
  ] as const,
};
```

This single edit drives three things:

1. The interactive `select` prompt during `create-eikon-react`.
2. The `--toast brutalist` flag validation in non-interactive mode.
3. The set of values the type system narrows to.

### Step 4 — register in the playground

Edit [packages/preview-site/src/lib/params-schema.ts](../../../../preview-site/src/lib/params-schema.ts)
to extend BOTH `values` AND `valueLabels`:

```ts
{
  id: 'toast',
  kind: 'enum',
  values: [
    'default', 'minimal', 'apple', 'glass',
    'terminal', 'floating-bar', 'stacked-cards',
    'brutalist',
  ],
  default: 'default',
  cliFlag: 'toast',
  label: 'Toast',
  axis: 'toast',
  valueLabels: {
    default: 'Default (top-right, richColors)',
    minimal: 'Minimal (bottom-center, no chrome)',
    apple: 'Apple banner (top-center, frosted)',
    glass: 'Glassmorphism (top-right, blur)',
    terminal: 'Terminal (bottom-left, mono)',
    'floating-bar': 'Floating bar (bottom-center)',
    'stacked-cards': 'Stacked cards (bottom-right, expand)',
    brutalist: 'Brutalist (top-left, hard borders)',   // ← keep the format consistent
  },
},
```

### Step 5 — verify end-to-end

```bash
# 1. CLI test asserts the marker grammar parses correctly.
pnpm --filter create-eikon-react test

# 2. Scaffold into a throwaway dir and visually confirm.
node packages/create-eikon-react/dist/index.js my-brut-app \
     --toast brutalist --yes --no-install --no-git
# inspect: my-brut-app/src/shared/ui/toaster/ should contain ONLY
# brutalist-toaster.tsx; my-brut-app/src/shared/ui/toaster.tsx should
# only have the `@eikon:variant(toast=brutalist)` blocks left.

# 3. Playground compiles + the new option appears.
pnpm --filter @eikon/preview dev
# open http://localhost:3100 and choose Toast → Brutalist
```

### Step 6 — run the gates

```bash
pnpm lint
pnpm typecheck
pnpm test
```

The e2e `variants` scenario asserts that unchosen sibling files and
unchosen marker blocks are gone — a misnamed file or unbalanced
marker pair is caught here.

---

## Task D — switch the underlying library (advanced)

Use only when the user explicitly wants a different library (e.g.
`react-hot-toast`, `radix-ui`'s toast primitive). **Default
recommendation: don't.** The preset axis already covers the visual
variation most teams want, and switching libraries means:

- Every feature that imports `toast` from `@/shared/ui/toaster` keeps
  compiling, but the function shape changes (`react-hot-toast`'s
  `toast.success(msg, opts)` doesn't accept the same `opts` as Sonner).
- Every preset sibling file becomes obsolete — they're written against
  Sonner's `<Toaster>` props.

If you genuinely need a different library, the cheapest path is to
keep the dispatcher's surface intact and write an adapter:

1. `pnpm --filter @eikon/react add react-hot-toast` (or your library
   of choice). `pnpm --filter @eikon/react remove sonner` once the
   migration is complete.
2. Rewrite `src/shared/ui/toaster/<each>-toaster.tsx` so they each
   render the new library's provider with equivalent
   position/duration/styling. Keep the named exports
   (`DefaultToaster`, `MinimalToaster`, …) intact — the dispatcher
   relies on them.
3. Inside `src/shared/ui/toaster.tsx`, replace
   `import { toast } from 'sonner'` with an adapter object whose
   methods (`success`, `error`, `warning`, `info`, `promise`,
   `message`) map onto the new library's API. Export it as `toast`
   from the dispatcher so feature code is untouched.
4. Run the gates (`pnpm lint && pnpm typecheck && pnpm test`).
   Update any tests that asserted Sonner-specific behaviour.

---

## Completion checklist

- [ ] All new code is under `src/shared/ui/toaster/` (sibling files)
      and `src/shared/ui/toaster.tsx` (dispatcher). No business
      feature imports from any sibling directly.
- [ ] Every sibling file starts with
      `// @eikon:variant(toast=<value>) file` on the very first line.
- [ ] If a new preset value was added: `VARIANT_CHOICES.toast` in
      [create-eikon-react/src/index.ts](../../../../create-eikon-react/src/index.ts) AND
      `toast.values` in [preview-site/src/lib/params-schema.ts](../../../../preview-site/src/lib/params-schema.ts)
      both list it. `valueLabels` carries a human-friendly label.
- [ ] If the default preset was changed: `DEFAULT_VARIANTS.toast` in
      [strip-features.ts](../../../../create-eikon-react/src/strip-features.ts) AND
      `default` in [params-schema.ts](../../../../preview-site/src/lib/params-schema.ts)
      both moved.
- [ ] Style tokens prefer `var(--color-*)` and Tailwind utilities
      over hardcoded hex / inline styles (except the deliberate
      `terminal` exception).
- [ ] `pnpm lint && pnpm typecheck && pnpm test` is green.
- [ ] Smoke-checked the preset in BOTH light and dark mode — pop a
      `toast.success('Hi')` from any feature page.

## Common mistakes

- **Renaming the sibling's exported function.** The dispatcher imports
  by named export (`import { DefaultToaster } from ...`); rename it
  and the dispatcher fails to compile after strip. Keep the
  `<PascalCaseName>Toaster` convention.
- **Putting the file marker on line 2.** `strip-features` only honours
  `@eikon:variant(toast=X) file` on the very first line of the file
  (this is by design — see `strip-features.ts` comment on
  `FILE_MARKER_RE`). A misplaced marker is silently ignored and the
  file survives even when it shouldn't.
- **Adding a value to `VARIANT_CHOICES.toast` but no sibling file.**
  `strip-features` will keep the dispatcher's import block for that
  value, but the import resolves to a missing file → build error.
  Add the sibling file FIRST.
- **Adding a sibling file but forgetting the dispatcher blocks.** The
  unstripped template still compiles (the file is just unused), but
  scaffolding with `--toast <new>` produces a project where the
  dispatcher's array is empty and `.at(0)!` throws at runtime.
- **Hard-coding the position in business code.** Don't reach for
  Sonner's per-call `position` override (`toast.success('Hi', { position: 'bottom-left' })`)
  to "tweak just this one toast". That breaks the preset contract —
  the chosen preset's position should win globally.
- **Adding a `<Toaster>` somewhere other than `providers.tsx`.** The
  template mounts exactly one toaster at the provider stack. Adding
  a second renders duplicate toasts (each event fires in both).

## See also

- [src/shared/ui/toaster.tsx](../../../src/shared/ui/toaster.tsx) —
  the dispatcher; this is where you wire a new sibling.
- [src/app/providers.tsx](../../../src/app/providers.tsx) — the
  single mount point for `<Toaster />`.
- [packages/create-eikon-react/src/strip-features.ts](../../../../create-eikon-react/src/strip-features.ts) —
  the `@eikon:variant` marker grammar; read if you're adding a new
  axis (not just a new value).
- [skills/customize-design/SKILL.md](../customize-design/SKILL.md) —
  the same dispatcher pattern, applied to the `design` axis instead.
