# TODO: Iconify Landing-Page Icons Offline Bundle

## Problem

`TechStackWall.tsx` and `PainPoints.tsx` use `@iconify/react` in runtime mode,
which fetches ~20 SVG icons from `api.iconify.design` on every first visit.
This adds ~20 network requests that block LCP/FCP on slow connections.

## Goal

Pre-register all 20 landing-page icons via `addIcon()` so they render from the
JS bundle with zero CDN requests. The iconify chunk should grow by only ~10-15KB
(the inlined SVG path data), NOT by megabytes.

## Approach

1. Create `src/landing/icons.ts` that calls `addIcon('prefix:name', { body, width, height })`
   for each icon with the SVG body string **hardcoded inline**.

2. **DO NOT** `import` from `@iconify-json/simple-icons/icons.json` or
   `@iconify-json/lucide/icons.json` — those files are 4.6MB and 542KB
   respectively and Vite will bundle them entirely, bloating the iconify chunk
   from 18KB to 5.3MB.

3. Add `import './icons'` as a side-effect import in `TechStackWall.tsx` and
   `PainPoints.tsx`.

4. Icons used only behind React.lazy (e.g. `vscode-icons:*` in FileExplorer)
   stay runtime-fetched — they don't affect initial paint.

## Icons to Register

**simple-icons (prefix: `simple-icons`, 24x24):**
react, vite, typescript, tailwindcss, reactquery, reactrouter,
i18next, vitest, testinglibrary, eslint, prettier, tauri,
capacitor, supabase, shadcnui

**lucide (prefix: `lucide`, 24x24):**
layers, terminal-square (alias for square-terminal), list-tree,
package-search, bot

## How to Extract Icon Data

```bash
cd packages/preview-site
node -e "
const si = require('@iconify-json/simple-icons/icons.json');
const names = ['react','vite','typescript','tailwindcss','reactquery','reactrouter','i18next','vitest','testinglibrary','eslint','prettier','tauri','capacitor','supabase','shadcnui'];
for (const n of names) {
  const i = si.icons[n];
  if (i) console.log(\`addIcon('simple-icons:\${n}', { body: \\\`\${i.body}\\\`, width: 24, height: 24 });\`);
}
"
```

Same pattern for lucide (handle `terminal-square` alias → `square-terminal`).

## Verification

- `pnpm exec vite build` — iconify chunk should be ~25-30KB (18KB runtime + ~10KB icon data), NOT 5MB+
- Network tab: no `api.iconify.design` requests on initial page load
- All 20 icons render immediately without flash
