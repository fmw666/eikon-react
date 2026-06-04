/**
 * @file sync-ui-snapshots.patchers.mjs
 * @description Internal post-harvest patchers + the animate-ui shim
 *   generator for `sync-ui-snapshots.mjs`. Not a public entry point —
 *   imported only by the sibling sync script.
 *
 *   Each patcher returns `{ changed: boolean, reason?: string }`. The
 *   driver (`assertPatched`) aborts when a patch we expected to apply
 *   silently no-op'd — the most dangerous failure mode here is "upstream
 *   layout changed → regex didn't match → patcher returned without
 *   touching the file → snapshot ships missing the project's contract".
 *   `changed: false` can ALSO mean "patch already applied" (idempotent
 *   re-run), but on a fresh npx-shadcn-add harvest that's also a sign
 *   something is wrong, so either case fails loud.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { ANIMATE_UI_NATIVE_TARGETS } from './sync-ui-snapshots.constants.mjs';
import { pathExists } from './sync-ui-snapshots.fs.mjs';

export function assertPatched(ui, name, result) {
  if (!result || typeof result.changed !== 'boolean') {
    throw new Error(`[${ui}] ${name}: expected { changed: boolean } result`);
  }
  if (!result.changed) {
    throw new Error(
      `[${ui}] ${name}: did not change the snapshot (reason: ${result.reason ?? 'unknown'}). ` +
        `Either the upstream registry layout changed and the regex needs updating, ` +
        `or the file the patcher targets is missing from the harvest.`
    );
  }
}

export async function ensureToasterExportsToast(dest) {
  const toasterPath = path.join(dest, 'src', 'shared', 'ui', 'toaster.tsx');
  if (!(await pathExists(toasterPath))) {
    return { changed: false, reason: 'toaster.tsx missing from snapshot' };
  }
  const body = await readFile(toasterPath, 'utf8');
  if (/\bexport\s*\{\s*toast\s*\}/.test(body)) {
    // Upstream already exports `toast` — no patch needed. Treat as a
    // legitimate change so the driver doesn't false-alarm.
    return { changed: true, reason: 'upstream already exports toast' };
  }
  const trailingNewline = body.endsWith('\n') ? '' : '\n';
  const appended =
    body +
    trailingNewline +
    `// Re-export the imperative \`toast()\` helper from sonner so the\n` +
    `// template's \`@/shared/ui/toaster\` contract matches across all\n` +
    `// \`--ui\` choices. Inserted by sync-ui-snapshots.mjs.\n` +
    `export { toast } from 'sonner';\n`;
  await writeFile(toasterPath, appended, 'utf8');
  return { changed: true };
}

export async function ensureCardHoverableClass(dest) {
  const cardPath = path.join(dest, 'src', 'shared', 'ui', 'card.tsx');
  if (!(await pathExists(cardPath))) {
    return { changed: false, reason: 'card.tsx missing from snapshot' };
  }
  const body = await readFile(cardPath, 'utf8');
  if (/\bcardHoverableClass\b/.test(body)) {
    return { changed: true, reason: 'upstream already exports cardHoverableClass' };
  }
  const trailingNewline = body.endsWith('\n') ? '' : '\n';
  const appended =
    body +
    trailingNewline +
    `// Opt-in hover-lift class consumed by the template's HomePage,\n` +
    `// TaskCard and CardShowcase. Defined here so the template's\n` +
    `// \`@/shared/ui/card\` contract is identical across all \`--ui\`\n` +
    `// choices. Inserted by sync-ui-snapshots.mjs.\n` +
    `export const cardHoverableClass =\n` +
    `  'transition-shadow duration-200 hover:[box-shadow:var(--surface-hover-shadow)] active:[box-shadow:var(--surface-active-shadow)]';\n`;
  await writeFile(cardPath, appended, 'utf8');
  return { changed: true };
}

export async function ensureCardTitleIsHeading(dest) {
  const cardPath = path.join(dest, 'src', 'shared', 'ui', 'card.tsx');
  if (!(await pathExists(cardPath))) {
    return { changed: false, reason: 'card.tsx missing from snapshot' };
  }
  const body = await readFile(cardPath, 'utf8');
  // Already an h-element? Upstream did the right thing on its own.
  if (/function\s+CardTitle[\s\S]*?<h[1-6]\b/.test(body)) {
    return { changed: true, reason: 'upstream already renders CardTitle as <h*>' };
  }
  // Use [\s\S]*? for cross-line content — `[^)]*?` stops short on the
  // `)` inside the type annotation. We match the function signature's
  // `<"div">` annotation and the JSX `<div ... />` that follows, and
  // rewrite both to h3.
  const next = body.replace(
    /(function\s+CardTitle\s*\([\s\S]*?React\.ComponentProps<")div("\s*>[\s\S]*?return\s*\(\s*)<div([\s\S]*?\/>)/,
    '$1h3$2<h3$3'
  );
  if (next === body) {
    // Pattern didn't match. The most likely cause is an upstream layout
    // change (shadcn switched away from `React.ComponentProps<"div">`
    // or stopped using a single `return (<div ... />)` body). Bail loud
    // — silently shipping a snapshot whose CardTitle is still a `<div>`
    // would break the template's structural a11y test in a way that's
    // hard to trace back to this script.
    return {
      changed: false,
      reason:
        'CardTitle regex did not match — upstream shadcn layout likely changed; ' +
        'inspect template-snapshots/<ui>/src/shared/ui/card.tsx and update the regex.',
    };
  }
  await writeFile(cardPath, next, 'utf8');
  return { changed: true };
}

export async function generateAnimateUiShims(dest) {
  const shimDir = path.join(dest, 'src', 'shared', 'ui');
  await mkdir(shimDir, { recursive: true });
  let count = 0;
  for (const [filename, targetRel] of Object.entries(ANIMATE_UI_NATIVE_TARGETS)) {
    const targetAbs = path.join(dest, 'src', `${targetRel}.tsx`);
    // Only write the shim when animate-ui actually shipped the
    // component. If the registry CLI fell back to plain shadcn (no
    // native animate-ui version available), shadcn's file at
    // src/shared/ui/<filename> is the answer — leave it alone.
    if (!(await pathExists(targetAbs))) continue;
    const shimPath = path.join(shimDir, filename);
    const importPath = `@/${targetRel}`;
    const body =
      `// Generated by sync-ui-snapshots.mjs — re-export shim around\n` +
      `// animate-ui's native component at ${importPath}. Edit the\n` +
      `// underlying file (or pick \`--ui custom\`/\`--ui shadcn\`) to\n` +
      `// change behaviour; this file is overwritten on next sync.\n` +
      `export * from '${importPath}';\n`;
    await writeFile(shimPath, body, 'utf8');
    count += 1;
  }
  return { count };
}
