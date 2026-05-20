---
id: add-modal
title: Add a Modal / overlay surface
description: Decide between Dialog, Sheet, Command palette, or a feature-level "global modal" (mounted at provider scope); then ship it with the right primitive, store binding, i18n, tests, and trigger placement. Covers confirmation prompts, forms, fullscreen sheets, command palettes, and globally-openable modals like the SignInModal.
keywords:
  [
    modal,
    dialog,
    sheet,
    drawer,
    command palette,
    cmdk,
    confirmation,
    overlay,
    auth modal,
    sign in modal,
    global modal,
    ⌘k,
  ]
applies_to:
  - "src/shared/ui/dialog.tsx"
  - "src/shared/ui/sheet.tsx"
  - "src/shared/ui/command.tsx"
  - "src/features/**/components/**"
---

# Skill: add a Modal / overlay surface

Use whenever the user asks to "add a modal", "open a dialog", "show a
confirmation", "add a side drawer", "build a command palette", or
"trigger the sign-in flow from anywhere".

The template ships three Modal-shaped primitives plus one fully-built
feature-level Modal — pick by intent, not by aesthetics.

## Decision tree

```
What's the overlay for?
│
├─ "Centered card over the page"
│   (info, form, confirmation, sized panels)
│           └─► Dialog        @/shared/ui/dialog
│
├─ "Slides in from a screen edge"
│   (mobile nav, filters, settings inspector, status banner)
│           └─► Sheet         @/shared/ui/sheet
│
├─ "Keyboard-first searchable menu (⌘K, action menu)"
│           └─► Command       @/shared/ui/command       (examples-feature gated; see below)
│
└─ "Globally-openable surface — any route can trigger it"
    (auth, role switcher, app-wide composer)
            └─► Feature-level Modal pattern (mirror features/auth/SignInModal)
```

If two answers match, prefer the **lower one in the tree** — it's
strictly more specific (Sheet over Dialog when the entry direction
matters; Command over Dialog when the surface is keyboard-driven;
feature-level Modal when the trigger needs to live outside the
mounting tree).

## Quick recipes

### 1. Confirmation Dialog (destructive action)

The exact pattern used by `<TaskCard onDelete={…} />` — see
[src/features/tasks/components/TaskCard.tsx](../../src/features/tasks/components/TaskCard.tsx).

1. Add a `Trash2` icon button next to the row primary content; stop
   propagation in its `onClick` so it doesn't bubble into the row's
   own activate handler.
2. Hold an `open` state in the component (`React.useState`).
3. Render `<Dialog open onOpenChange>` with `<DialogContent>` →
   `<DialogTitle>` + `<DialogDescription>` + a `<DialogFooter>`
   containing `<Button variant="outline">Cancel</Button>` and
   `<Button variant="destructive">Delete</Button>`.
4. The destructive button calls the parent-supplied
   `onDelete()` (intent callback). The parent owns the store
   mutation + toast — do NOT call `tasksStore.deleteTask()` directly
   from the row; keep the row presentational.
5. i18n keys live under the feature's namespace
   (`tasks.delete.confirmTitle`, `tasks.delete.confirmBody`,
   `tasks.delete.cancel`, `tasks.delete.confirm`). Mirror to every
   shipped locale.
6. Tests cover: button hidden when callback omitted, click doesn't
   bubble to the row, `onDelete` only fires after confirm, cancel
   does NOT fire it. Use `screen.getByRole('dialog')` + `within(dialog)`
   to scope queries.

### 2. Form Dialog

See the `FormDialog` helper in
[src/features/examples/pages/DialogShowcasePage.tsx](../../src/features/examples/pages/DialogShowcasePage.tsx).

1. Local `useState` per input — never push form values to a global
   store unless the form intentionally crosses routes.
2. Disable the primary action while the validation predicate fails
   (`disabled={note.trim().length === 0}`).
3. Reset local state on close (either inside an `onOpenChange`
   handler, or via an `useEffect` keyed on `open`).
4. Submit handler: call the service, fire a success toast, close the
   Modal — in that order. Errors stay inline (re-throw from the
   service call) so the Modal stays open and the user can retry.

### 3. Sized Dialog

Override `<DialogContent className="sm:max-w-{sm|md|lg|2xl}">`. The
default is `max-w-lg`. For fullscreen, override the centring
preset too (see `DialogShowcasePage`'s `fullscreen` section):

```tsx
<DialogContent
  className="left-0 top-0 h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 rounded-none p-0"
>
```

Use sizes by intent: `sm` for confirmation prompts, `md` for short
forms, `lg` for multi-section forms, `2xl` for content surfaces,
fullscreen for mobile-shell flows.

### 4. Nested Dialog

Two `<Dialog>` roots: outer parent, inner confirm. Both controlled,
both with their own `open` state. Closing the inner one leaves the
outer open — Radix's portal stack handles z-index automatically.
Pattern: see `NestedDialogDemo` in
[src/features/examples/pages/DialogShowcasePage.tsx](../../src/features/examples/pages/DialogShowcasePage.tsx).

### 5. Side Sheet (drawer)

```tsx
<Sheet side="right">
  <SheetTrigger asChild><Button>Open</Button></SheetTrigger>
  <SheetContent description="…">
    <SheetHeader><SheetTitle>…</SheetTitle></SheetHeader>
    <SheetBody>…</SheetBody>
    <SheetFooter>…</SheetFooter>
  </SheetContent>
</Sheet>
```

- The `description` prop satisfies Radix's a11y contract; pass `""`
  to opt out explicitly when no description is appropriate.
- `SheetBody` already owns its own `overflow-y-auto` — long content
  scrolls independently while header/footer stay pinned.
- For `side="bottom"` / `side="top"`, the panel grows to fit content
  up to `max-h-[80vh]` — no extra config needed.

### 6. Command palette (⌘K)

```tsx
const [open, setOpen] = React.useState(false);

React.useEffect(() => {
  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      setOpen((o) => !o);
    }
  }
  document.addEventListener('keydown', onKeyDown);
  return () => document.removeEventListener('keydown', onKeyDown);
}, []);

return (
  <CommandDialog open={open} onOpenChange={setOpen}>
    <CommandInput placeholder="Type a command…" />
    <CommandList>
      <CommandEmpty>No results</CommandEmpty>
      <CommandGroup heading="Suggestions">
        <CommandItem onSelect={() => runCommand(...)}>
          <Plus /> New task <CommandShortcut>⌘N</CommandShortcut>
        </CommandItem>
        …
      </CommandGroup>
      <CommandSeparator />
      <CommandGroup heading="Navigation">…</CommandGroup>
    </CommandList>
  </CommandDialog>
);
```

Important:

- `<Command>` is gated by `@eikon:feature(examples) file` and `cmdk`
  is pruned from `package.json` when the `examples` feature is
  stripped. To ship a command palette in a scaffolded project, copy
  the file, drop the marker, and add `cmdk` back to dependencies.
- The shortcut listener must `preventDefault()` on match — Chrome
  binds ⌘K to the address bar otherwise.
- Items invoke `onSelect`, not `onClick` — `cmdk` only fires the
  former through keyboard navigation.

### 7. Feature-level "global Modal" (mirror SignInModal)

When the trigger needs to live anywhere — topbar, a deep page, a
toast action — mount the Modal at provider scope and drive it from
a store. See [src/features/auth](../../src/features/auth) for the
canonical implementation.

Required pieces:

1. **Store** (`features/<name>/store/<name>Store.ts`) — vanilla zustand
   with at minimum `{ open, mode?, isSubmitting, error, openModal,
   closeModal, …ops }`. Reuse the `authStore` shape.
2. **Selectors** (`features/<name>/selectors/`) — one-field hooks
   (`useShowXModal`, `useXMode`, …) plus an actions bundle
   (`useXActions`) and a v1-style shortcut (`useOpenXModal`).
3. **Modal primitive** (`features/<name>/components/XModal.tsx`) —
   fully **controlled**: `open / onOpenChange / mode / onModeChange`.
   No store knowledge. Renders the Dialog + inputs/tabs.
4. **Mount wrapper** (`features/<name>/components/XModalMount.tsx`)
   — wires the controlled Modal to the store + handles toasts +
   pre-loads the feature's i18n namespace via
   `loadNamespace('<name>')` in a `useEffect`.
5. **Trigger button** (optional, e.g. `SignInButton`) — pulled out
   when more than one layout needs to drop the trigger into its
   chrome. See
   [features/auth/components/SignInButton.tsx](../../src/features/auth/components/SignInButton.tsx).
6. **Provider mount** — add `<XModalMount />` next to `<Toaster />`
   in [src/app/providers.tsx](../../src/app/providers.tsx).
7. **Public barrel** (`features/<name>/index.ts`) — export the
   selectors, the Mount, and the trigger; **don't** export the
   internal store directly.

Tests follow the auth feature shape:

- `__tests__/store/<name>Store.test.ts` — exercise ops via
  `store.getState()` (no UI). Always `vi.mock('@/shared/supabase', …)`
  and `vi.mock('@/shared/services', () => ({ serviceConfig: { useMock: true } }))`
  at the top, otherwise the marker-gated supabase import in the
  factory blows up on `WebSocket` in happy-dom.
- `__tests__/components/<X>Modal.test.tsx` — render the controlled
  Modal inside a tiny `Harness` that owns local state; assert on
  rendered roles + that the supplied `onSubmit` / `onOAuth`
  callbacks fire with the right payload.

## Dialog vs Sheet vs Drawer — final tiebreakers

| Question                                              | Reach for             |
| ----------------------------------------------------- | --------------------- |
| Does the surface centre over the page?                | Dialog                |
| Does it slide in from an edge (mobile nav, settings)? | Sheet                 |
| Is it keyboard-driven with a search input?            | Command (CommandDialog) |
| Is the trigger fixed (one place, one route)?         | Local Dialog / Sheet  |
| Can anything in the app open it?                      | Feature-level Modal   |
| Does the user need to dismiss part of it independently? (e.g. confirm-on-top) | Nested Dialog |

## Don'ts

- **Don't** put `toast.success(...)` calls inside the Modal primitive
  itself. Either the Mount wrapper or the parent owns the side
  effect; the primitive stays presentational.
- **Don't** bypass `<Dialog>` and reach straight into
  `@radix-ui/react-dialog` — our wrapper attaches the AnimatePresence
  exit choreography you'd otherwise lose.
- **Don't** keep Modal subtrees mounted "for performance" — our
  `<DialogContent>` is conditionally rendered on purpose; bringing
  the subtree back on every open is cheap compared to the cost of
  the always-mounted listeners + portal target.
- **Don't** add a new top-level CSS file or design tokens for a
  Modal. Re-use the `--color-card`, `--color-border`,
  `--color-destructive` etc. tokens like every other primitive.
- **Don't** invent a new `--ui` axis to swap Modal implementations.
  The template ships ONE Modal stack (animate-ui / Radix / motion);
  showcase variation by composing the primitive differently, not by
  multiplying it.
