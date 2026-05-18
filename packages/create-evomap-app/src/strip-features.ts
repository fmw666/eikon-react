import { readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

export interface FeatureFlags {
  supabase: boolean;
  query: boolean;
  i18n: boolean;
}

/**
 * Comment markers used inside template source files to delimit optional code.
 *
 *   // @evomap:feature(name) begin
 *   …code…
 *   // @evomap:feature(name) end
 *
 * Or for whole-file ownership:
 *
 *   // @evomap:feature(name) file
 *
 * The leading slashes may be preceded by `{/*`, JSX `{/*` style, or `<!--` for
 * env files; we treat them all as line-level markers and just match the token.
 */
const BLOCK_RE =
  /[ \t]*(?:\/\/|\/\*|\{\/\*|#|<!--)\s*@evomap:feature\(([^)]+)\)\s*begin\s*(?:\*\/\s*\}?|-->)?[ \t]*\r?\n?/g;
const BLOCK_END_RE_SRC =
  '[ \\t]*(?:\\/\\/|\\/\\*|\\{\\/\\*|#|<!--)\\s*@evomap:feature\\(NAME\\)\\s*end\\s*(?:\\*\\/\\s*\\}?|-->)?[ \\t]*\\r?\\n?';
const FILE_MARKER_RE =
  /^.*@evomap:feature\(([^)]+)\)\s*file.*$/m;

const PACKAGE_DEPS_BY_FEATURE: Record<string, string[]> = {
  supabase: ['@supabase/supabase-js'],
  query: ['@tanstack/react-query'],
  // i18n is non-strippable in this template; if a future template strips it,
  // its deps would go here.
};

/**
 * Walk the project tree and remove code/files corresponding to disabled features.
 */
export async function stripFeatures(
  root: string,
  flags: FeatureFlags
): Promise<void> {
  const disabled = new Set<string>();
  if (!flags.supabase) disabled.add('supabase');
  if (!flags.query) disabled.add('query');
  if (!flags.i18n) disabled.add('i18n'); // currently never disabled by the CLI

  if (disabled.size === 0) return;

  await walkAndStrip(root, disabled);
  await pruneDependencies(root, disabled);
}

async function walkAndStrip(
  dir: string,
  disabled: ReadonlySet<string>
): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (
      entry.name === 'node_modules' ||
      entry.name === 'dist' ||
      entry.name === '.git'
    ) {
      continue;
    }
    if (entry.isDirectory()) {
      // If a directory's purpose is exclusively tied to a feature, drop it whole.
      if (disabled.has('supabase') && isInsideSupabaseDir(full)) {
        await rm(full, { recursive: true, force: true });
        continue;
      }
      await walkAndStrip(full, disabled);
      continue;
    }
    if (!entry.isFile()) continue;
    await stripFile(full, disabled);
  }
}

function isInsideSupabaseDir(p: string): boolean {
  const norm = p.replace(/\\/g, '/');
  return norm.endsWith('/src/shared/supabase');
}

async function stripFile(
  file: string,
  disabled: ReadonlySet<string>
): Promise<void> {
  if (await isBinary(file)) return;
  const raw = await readFile(file, 'utf8');

  const fileMatch = raw.match(FILE_MARKER_RE);
  if (fileMatch && disabled.has(fileMatch[1]!)) {
    await rm(file, { force: true });
    return;
  }

  let out = raw;
  for (const feature of disabled) {
    out = stripBlocksForFeature(out, feature);
  }

  if (out !== raw) {
    await writeFile(file, out, 'utf8');
  }
}

function stripBlocksForFeature(input: string, feature: string): string {
  // Build a regex that matches a begin marker for `feature`, the content, and
  // its matching end marker (non-greedy so nested-by-different-feature works).
  const escaped = feature.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const beginPart =
    '[ \\t]*(?:\\/\\/|\\/\\*|\\{\\/\\*|#|<!--)\\s*@evomap:feature\\(' +
    escaped +
    '\\)\\s*begin\\s*(?:\\*\\/\\s*\\}?|-->)?[ \\t]*\\r?\\n?';
  const endPart = BLOCK_END_RE_SRC.replace('NAME', escaped);
  const re = new RegExp(beginPart + '[\\s\\S]*?' + endPart, 'g');
  return input.replace(re, '');
}

async function isBinary(file: string): Promise<boolean> {
  try {
    const st = await stat(file);
    if (st.size > 5 * 1024 * 1024) return true;
  } catch {
    return true;
  }
  const ext = path.extname(file).toLowerCase();
  return (
    ext === '.png' ||
    ext === '.jpg' ||
    ext === '.jpeg' ||
    ext === '.gif' ||
    ext === '.webp' ||
    ext === '.ico' ||
    ext === '.woff' ||
    ext === '.woff2' ||
    ext === '.ttf'
  );
}

async function pruneDependencies(
  root: string,
  disabled: ReadonlySet<string>
): Promise<void> {
  const pkgPath = path.join(root, 'package.json');
  const raw = await readFile(pkgPath, 'utf8');
  const pkg = JSON.parse(raw) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  const toRemove = new Set<string>();
  for (const feature of disabled) {
    for (const dep of PACKAGE_DEPS_BY_FEATURE[feature] ?? []) {
      toRemove.add(dep);
    }
  }

  if (toRemove.size === 0) return;

  for (const section of ['dependencies', 'devDependencies'] as const) {
    const map = pkg[section];
    if (!map) continue;
    for (const dep of toRemove) delete map[dep];
  }

  await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
}

// Re-export for potential reuse in tests.
export { stripBlocksForFeature };
// Reference exported helpers so unused-export lints don't trigger.
export const __BLOCK_RE_FOR_TESTS = BLOCK_RE;
