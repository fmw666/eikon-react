/**
 * @file import-boundaries.test.ts
 * @description Enforces the grep-verifiable prohibitions PR-PV-001..005
 * from `.agent/rules/00-structure.md` at the test layer, independent of
 * ESLint. Agents have been known to silence ESLint rules; deleting a
 * test is a more obvious red flag, so this duplication is intentional.
 *
 * Each prohibition becomes one assertion sweep over the real source tree
 * (so it also guards future refactors — e.g. a god-file split that
 * accidentally introduces a static route-page import into Nav.tsx).
 *
 *   - PR-PV-001: browser code under `src/**` must not import `server/`.
 *   - PR-PV-002: `src/lib/**` must not import `shell/` or `landing/`.
 *   - PR-PV-003: `src/shell/**` must not import `landing/`.
 *   - PR-PV-004: `landing/nav/route-loaders.ts` must not *statically*
 *                import a route page (loaders use `() => import(...)`).
 *   - PR-PV-005: `landing/nav/Nav.tsx` must not *statically* import a
 *                route page (it may reference loaders only via ROUTE_PREFETCH).
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.resolve(HERE, '..', '..'); // packages/preview-site
const SRC_ROOT = path.join(PKG_ROOT, 'src');

/** Recursively collect `.ts`/`.tsx` source files under `src/` (no tests). */
function listSrcFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = path.join(dir, name);
      if (statSync(p).isDirectory()) {
        if (name === '__tests__' || name === 'node_modules') continue;
        walk(p);
      } else if (/\.(ts|tsx)$/.test(name) && !/\.d\.ts$/.test(name)) {
        out.push(p);
      }
    }
  };
  walk(SRC_ROOT);
  return out;
}

const readText = (f: string) => readFileSync(f, 'utf8');
const rel = (f: string) => path.relative(PKG_ROOT, f).split(path.sep).join('/');

/** Every import/dynamic-import specifier in a file (static + `import(...)`). */
function importSources(text: string): string[] {
  const re = /(?:from\s*|import\s*\(\s*)['"]([^'"]+)['"]/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push(m[1]!);
  return out;
}

/**
 * Resolve an import specifier to a path relative to the *package* root
 * (forward slashes), or `null` for external packages. Alias `@/` → `src/`.
 */
function resolveToPkgRel(sourceFile: string, spec: string): string | null {
  if (spec.startsWith('@/')) return `src/${spec.slice(2)}`;
  if (spec.startsWith('.')) {
    const abs = path.resolve(path.dirname(sourceFile), spec);
    return path.relative(PKG_ROOT, abs).split(path.sep).join('/');
  }
  return null; // bare/external
}

const underSrc = (f: string, sub: string) =>
  rel(f).startsWith(`src/${sub}`);

describe('structure: import boundaries (PR-PV-001..005)', () => {
  const files = listSrcFiles();

  it('PR-PV-001 — src/** must not import server/', () => {
    const failures: string[] = [];
    for (const f of files) {
      for (const spec of importSources(readText(f))) {
        const r = resolveToPkgRel(f, spec);
        if (r && r.startsWith('server/')) {
          failures.push(`${rel(f)} imports '${spec}' → '${r}' (browser code must not pull the Node server engine).`);
        }
      }
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });

  it('PR-PV-002 — src/lib/** must not import shell/ or landing/', () => {
    const failures: string[] = [];
    for (const f of files) {
      if (!underSrc(f, 'lib/')) continue;
      for (const spec of importSources(readText(f))) {
        const r = resolveToPkgRel(f, spec);
        if (r && (r.startsWith('src/shell/') || r.startsWith('src/landing/'))) {
          failures.push(`${rel(f)} imports '${spec}' → '${r}' (lib is leaf-level; demote the shared piece instead).`);
        }
      }
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });

  it('PR-PV-003 — src/shell/** must not import landing/ (except the entry root + shared theme)', () => {
    // Two documented, intentional exceptions — anything else is a violation:
    //   1. src/shell/main.tsx is the composition root; it mounts LandingPage
    //      to boot the app. An entry point is allowed to compose what it renders.
    //   2. src/landing/theme/** is the site-wide theme + i18n system that the
    //      embedded playground legitimately shares (28 of its 29 importers are
    //      landing, so it lives under landing/). Shell may read theme/i18n but
    //      NOTHING else in landing/ (a section, nav, changelog, a page, …).
    const failures: string[] = [];
    for (const f of files) {
      if (!underSrc(f, 'shell/')) continue;
      if (rel(f) === 'src/shell/main.tsx') continue; // exception 1
      for (const spec of importSources(readText(f))) {
        const r = resolveToPkgRel(f, spec);
        if (!r || !r.startsWith('src/landing/')) continue;
        if (r.startsWith('src/landing/theme/')) continue; // exception 2
        failures.push(`${rel(f)} imports '${spec}' → '${r}' (the playground shell must stand alone).`);
      }
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });

  it('PR-PV-004/005 — route-loaders.ts and Nav.tsx must not statically import a route page', () => {
    const STATIC_PAGE_IMPORT = /^\s*import\s[^\n]*(?:PlaygroundPage|ChangelogPage)/m;
    const targets = [
      'src/landing/nav/route-loaders.ts',
      'src/landing/nav/Nav.tsx',
    ];
    const failures: string[] = [];
    for (const t of targets) {
      const abs = path.join(PKG_ROOT, t);
      expect(existsSync(abs), `${t} should exist`).toBe(true);
      if (STATIC_PAGE_IMPORT.test(readText(abs))) {
        failures.push(`${t} statically imports a route page — route bundles load only via () => import(...).`);
      }
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });

  it('roots resolved correctly', () => {
    expect(SRC_ROOT.replace(/\\/g, '/')).toMatch(/\/src$/);
    expect(files.length).toBeGreaterThan(50);
  });
});
