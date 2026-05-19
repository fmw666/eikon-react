import { cp, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

interface CopyOptions {
  src: string;
  dest: string;
  projectName: string;
}

const SKIP_NAMES = new Set([
  'node_modules',
  'dist',
  'coverage',
  '.vite',
  '.turbo',
  '.tsbuildinfo',
  // Defensive: if a stale `.preview-cache/` ever slips into the published
  // tarball, still don't pour it into the user's scaffolded project.
  '.preview-cache',
]);

/**
 * Copy the template tree to `dest`, then:
 *   - rewrite package.json's "name"
 *   - rename "_gitignore" / "_env" placeholder files to their dot-prefixed forms
 *     (npm strips real .gitignore from publishes; this is the standard workaround)
 *
 * The template tree itself uses real ".gitignore" / ".env.example" because it is
 * not published as a tarball; the publishable copy under create-eikon-react/template
 * is produced by scripts/sync-template.mjs which already handles the rename.
 */
export async function copyTemplate(opts: CopyOptions): Promise<void> {
  await cp(opts.src, opts.dest, {
    recursive: true,
    filter: (source) => {
      const base = path.basename(source);
      return !SKIP_NAMES.has(base);
    },
  });

  // npm sometimes strips top-level .gitignore from the tarball; the synced
  // template uses placeholder names that we restore on copy.
  await safeRename(opts.dest, '_gitignore', '.gitignore');
  await safeRename(opts.dest, '_env.example', '.env.example');

  const pkgPath = path.join(opts.dest, 'package.json');
  const raw = await readFile(pkgPath, 'utf8');
  const pkg = JSON.parse(raw) as Record<string, unknown>;
  pkg.name = opts.projectName;
  pkg.version = '0.1.0';
  pkg.private = true;
  delete pkg.description;
  await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
}

async function safeRename(dir: string, from: string, to: string): Promise<void> {
  const fromPath = path.join(dir, from);
  const toPath = path.join(dir, to);
  try {
    await rename(fromPath, toPath);
  } catch {
    // Either the placeholder did not exist (template already has the dot file)
    // or the target already exists. Either way, nothing to do.
  }
}
