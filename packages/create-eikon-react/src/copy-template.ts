import { cp, readFile, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { TEMPLATE_COPY_SKIP } from './skip-list.js';

interface CopyOptions {
  src: string;
  dest: string;
  projectName: string;
}

/**
 * Files that may contain the literal `__PROJECT_NAME__` placeholder which
 * should be rewritten to the user-supplied project name on scaffold.
 *
 * Kept as an explicit allow-list rather than walking every file because:
 *
 *   1. The placeholder is intentionally narrow — only the desktop /
 *      mobile shell configs use it. A blanket scan would also rewrite
 *      doc prose that legitimately mentions the literal marker (e.g.
 *      a contributor writing "replace `__PROJECT_NAME__` with your
 *      project name" in user-facing prose).
 *   2. Each entry is a path relative to the scaffold root; missing
 *      files are tolerated (the strip-features pass may have removed
 *      `apps/desktop/` or `apps/mobile/` before this runs in some
 *      future ordering).
 *
 * Drift is fenced by `__tests__/no-orphan-tokens.test.ts` (P2.5):
 * adding a new template file containing `__PROJECT_NAME__` without a
 * corresponding entry here fails CI.
 */
const PROJECT_NAME_TARGETS: readonly string[] = [
  'apps/desktop/package.json',
  'apps/desktop/src-tauri/Cargo.toml',
  'apps/desktop/src-tauri/tauri.conf.json',
  'apps/desktop/src-tauri/icons/README.md',
  'apps/desktop/README.md',
  'apps/mobile/package.json',
  'apps/mobile/capacitor.config.ts',
  'apps/mobile/README.md',
];

export { PROJECT_NAME_TARGETS };

/**
 * Copy the template tree to `dest`, then:
 *   - rewrite package.json's "name"
 *   - rename "_gitignore" / "_env" placeholder files to their dot-prefixed forms
 *     (npm strips real .gitignore from publishes; this is the standard workaround)
 *   - substitute `__PROJECT_NAME__` in the desktop / mobile shell configs
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
      return !TEMPLATE_COPY_SKIP.has(base);
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

  await substituteProjectName(opts.dest, opts.projectName);
}

/**
 * Replace every occurrence of `__PROJECT_NAME__` in the shell config
 * files listed in `PROJECT_NAME_TARGETS` with `projectName`. Missing
 * files are silently skipped — they may have been stripped earlier by
 * `stripFeatures` (e.g. `apps/desktop/` is gone for `--platform mobile`).
 *
 * Uses a literal split/join rather than a regex so a project name with
 * regex metacharacters (`.`, `+`, …) doesn't get mangled.
 */
async function substituteProjectName(
  root: string,
  projectName: string
): Promise<void> {
  await Promise.all(
    PROJECT_NAME_TARGETS.map(async (rel) => {
      const full = path.join(root, rel);
      try {
        const st = await stat(full);
        if (!st.isFile()) return;
      } catch {
        return;
      }
      const raw = await readFile(full, 'utf8');
      if (!raw.includes('__PROJECT_NAME__')) return;
      const next = raw.split('__PROJECT_NAME__').join(projectName);
      await writeFile(full, next, 'utf8');
    })
  );
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
