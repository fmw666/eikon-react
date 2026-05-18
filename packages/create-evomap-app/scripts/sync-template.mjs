// Copy ../template-react/ -> ./template/, normalizing files that npm publish would
// otherwise drop or that would confuse a consumer (renaming .gitignore /
// .env.example to placeholder names; copy-template.ts restores them at scaffold
// time).

import { cp, mkdir, readdir, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC = path.resolve(__dirname, '..', '..', 'template-react');
const DEST = path.resolve(__dirname, '..', 'template');

const EXCLUDE = new Set([
  'node_modules',
  'dist',
  '.vite',
  'coverage',
  '.turbo',
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

  await copyTree(SRC, DEST);
  await renameIfExists(path.join(DEST, '.gitignore'), path.join(DEST, '_gitignore'));
  await renameIfExists(
    path.join(DEST, '.env.example'),
    path.join(DEST, '_env.example')
  );

  console.log(`[sync-template] synced ${SRC} -> ${DEST}`);
}

async function copyTree(src, dest) {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    if (EXCLUDE.has(entry.name)) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyTree(s, d);
    } else if (entry.isFile() || entry.isSymbolicLink()) {
      await cp(s, d);
    }
  }
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
