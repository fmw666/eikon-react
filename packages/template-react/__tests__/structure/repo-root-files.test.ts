/**
 * @file repo-root-files.test.ts
 * @description Structural guard for the project root (= scaffolded
 * app root after CLI).
 *
 * Asserts the presence of the canonical config files and that
 * `package.json` exposes the script set the quality system relies on
 * (`typecheck`, `lint`, `test`, `test:structure`, `check`, `ci`,
 * `build`, …). Without these, the GitHub workflow shipped with the
 * template would silently no-op.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import path from 'node:path';

// --- Third-party Libraries ---
import { describe, expect, it } from 'vitest';

// --- Relative Imports ---
import { REPO_ROOT, isFile, readJSON } from './_helpers';

// =================================================================================================
// Constants
// =================================================================================================

const REQUIRED_FILES = [
  'package.json',
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.node.json',
  'vite.config.ts',
  'vitest.config.ts',
  'vitest.browser.config.ts',
  'eslint.config.js',
  '.prettierrc.json',
  'index.html',
  'README.md',
  'LICENSE',
  '.env.example',
  '.gitignore',
  '.github/workflows/ci.yml',
  '.agent/README.md',
  'eslint-rules/index.js',
];

const REQUIRED_SCRIPTS = [
  'dev',
  'build',
  'lint',
  'lint:fix',
  'typecheck',
  'test',
  'test:structure',
  'check',
  'ci',
];

// =================================================================================================
// Tests
// =================================================================================================

describe('structure: project root', () => {
  it('has every required config / metadata file', () => {
    for (const f of REQUIRED_FILES) {
      expect(
        isFile(path.join(REPO_ROOT, f)),
        `Required project-root file missing: ${f}`
      ).toBe(true);
    }
  });

  describe('package.json', () => {
    const pkg = readJSON<{
      scripts?: Record<string, string>;
      engines?: { node?: string };
      packageManager?: string;
    }>(path.join(REPO_ROOT, 'package.json'));

    it('declares the full quality-system script set', () => {
      const scripts = pkg.scripts || {};
      for (const s of REQUIRED_SCRIPTS) {
        expect(scripts[s], `package.json scripts.${s} must be defined`).toBeTruthy();
      }
    });

    it('declares engines.node and packageManager', () => {
      expect(pkg.engines?.node, 'package.json engines.node must be set').toBeTruthy();
      expect(
        pkg.packageManager,
        'package.json packageManager must be set (e.g. pnpm@9.x)'
      ).toBeTruthy();
    });
  });
});
