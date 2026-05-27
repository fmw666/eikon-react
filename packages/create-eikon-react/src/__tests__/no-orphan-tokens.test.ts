/**
 * @file no-orphan-tokens.test.ts
 * @description Static safety net for the `__PROJECT_NAME__` substitution
 *  in `copy-template.ts`. The substitution is gated by an explicit
 *  allow-list (`PROJECT_NAME_TARGETS`); any template file that mentions
 *  the literal `__PROJECT_NAME__` outside that list will leak the token
 *  into the user's scaffolded project verbatim.
 *
 *  The test scans the in-repo template trees (`packages/template-react/`
 *  and the synced `packages/create-eikon-react/template/` plus the
 *  `template-snapshots/` siblings) for any `__[A-Z][A-Z0-9_]+__` pattern.
 *  Two failure modes:
 *
 *    1. A `__PROJECT_NAME__` reference appears in a file NOT listed in
 *       `PROJECT_NAME_TARGETS` — the substitution will skip it and the
 *       user gets a literal `__PROJECT_NAME__` in their project.
 *    2. Any other `__SOMETHING__` token shows up — these are placeholders
 *       no substitution path knows about, so they'll definitely leak.
 *
 *  Performed as a pure file-scan rather than running an end-to-end
 *  scaffold so the test stays fast (no install, no node_modules).
 */

// =================================================================================================
// Imports
// =================================================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { PROJECT_NAME_TARGETS } from '../copy-template.js';

// =================================================================================================
// Constants
// =================================================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PACKAGE_ROOT = path.resolve(__dirname, '..', '..');
const REPO_ROOT = path.resolve(PACKAGE_ROOT, '..');

const ROOTS_TO_SCAN: ReadonlyArray<{ name: string; abs: string }> = [
  {
    name: 'template-react',
    abs: path.join(REPO_ROOT, 'template-react'),
  },
  {
    name: 'create-eikon-react/template',
    abs: path.join(PACKAGE_ROOT, 'template'),
  },
  {
    name: 'create-eikon-react/template-snapshots',
    abs: path.join(PACKAGE_ROOT, 'template-snapshots'),
  },
];

const SCAN_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.md',
  '.toml',
  '.rs',
  '.html',
  '.css',
]);

const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  'coverage',
  '.vite',
  '.turbo',
  '.preview-cache',
  '.git',
  // The structure-test fixtures occasionally embed sentinel tokens on purpose;
  // we don't want a fixture mention to look like a real leak.
  '__fixtures__',
]);

const TOKEN_RE = /__[A-Z][A-Z0-9_]+__/g;

// =================================================================================================
// Helpers
// =================================================================================================

function walk(root: string, acc: string[]): void {
  if (!fs.existsSync(root)) return;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const abs = path.join(root, entry.name);
    if (entry.isDirectory()) {
      walk(abs, acc);
    } else if (entry.isFile()) {
      if (SCAN_EXTENSIONS.has(path.extname(entry.name))) acc.push(abs);
    }
  }
}

interface Hit {
  rootName: string;
  relPosix: string;
  token: string;
}

function scanFile(
  rootName: string,
  rootAbs: string,
  abs: string
): Hit[] {
  const text = fs.readFileSync(abs, 'utf8');
  const tokens = new Set<string>();
  for (const m of text.matchAll(TOKEN_RE)) tokens.add(m[0]);
  if (tokens.size === 0) return [];
  const relPosix = path.relative(rootAbs, abs).split(path.sep).join('/');
  return [...tokens].map((token) => ({ rootName, relPosix, token }));
}

// =================================================================================================
// Tests
// =================================================================================================

describe('no orphan tokens in template trees', () => {
  const allHits: Hit[] = [];
  for (const root of ROOTS_TO_SCAN) {
    const files: string[] = [];
    walk(root.abs, files);
    for (const f of files) allHits.push(...scanFile(root.name, root.abs, f));
  }

  it('every __PROJECT_NAME__ reference is covered by PROJECT_NAME_TARGETS', () => {
    const allowed = new Set(PROJECT_NAME_TARGETS);
    const projectNameHits = allHits.filter((h) => h.token === '__PROJECT_NAME__');
    for (const h of projectNameHits) {
      expect(
        allowed.has(h.relPosix),
        `${h.rootName}/${h.relPosix} mentions __PROJECT_NAME__ but is NOT in ` +
          `PROJECT_NAME_TARGETS — copy-template.ts will leak the literal ` +
          `placeholder into the scaffolded project. Add the path to the ` +
          `allow-list, or remove the token.`
      ).toBe(true);
    }
  });

  it('no other __TOKEN__-shaped placeholders leak through', () => {
    // Tokens that LOOK like placeholders but aren't — they refer to
    // real runtime globals exposed by third-party libs that the
    // template rules legitimately mention in prose. Adding to this
    // list is intentional; review carefully.
    const KNOWN_THIRD_PARTY = new Set(['__TAURI__']);
    const known = new Set(['__PROJECT_NAME__', ...KNOWN_THIRD_PARTY]);
    const unknown = allHits.filter((h) => !known.has(h.token));
    expect(
      unknown,
      `Unknown placeholder tokens found — every \`__SOMETHING__\` ` +
        `pattern in a template file must be backed by a substitution. ` +
        `Add the substitution path or rename the token. Hits:\n` +
        unknown
          .map((h) => `  - ${h.token} in ${h.rootName}/${h.relPosix}`)
          .join('\n')
    ).toEqual([]);
  });
});
