---
id: add-i18n-keys
title: Add translation keys for new copy
description: Add or update keys in the owning feature's i18n namespace (or in shared/common for app-shell copy), then consume them via useTranslation(ns).
keywords: [i18n, translation, locale, copy, strings, text, namespace]
applies_to:
  - "src/features/**/i18n/**"
  - "src/shared/i18n/locales/**"
  - "src/features/**"
  - "src/app/**"
---

# Skill: add i18n keys

Use whenever new user-visible copy enters the codebase. Per
[rules/60-i18n.md](../../rules/60-i18n.md), no visible string may be
hard-coded.

## Step 0 — pick the namespace

```
Is the copy specific to one feature?
  └── YES → use that feature's namespace.
            Files: src/features/<feature>/i18n/{en,zh}.json
  └── NO  → use the `common` namespace.
            Files: src/shared/i18n/locales/{en,zh}/common.json
```

The namespace name **is** the feature directory name (no `tasks.` or
`counter.` prefix inside the JSON). The app-shell uses the default
`common` namespace.

If the copy is genuinely cross-feature (e.g. a "Sign out" button used
by header + sidebar + a feature settings page), still put it under
`common`. A feature-specific tweak of the same string belongs in the
feature's namespace and overrides via local context.

## Step 1 — add the key in every locale

Both `en.json` AND `zh.json` (and every future locale) MUST contain
the same set of keys. Keep the key order consistent across locales
for cleaner diffs.

```jsonc
// src/features/counter/i18n/en.json
{
  "title": "Counter demo",
  // … existing keys
  "yourNewKey": "English value with {{interpolation}}"
}

// src/features/counter/i18n/zh.json
{
  "title": "计数器示例",
  "yourNewKey": "中文翻译，带 {{interpolation}}"
}
```

- Leaf keys are **camelCase** (`toastIncreased`, not
  `toast_increased`).
- Interpolation uses `{{name}}` inside the value, never the key.
- Two-level nesting is the practical maximum: `status.pending`,
  `new.form.title` — stop there.

## Step 2 — consume with `useTranslation(<ns>)`

```tsx
const { t } = useTranslation('counter');       // ← bind to the ns
// …
<p>{t('yourNewKey', { interpolation: someValue })}</p>
```

App-shell components (anything in `src/app/`) use the default
`common` namespace:

```tsx
const { t } = useTranslation();                // default ns = 'common'
t('nav.home');
t('notFound.title');
```

## Step 3 — make sure the namespace is loaded

If the new key lives in an existing feature, its `routes.tsx` already
calls `loadNamespace('<feature>')` in `lazy()` — nothing more to do.

If you're introducing the **first** key for a brand-new feature, see
[add-feature/SKILL.md](../add-feature/SKILL.md) step "Wire i18n".
Briefly: create `i18n/{en,zh}.json` inside the feature folder, then
prefetch the namespace from the feature's `routes.tsx`:

```tsx
import { loadNamespace } from '@/shared/i18n';

const MyPage = lazy(async () => {
  const [mod] = await Promise.all([
    import('./pages/MyPage'),
    loadNamespace('myFeature'),
  ]);
  return { default: mod.MyPage };
});
```

The shared `<Suspense>` in
[RootLayout](../../../src/app/layouts/RootLayout.tsx) catches any
late-loading namespace, so even if you forget to prefetch the lazy
load still works — it just shows the route fallback marginally
longer.

## Step 4 — pluralisation (only when needed)

Use i18next's `_one` / `_other` suffix:

```jsonc
{
  "items_one": "{{count}} item",
  "items_other": "{{count}} items"
}
```

```tsx
t('items', { count: n });
```

Do not preemptively suffix every key — only when the rendered string
actually depends on plurality.

## `@eikon:feature(i18n)` markers

The i18n integration itself is an optional feature (the CLI's
`--no-i18n` strips it). Two marker forms appear in source — both
wrap content with `// @eikon:feature(<name>) begin` /
`// @eikon:feature(<name>) end` lines, plus a
`// @eikon:feature(i18n) file` form for file-level gating.

- `@eikon:feature(i18n)` — **removed when stripped**. Wraps the
  `useTranslation` import and the `const { t } = useTranslation('ns');`
  line. After the strip there is no `t` in scope unless the matching
  `i18n:fallback` block is also present.
- `@eikon:feature(i18n:fallback)` — **uncommented when stripped**.
  Wraps a block of *commented-out* fallback code that defines a local
  `t` function. When `--no-i18n` runs, the strip removes the leading
  `//` from every line inside the block, turning it into a working
  hard-coded `t` shim. The visible JSX never changes.

The canonical shape (copy from
[src/features/home/pages/HomePage.tsx](../../../src/features/home/pages/HomePage.tsx)):

```tsx
// @eikon:feature(i18n) begin
import { useTranslation } from 'react-i18next';
// @eikon:feature(i18n) end

function MyPage() {
  // @eikon:feature(i18n) begin
  const { t } = useTranslation('myFeature');
  // @eikon:feature(i18n) end

  // @eikon:feature(i18n:fallback) begin
  // const t = (k: string) =>
  //   ({
  //     title: 'My title',
  //     body: 'Body copy here',
  //   })[k] ?? k;
  // @eikon:feature(i18n:fallback) end

  return <h1>{t('title')}</h1>;
}
```

Rules when adding new copy to a component that already has the markers:

- Add the new key + value to the commented-out fallback object so the
  stripped variant still renders something sensible.
- **Keep the fallback keys unprefixed** — they shadow `t('key')` calls
  that themselves don't carry the namespace prefix in the new
  per-feature layout.
- Match the same English copy `en.json` uses (or a sensible default
  for non-English-default keys).
- If the component does not yet have the fallback block, add both
  blocks together — never add the `useTranslation` block without the
  fallback in a component that needs to render text.

When `--no-i18n` is NOT a concern for your component (e.g. internal
devtools, error overlays), you may omit the fallback block; just
include the bare `useTranslation` markers so a future strip still
compiles. If the file is *entirely* i18n-only (like
`src/shared/i18n/index.ts`), use `// @eikon:feature(i18n) file` as
the very first line of the file — the strip removes the file
altogether.

## Completion checklist

- [ ] Key lives in the right namespace (feature vs. `common`).
- [ ] Both `en.json` AND `zh.json` carry the new key, in matching
      order.
- [ ] Keys inside a feature file do NOT carry the feature name as a
      prefix.
- [ ] Used via `t('key')` with `useTranslation('<feature>')` bound at
      the top of the component.
- [ ] Interpolation placeholders use `{{name}}` syntax.
- [ ] If the namespace is brand-new, `routes.tsx` prefetches it via
      `loadNamespace('<feature>')`.

## Common mistakes

- Adding a key to `en.json` but not `zh.json` (i18next will fall back
  to the key string in the UI). Detect by grepping for `t('x.y.z')`
  and confirming every locale file contains the path.
- Concatenating translated strings (`t('a') + t('b')`). Compose at
  the i18n level with a single key + placeholders.
- Putting copy in a component-level `const labels = { ... }`. That
  bypasses i18n entirely.
- Keeping the old `t('tasks.index.title')` shape after moving copy
  into the feature's own namespace — the `tasks.` prefix is the ns
  itself now, drop it from the key.
- Lumping a feature's keys into `common` "to keep things simple" —
  that defeats the lazy-load split and re-creates the monolithic
  bundle problem.
