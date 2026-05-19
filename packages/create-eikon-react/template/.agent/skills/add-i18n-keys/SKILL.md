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

## Completion checklist

- [ ] Key added to **every** locale file.
- [ ] Key order is consistent across locales.
- [ ] Used via `t('namespace.key')`; no hard-coded string remains.
- [ ] Interpolation placeholders use `{{name}}` syntax.

## Common mistakes

- Adding a key to `en.json` but not `zh.json` (i18next will fall back to the key string in the UI). This is detectable by grepping for `t('x.y.z')` and confirming every locale file contains the path.
- Concatenating translated strings (`t('a') + t('b')`). Compose at the i18n level with a single key + placeholders.
- Putting copy in a component-level `const labels = { ... }`. That bypasses i18n entirely.
