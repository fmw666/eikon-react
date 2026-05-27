// Copy ../template-react/ -> ./template/, normalizing files that npm publish would
// otherwise drop or that would confuse a consumer (renaming .gitignore /
// .env.example to placeholder names; copy-template.ts restores them at scaffold
// time).
//
// IMPORTANT: This script runs from raw `node` BEFORE tsup compiles the CLI, so
// it cannot import the TS source-of-truth at packages/create-eikon-react/src/
// skip-list.ts. The literal below MUST stay in lock-step with
// `TEMPLATE_COPY_SKIP` over there. `src/__tests__/skip-list-parity.test.ts`
// asserts the two are equal — when adding/removing an entry, update BOTH.

import { cp, mkdir, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC = path.resolve(__dirname, '..', '..', 'template-react');
const DEST = path.resolve(__dirname, '..', 'template');

// MIRROR of TEMPLATE_COPY_SKIP — see header comment for the constraint.
// The parity test reads this file via `fs.readFile` and extracts the literal
// names with a regex; we deliberately keep the list as a single-line-per-entry
// array of string literals so that regex stays trivial.
const EXCLUDE = new Set([
  'node_modules',
  'dist',
  'coverage',
  '.vite',
  '.turbo',
  '.tsbuildinfo',
  '.preview-cache',
  '.git',
  'template-snapshots',
]);

async function main() {
  try {
    const st = await stat(SRC);
    if (!st.isDirectory()) throw new Error('not a directory');
  } catch {
    console.error(`[sync-template] source not found: ${SRC}`);
    process.exit(1);
  }

  await rm(DEST, { recursive: true, force: true });
  await mkdir(DEST, { recursive: true });

  // `fs.cp` with a filter is the fast path here: it's a single Node-level
  // recursive copy with concurrent IO, whereas the previous hand-rolled
  // version awaited each file in series. The filter sees absolute paths,
  // so we test the basename for exclusion.
  await cp(SRC, DEST, {
    recursive: true,
    filter: (source) => !EXCLUDE.has(path.basename(source)),
  });

  await renameIfExists(path.join(DEST, '.gitignore'), path.join(DEST, '_gitignore'));
  await renameIfExists(
    path.join(DEST, '.env.example'),
    path.join(DEST, '_env.example')
  );

  console.log(`[sync-template] synced ${SRC} -> ${DEST}`);
}

async function renameIfExists(from, to) {
  try {
    await rename(from, to);
  } catch (err) {
    if (err && err.code !== 'ENOENT') throw err;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
