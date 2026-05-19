---
id: add-i18n-keys
title: Add translation keys for new copy
description: Add or update keys in every locale file under src/shared/i18n/locales/, then consume them via useTranslation.
keywords: [i18n, translation, locale, copy, strings, text]
applies_to: ["src/shared/i18n/locales/**", "src/features/**", "src/app/**"]
---

# Skill: add i18n keys

Use whenever new user-visible copy enters the codebase. Per [rules/60-i18n.md](../../rules/60-i18n.md), no visible string may be hard-coded.

## Step list

1. **Choose the namespace.** Use the owning feature name as the top-level key: `home.*`, `counter.*`, `auth.*`. If the string is truly app-shell-wide, use `app.*`.

2. **Choose a key name.** camelCase leaf, describing intent rather than location: `submit`, `confirmDelete`, `toastSaved`. Avoid `text1`, `label`, `value`.

3. **Add the key to every locale file.** Files: `src/shared/i18n/locales/en.json`, `src/shared/i18n/locales/zh.json`, and any future locales.

   ```jsonc
   // en.json
   {
     "counter": {
       "title": "Counter demo",
       // … existing keys
       "yourNewKey": "English value with {{interpolation}}"
     }
   }

   // zh.json
   {
     "counter": {
       "title": "计数器示例",
       "yourNewKey": "中文翻译，带 {{interpolation}}"
     }
   }
   ```

   Keep the key order consistent across locale files for easier diffs.

4. **Consume with `useTranslation`** in the component:

   ```tsx
   const { t } = useTranslation();
   // …
   <p>{t('counter.yourNewKey', { interpolation: someValue })}</p>
   ```

5. **For pluralization**, use i18next's `_one` / `_other` suffix only when needed:

   ```jsonc
   {
     "counter": {
       "items_one": "{{count}} item",
       "items_other": "{{count}} items"
     }
   }
   ```

   ```tsx
   t('counter.items', { count: n });
   ```

## `@eikon:feature(i18n)` markers

The i18n integration itself is an optional feature (the CLI's `--no-i18n` strips it). Two marker forms appear in source — both wrap content with `// @eikon:feature(<name>) begin` / `// @eikon:feature(<name>) end` lines, plus a `// @eikon:feature(i18n) file` form for file-level gating.

- `@eikon:feature(i18n)` — **removed when stripped**. Wraps the `useTranslation` import and the `const { t } = useTranslation();` line. After the strip there is no `t` in scope unless the matching `i18n:fallback` block is also present.
- `@eikon:feature(i18n:fallback)` — **uncommented when stripped**. Wraps a block of *commented-out* fallback code that defines a local `t` function. When `--no-i18n` runs, the strip removes the leading `//` from every line inside the block, turning it into a working hard-coded `t` shim. The visible JSX never changes.

The canonical shape (copy from [src/features/home/pages/HomePage.tsx](../../../src/features/home/pages/HomePage.tsx)):

```tsx
// @eikon:feature(i18n) begin
import { useTranslation } from 'react-i18next';
// @eikon:feature(i18n) end

function MyPage() {
  // @eikon:feature(i18n) begin
  const { t } = useTranslation();
  // @eikon:feature(i18n) end

  // @eikon:feature(i18n:fallback) begin
  // const t = (k: string) =>
  //   ({
  //     'myFeature.title': 'My title',
  //     'myFeature.body': 'Body copy here',
  //   })[k] ?? k;
  // @eikon:feature(i18n:fallback) end

  return <h1>{t('myFeature.title')}</h1>;
}
```

Rules when adding new copy to a component that already has the markers:

- Add the new key + value to the commented-out fallback object so the stripped variant still renders something sensible.
- Match the same English copy the locale `en.json` uses (or a sensible default for non-English-default keys).
- If the component does not yet have the fallback block, add both blocks together — never add the `useTranslation` block without the fallback in a component that needs to render text.

When `--no-i18n` is NOT a concern for your component (e.g. internal devtools, error overlays), you may omit the fallback block; just include the bare `useTranslation` markers so a future strip still compiles. If the file is *entirely* i18n-only (like `src/shared/i18n/index.ts`), use `// @eikon:feature(i18n) file` as the very first line of the file — the strip removes the file altogether.

## Completion checklist

- [ ] Key added to **every** locale file.
- [ ] Key order is consistent across locales.
- [ ] Used via `t('namespace.key')`; no hard-coded string remains.
- [ ] Interpolation placeholders use `{{name}}` syntax.

## Common mistakes

- Adding a key to `en.json` but not `zh.json` (i18next will fall back to the key string in the UI). This is detectable by grepping for `t('x.y.z')` and confirming every locale file contains the path.
- Concatenating translated strings (`t('a') + t('b')`). Compose at the i18n level with a single key + placeholders.
- Putting copy in a component-level `const labels = { ... }`. That bypasses i18n entirely.
