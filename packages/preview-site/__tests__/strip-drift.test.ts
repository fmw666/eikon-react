/**
 * @file strip-drift.test.ts
 * @description Phase J drift check.
 *
 * The playground's left-side files panel is rendered by
 * `simulateStripTree(inputs)` (server/simulate-strip.ts) — a pure function
 * over the in-repo `template-react/` directory. The promise it makes is:
 * "this list is exactly what `npx create-eikon-react --<inputs>` would
 * produce on disk for the same inputs."
 *
 * The CLI scaffolder is the source of truth: it uses `stripFeatures()`
 * against a real copy of the template, runs `prunePackageScripts` /
 * `prunePlatformOnlyRootFiles` for the platform, and writes the result.
 * If the simulator's hand-mirrored rules ever drift from the CLI's
 * behaviour, the panel starts showing files the user wouldn't actually
 * receive (or hides files they would) — which is the exact failure mode
 * Phase F was meant to make impossible.
 *
 * This test enumerates every (platform × supabase) combination — the six
 * cases the build cache splits on after Phase G — and asserts both
 * implementations agree on the file set. Runtime-switchable axes
 * (design / ui / layout / toastPosition) are held at fixed defaults; the
 * simulator and the CLI strip them with the same logic, so a single value
 * per axis exercises the same code paths a full Cartesian product would.
 *
 * The test copies `template-react/` into an OS tmp dir per case and runs
 * the real `stripFeatures()` against the copy — no mocks, no fixtures —
 * so any change to either side has to keep the wire-level behaviour in
 * lock-step or this test fails.
 */

import { cp, mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  stripFeatures,
  type FeatureFlags,
  type VariantSelections,
} from '../../create-eikon-react/src/strip-features';
import { TEMPLATE_COPY_SKIP } from '../../create-eikon-react/src/skip-list';

import { simulateStripFileContent, simulateStripTree } from '../server/simulate-strip';
import { type BuildInputs } from '../server/hash';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE_REACT_DIR = path.resolve(
  __dirname,
  '..',
  '..',
  'template-react'
);

const PLATFORMS = ['web', 'desktop', 'mobile'] as const;
const SUPABASE_VALUES = [false, true] as const;

const FIXED_RUNTIME_AXES: Pick<
  BuildInputs,
  'pm' | 'design' | 'ui' | 'layout' | 'toastPosition'
> = {
  // `pm` is part of `BuildInputs` post-Phase-H but only affects the
  // `package.json` content rewrite, not the file set. Pin it to the
  // default so the parity test below isolates the directory/file-name
  // strip from the package-manager rewrite, which has its own test.
  pm: 'pnpm',
  design: 'default',
  ui: 'animate-ui',
  layout: 'stacked',
  toastPosition: 'top-right',
};

/**
 * Walk a directory tree and emit POSIX-relative paths for every file,
 * sorted case-insensitively to match `simulateStripTree`'s ordering.
 * Skip names in TEMPLATE_COPY_SKIP — the strip pass leaves a few of
 * those in place (e.g. `.git` if the user already initialised one) and
 * the simulator always omits them, so excluding here keeps the diff
 * focused on stripper behaviour rather than copy-time filtering.
 */
async function walkFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  async function go(absDir: string): Promise<void> {
    const rel = path.relative(root, absDir).replace(/\\/g, '/');
    const entries = await readdir(absDir, { withFileTypes: true });
    for (const entry of entries) {
      if (TEMPLATE_COPY_SKIP.has(entry.name)) continue;
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      const childAbs = path.join(absDir, entry.name);
      if (entry.isDirectory()) {
        await go(childAbs);
      } else if (entry.isFile()) {
        out.push(childRel);
      }
    }
  }
  await go(root);
  out.sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
  return out;
}

/**
 * Copy `template-react/` to a fresh tmp dir, applying the same name-level
 * skip set the production builder uses (server/builder.ts → copyTree).
 * This avoids dragging `.preview-cache/` (a sibling of `src/`) into the
 * fixture, which would otherwise inflate every diff with cache contents.
 */
async function copyTemplate(dest: string): Promise<void> {
  await cp(TEMPLATE_REACT_DIR, dest, {
    recursive: true,
    filter: (source) => {
      const base = path.basename(source);
      return !TEMPLATE_COPY_SKIP.has(base);
    },
  });
}

describe('simulateStripTree ↔ CLI stripFeatures parity (Phase J drift check)', () => {
  for (const platform of PLATFORMS) {
    for (const supabase of SUPABASE_VALUES) {
      it(`platform=${platform} supabase=${supabase} matches the CLI 1:1`, async () => {
        const inputs: BuildInputs = {
          platform,
          supabase,
          ...FIXED_RUNTIME_AXES,
        };

        const simulated = await simulateStripTree(inputs);

        const tmp = await mkdtemp(path.join(tmpdir(), 'strip-drift-'));
        try {
          await copyTemplate(tmp);

          const flags: FeatureFlags = { supabase, i18n: true };
          const variants: VariantSelections = {
            platform,
            ...FIXED_RUNTIME_AXES,
          };
          // No `keepAllVariants` here — terminal CLI users get the full
          // strip, and that's the contract simulateStripTree mirrors.
          await stripFeatures(tmp, flags, variants);

          const fromCli = await walkFiles(tmp);

          // Show diffs as sorted arrays so a failure points at the exact
          // files that drifted, not at a giant unified blob.
          const onlyInSim = simulated.filter((p) => !fromCli.includes(p));
          const onlyInCli = fromCli.filter((p) => !simulated.includes(p));
          expect(
            { onlyInSim, onlyInCli },
            'simulateStripTree must match the actual CLI output for this combo'
          ).toEqual({ onlyInSim: [], onlyInCli: [] });
        } finally {
          await rm(tmp, { recursive: true, force: true });
        }
      }, 30_000);
    }
  }
});

/**
 * `pm` doesn't change the file set — only `package.json` content. This
 * mirrors the CLI's `rewritePackageManagerFields` behaviour: the
 * simulator must produce the same `package.json` a real `--pm npm|bun`
 * scaffold would write. Holding all other axes at defaults keeps this
 * focused on the package-manager rewrite path.
 *
 * Implemented as a content read against `simulateStripFileContent` (no
 * tmp dir / template copy needed) — fast and direct.
 */
describe('pm content parity (Phase H)', () => {
  for (const pm of ['pnpm', 'npm', 'bun'] as const) {
    it(`pm=${pm} produces the package.json a CLI scaffold would write`, async () => {
      const inputs: BuildInputs = {
        platform: 'web',
        supabase: true,
        ...FIXED_RUNTIME_AXES,
        pm,
      };
      const out = await simulateStripFileContent('package.json', inputs);
      expect(out).not.toBeNull();
      const pkg = JSON.parse(out!) as {
        engines?: Record<string, string>;
        packageManager?: string;
      };
      if (pm === 'pnpm') {
        // pnpm is the template default — engines.pnpm should be present
        // and `packageManager` either absent or pinned to pnpm.
        expect(Object.keys(pkg.engines ?? {})).toContain('pnpm');
      } else {
        expect(Object.keys(pkg.engines ?? {})).toContain(pm);
        expect(Object.keys(pkg.engines ?? {})).not.toContain('pnpm');
        expect(pkg.packageManager ?? '').toMatch(new RegExp(`^${pm}@`));
      }
    });
  }
});
