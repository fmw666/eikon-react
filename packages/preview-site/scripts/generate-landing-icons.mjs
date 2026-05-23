/**
 * @file generate-landing-icons.mjs
 * @description Generate `src/landing/icons.ts` with inlined Iconify SVG body
 *              data for every icon used in the landing page hero sections.
 *
 * Why this exists
 * ----------------
 * `@iconify/react` defaults to fetching icons from `api.iconify.design` at
 * runtime. For the landing page that means ~20 blocking SVG requests on the
 * first paint, which destroys LCP on slow connections.
 *
 * Importing `@iconify-json/simple-icons/icons.json` or
 * `@iconify-json/lucide/icons.json` directly into the bundle would solve the
 * network problem but pull in ~5MB of icon data we don't need — Vite bundles
 * the whole JSON because tree-shaking can't reach into object lookups.
 *
 * So instead we run this script at author time, read just the SVG bodies we
 * actually need, and emit a tiny `addIcon()` call per icon. The generated
 * file is committed to the repo and imported as a side-effect from the
 * components that use these icons.
 *
 * Re-run after editing the `ICONS` arrays below:
 *
 *     pnpm --filter @eikon/preview run icons:generate
 *
 * The output is deterministic — diffs only when the icon list changes or
 * upstream icon data changes.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT_FILE = resolve(ROOT, 'src/landing/icons.ts');

/**
 * Names listed here mirror the `icon: 'simple-icons:<name>'` references in
 * `src/landing/sections/TechStackWall.tsx`. Keep them in sync.
 */
const SIMPLE_ICONS = [
  'react',
  'vite',
  'typescript',
  'tailwindcss',
  'reactquery',
  'reactrouter',
  'i18next',
  'vitest',
  'testinglibrary',
  'eslint',
  'prettier',
  'tauri',
  'capacitor',
  'supabase',
  'shadcnui',
];

/**
 * Names listed here mirror the `icon: 'lucide:<name>'` references in
 * `src/landing/sections/TechStackWall.tsx` and `PainPoints.tsx`.
 *
 * `terminal-square` is kept as the canonical Iconify name even though the
 * upstream lucide JSON has renamed it to `square-terminal`; alias resolution
 * below transparently handles the rename so component code can stay stable.
 */
const LUCIDE_ICONS = [
  'layers',
  'terminal-square',
  'list-tree',
  'package-search',
  'bot',
];

/**
 * Resolve `name` to its canonical icon record. Iconify JSON sets can route
 * lookups through `aliases[name] = { parent: 'canonical' }`; we follow that
 * chain (defensively bounded) and merge any per-alias transforms back onto
 * the parent body — for the icons we use this never produces transforms,
 * but the merge keeps us honest if a future addition does.
 */
function resolveIcon(set, name) {
  const visited = new Set();
  let currentName = name;
  let mergedTransform = {};

  while (!set.icons[currentName]) {
    if (visited.has(currentName)) {
      throw new Error(`Alias cycle while resolving '${name}'`);
    }
    visited.add(currentName);

    const alias = set.aliases && set.aliases[currentName];
    if (!alias || !alias.parent) {
      throw new Error(
        `Icon '${name}' not found in set (last lookup: '${currentName}')`,
      );
    }
    const { parent, ...transform } = alias;
    mergedTransform = { ...transform, ...mergedTransform };
    currentName = parent;
  }

  return {
    canonicalName: currentName,
    icon: set.icons[currentName],
    transform: mergedTransform,
  };
}

function loadSet(pkgPath) {
  const json = JSON.parse(readFileSync(pkgPath, 'utf8'));
  return {
    icons: json.icons || {},
    aliases: json.aliases || {},
    width: json.width || 16,
    height: json.height || 16,
  };
}

function emitCalls(prefix, set, names) {
  return names
    .map((name) => {
      const { canonicalName, icon, transform } = resolveIcon(set, name);
      const width = icon.width ?? transform.width ?? set.width;
      const height = icon.height ?? transform.height ?? set.height;
      const aliasNote =
        canonicalName === name ? '' : ` // canonical: ${canonicalName}`;
      // Use a JS string literal so we can safely include SVG content
      // containing quotes, newlines, etc. JSON.stringify gives us exactly
      // that with proper escaping.
      return `addIcon(${JSON.stringify(`${prefix}:${name}`)}, { body: ${JSON.stringify(icon.body)}, width: ${width}, height: ${height} });${aliasNote}`;
    })
    .join('\n');
}

const simpleIconsSet = loadSet(
  resolve(ROOT, 'node_modules/@iconify-json/simple-icons/icons.json'),
);
const lucideSet = loadSet(
  resolve(ROOT, 'node_modules/@iconify-json/lucide/icons.json'),
);

const header = `/**
 * @file icons.ts
 * @description Pre-registered Iconify icons used by the landing page.
 *
 * GENERATED FILE — do not edit by hand. Run \`pnpm run icons:generate\` to
 * regenerate after changing the icon list in
 * \`scripts/generate-landing-icons.mjs\`.
 *
 * Each \`addIcon()\` call inlines the canonical SVG body into the JS bundle,
 * which means \`<Icon icon="simple-icons:react" />\` resolves locally without
 * a network round trip to \`api.iconify.design\`. Import this module for its
 * side effects exactly once from any component that uses these icons.
 */

import { addIcon } from '@iconify/react';

`;

const body = [
  '// simple-icons set',
  emitCalls('simple-icons', simpleIconsSet, SIMPLE_ICONS),
  '',
  '// lucide set',
  emitCalls('lucide', lucideSet, LUCIDE_ICONS),
  '',
].join('\n');

mkdirSync(dirname(OUT_FILE), { recursive: true });
writeFileSync(OUT_FILE, header + body, 'utf8');

const totalBytes =
  emitCalls('simple-icons', simpleIconsSet, SIMPLE_ICONS).length +
  emitCalls('lucide', lucideSet, LUCIDE_ICONS).length;

console.log(
  `Wrote ${SIMPLE_ICONS.length + LUCIDE_ICONS.length} icons to ${OUT_FILE} (~${(totalBytes / 1024).toFixed(1)} KB of addIcon calls)`,
);
