---
id: customize-toast
title: Customize the toast notification
description: Adjust the toast position, tweak styling (classNames), change Sonner props, or (rarely) swap the underlying library. Business code keeps using `toast.success/error/info/...` from `@/shared/ui/toaster` regardless.
keywords:
  [
    toast,
    notification,
    snackbar,
    sonner,
    toaster,
    position,
    banner,
  ]
applies_to:
  - "src/shared/ui/toaster.tsx"
---

# Skill: customize the toast / notification

Use whenever the user asks to "change how toasts look", "move
notifications to the bottom", "use a different toast style", "switch to
react-hot-toast", or similar. The imperative API
(`toast.success('...')`, `toast.error('...')`, etc.) is **identical
regardless of configuration** — business code in features never changes.

## Architecture (one-screen primer)

```
src/shared/ui/toaster.tsx        ← single file, design-driven
   │
   ├── re-exports `toast` from 'sonner'   ← identical API everywhere
   └── renders <SonnerToaster> with:
       • position from @eikon:variant(toastPosition=...) markers
       • classNames using CSS design tokens (--color-card, etc.)
```

The toast **styling** is design-driven — it reads CSS tokens
(`--color-card`, `--color-border`, `--radius-md`, `--surface-border-width`)
that each design preset already overrides. No per-toast-style files exist;
the active `design` preset controls the look automatically.

The only user-facing toast config is **position** (`--toast-position`):
`top-right` (default), `top-center`, `bottom-center`, `bottom-right`.

## How position wiring works

Position is selected at scaffold time via `--toast-position <value>`.
Inside `toaster.tsx`, the `@eikon:variant(toastPosition=...)` markers
narrow the array to one entry:

```tsx
const POSITION = [
  // @eikon:variant(toastPosition=top-right) begin
  'top-right',
  // @eikon:variant(toastPosition=top-right) end
  // @eikon:variant(toastPosition=top-center) begin
  'top-center',
  // ...
].at(0)! as Position;
```

After strip, only the chosen position string survives.

## Decision tree — which task am I doing?

```
Is the user asking to …
├── "move toasts to the bottom" / "change position"
│       → Task A: change the default position
├── "make toasts rounder / add blur / tweak styling"
│       → Task B: edit classNames in toaster.tsx
├── "remove the close button" / "change duration"
│       → Task C: edit Sonner props
└── "switch to react-hot-toast / radix-ui"
        → Task D: library swap (rare)
```

---

## Task A — change the default position

Two places:

1. **CLI default** — edit
   [packages/create-eikon-react/src/strip-features.ts](../../../../create-eikon-react/src/strip-features.ts)
   `DEFAULT_VARIANTS.toastPosition`:

   ```ts
   toastPosition: 'bottom-center',   // ← was 'top-right'
   ```

2. **Playground default** — edit
   [packages/preview-site/src/lib/params-schema.ts](../../../../preview-site/src/lib/params-schema.ts)
   the `toastPosition` param's `default` field.

---

## Task B — tweak toast styling

Edit `src/shared/ui/toaster.tsx`, specifically the `toastOptions.classNames`
object. Use design tokens so the style responds to presets and dark mode:

```tsx
toastOptions={{
  classNames: {
    toast: 'rounded-[var(--radius-md)] border-[length:var(--surface-border-width)] ...',
    title: 'text-sm font-medium',
    description: 'text-xs text-[var(--color-muted-foreground)]',
  },
}}
```

---

## Task C — change Sonner props

Edit the `<SonnerToaster>` props in `src/shared/ui/toaster.tsx`:
`richColors`, `closeButton`, `expand`, `duration`, `offset`, `gap`,
`visibleToasts`, `theme`, etc. See Sonner docs for the full list.

---

## Task D — switch the underlying library (advanced)

Only when explicitly requested. Keep the dispatcher surface intact:

1. Add new library, remove sonner.
2. Rewrite `toaster.tsx` to render the new library's provider.
3. Write an adapter that exports a `toast` object with the same
   method signatures (`success`, `error`, `info`, `promise`, `message`).
4. Run `pnpm lint && pnpm typecheck && pnpm test`.

---

## Immutable rules

1. **The dispatcher exports are fixed.** Always re-exports `Toaster`
   (the component) AND `toast` (the imperative API). Feature code
   imports only from `@/shared/ui/toaster`.
2. **Style tokens over hardcoded values.** Card colours, borders, and
   shadows reference design tokens so presets and dark mode flow through.
3. **Single mount point.** `<Toaster />` is mounted in
   `src/app/providers.tsx` — never add a second.

## Common mistakes

- **Hard-coding position in business code.** Don't use Sonner's per-call
  `position` override. The global position should win.
- **Adding a `<Toaster>` elsewhere.** Renders duplicate toasts.

## See also

- [src/shared/ui/toaster.tsx](../../../src/shared/ui/toaster.tsx)
- [src/app/providers.tsx](../../../src/app/providers.tsx)
- [packages/create-eikon-react/src/strip-features.ts](../../../../create-eikon-react/src/strip-features.ts)
