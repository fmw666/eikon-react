/**
 * @file sync-ui-snapshots.fs.mjs
 * @description Internal filesystem + source-normalisation helpers for
 *   `sync-ui-snapshots.mjs`. Not a public entry point — imported only by
 *   the sibling sync script and its co-located helper modules.
 */

import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { FILENAME_REWRITE, TYPE_ONLY_IMPORT_NAMES } from './sync-ui-snapshots.constants.mjs';

export async function pathExists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

export function sortObj(obj) {
  const out = {};
  for (const k of Object.keys(obj).sort()) out[k] = obj[k];
  return out;
}

export async function copyTreeWithRewrites(src, dest) {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });
  let count = 0;
  for (const e of entries) {
    const s = path.join(src, e.name);
    // Skip the placeholder index.css we wrote into the temp project so
    // the registry CLI didn't fail on its absence — it's not part of
    // the snapshot.
    if (e.name === 'index.css' && path.basename(path.dirname(s)) === 'styles') continue;
    if (e.isDirectory()) {
      const sub = await copyTreeWithRewrites(s, path.join(dest, e.name));
      count += sub;
    } else if (e.isFile()) {
      const renamed = FILENAME_REWRITE[e.name] ?? e.name;
      const d = path.join(dest, renamed);
      let body = await readFile(s, 'utf8');
      // If we renamed sonner → toaster, rewrite project-internal import
      // paths to the renamed file (e.g. `@/shared/ui/sonner` →
      // `@/shared/ui/toaster`, `'./sonner'` → `'./toaster'`). DO NOT
      // touch bare `'sonner'` imports — that's the npm package name and
      // must stay intact.
      if (e.name !== renamed) {
        body = body
          .replace(/(@\/shared\/ui\/)sonner\b/g, '$1toaster')
          .replace(/(['"])\.\/sonner(['"])/g, '$1./toaster$2');
      }
      body = normaliseSnapshotSource(body);
      await writeFile(d, body, 'utf8');
      count += 1;
    }
  }
  return count;
}

// Post-process upstream registry source so it survives the template's
// strict tsconfig flags. Two narrow rewrites, both safe to re-apply:
//
// 1. Drop `import * as React from "react"` when nothing in the file
//    references `React.` — registry files include the side-import for
//    legacy compatibility, but with `jsx: "react-jsx"` it isn't needed,
//    and `noUnusedLocals` (TS6133) blows up on it.
//
// 2. Mark known type-only re-exports as `type`-imports — needed under
//    `verbatimModuleSyntax: true` (TS1484). See TYPE_ONLY_IMPORT_NAMES
//    in sync-ui-snapshots.constants.mjs.
export function normaliseSnapshotSource(body) {
  let next = body;

  // (1) Drop unused `import * as React from "react"`
  const reactImport = /^import \* as React from ['"]react['"];?\s*\n/m;
  if (reactImport.test(next)) {
    const withoutImport = next.replace(reactImport, '');
    if (!/\bReact\./.test(withoutImport)) {
      next = withoutImport;
    }
  }

  // (1b) If `React.` is referenced but no React import remains, prepend
  //      a type-only import. shadcn's toaster uses `React.CSSProperties`
  //      without importing React (it leans on the legacy global, which
  //      isn't there under `jsx: react-jsx`).
  if (/\bReact\./.test(next) && !/from ['"]react['"]/.test(next)) {
    next = `import type * as React from 'react';\n` + next;
  }

  // (2) Convert known type-only names inside non-type imports to
  //     `type X` named imports. Matches `{ A, X, B }` → `{ A, type X, B }`
  //     when the import statement isn't already `import type {...}`.
  for (const name of TYPE_ONLY_IMPORT_NAMES) {
    const re = new RegExp(
      `(import\\s+(?!type\\s)\\{[^}]*?)\\b(?<!type )${name}\\b([^}]*\\}\\s*from\\s+['"][^'"]+['"];?)`,
      'g'
    );
    next = next.replace(re, (_match, before, after) => `${before}type ${name}${after}`);
  }

  return next;
}
