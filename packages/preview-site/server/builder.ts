import { existsSync } from 'node:fs';
import { copyFile, mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { build as viteBuild } from 'vite';

import {
  stripFeatures,
  type FeatureFlags,
  type VariantSelections,
} from '../../create-evomap-app/src/strip-features';

import { getTemplateRev } from './fingerprint';
import { hashBuildInputs, type BuildInputs } from './hash';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * packages/preview-site/server → packages/preview-site → packages → ai-devkit.
 * The cache lives INSIDE template-react so that Node's package resolution
 * automatically walks up to template-react/node_modules when vite runs — no
 * symlink trickery required.
 */
export const TEMPLATE_REACT_DIR = path.resolve(
  __dirname,
  '..',
  '..',
  'template-react'
);
const CACHE_ROOT = path.join(TEMPLATE_REACT_DIR, '.preview-cache');

/** Default param values used for pre-warming and for filling in missing keys
 *  on incoming /api/build requests. Kept in lock-step with
 *  packages/preview-site/src/lib/params-schema.ts. */
export const DEFAULT_INPUTS: BuildInputs = {
  supabase: false,
  query: true,
  design: 'default',
  layout: 'stacked',
  ui: 'animate-ui',
};

const COPY_SKIP = new Set([
  'node_modules',
  'dist',
  '.preview-cache',
  '__tests__',
  '.git',
  '.turbo',
  'coverage',
  '.vite',
]);

export type BuildStatus = 'ready' | 'building' | 'error';

export interface BuildState {
  hash: string;
  status: BuildStatus;
  error?: string;
}

const inflight = new Map<string, Promise<void>>();
const errors = new Map<string, string>();

export function getCacheDir(hash: string): string {
  return path.join(CACHE_ROOT, hash);
}

export function getDistDir(hash: string): string {
  return path.join(getCacheDir(hash), 'dist');
}

export function isReady(hash: string): boolean {
  return existsSync(path.join(getDistDir(hash), 'index.html'));
}

export function getError(hash: string): string | undefined {
  return errors.get(hash);
}

/**
 * Look up (or start) the build for `inputs`. Returns immediately with the
 * current state; callers should poll `isReady(hash)` (or hit the matching
 * /api/build-status endpoint) until they see `ready`.
 *
 * Multiple concurrent requests for the same hash share one inflight build.
 */
export async function ensureBuild(inputs: BuildInputs): Promise<BuildState> {
  const templateRev = await getTemplateRev(TEMPLATE_REACT_DIR);
  const hash = hashBuildInputs(inputs, templateRev);

  if (isReady(hash)) return { hash, status: 'ready' };

  // A previous attempt errored; surface the failure instead of silently
  // retrying. Callers can clear errors via clearError(hash) if they want a
  // fresh attempt (e.g. after the user changed something on disk).
  const prevErr = errors.get(hash);
  if (prevErr) return { hash, status: 'error', error: prevErr };

  if (!inflight.has(hash)) {
    const promise = runBuild(hash, inputs)
      .catch((e) => {
        const msg = e instanceof Error ? (e.stack ?? e.message) : String(e);
        errors.set(hash, msg);
      })
      .finally(() => {
        inflight.delete(hash);
      });
    inflight.set(hash, promise);
  }

  return { hash, status: 'building' };
}

export function clearError(hash: string): void {
  errors.delete(hash);
}

/** Test-only escape hatch; never call from production code paths. */
export async function clearAllCache(): Promise<void> {
  await rm(CACHE_ROOT, { recursive: true, force: true });
  errors.clear();
  inflight.clear();
}

async function runBuild(hash: string, inputs: BuildInputs): Promise<void> {
  const cacheDir = getCacheDir(hash);

  // Drop any half-built leftover so we always start from a clean tree. A
  // ready dist would've short-circuited in ensureBuild, so this branch only
  // runs when the cache entry is missing or partial.
  await rm(cacheDir, { recursive: true, force: true });
  await mkdir(cacheDir, { recursive: true });

  await copyTree(TEMPLATE_REACT_DIR, cacheDir, COPY_SKIP);

  const flags: FeatureFlags = {
    supabase: inputs.supabase,
    query: inputs.query,
    i18n: true,
  };
  const variants: VariantSelections = {
    design: inputs.design,
    layout: inputs.layout,
    ui: inputs.ui,
  };
  await stripFeatures(cacheDir, flags, variants);

  await viteBuild({
    root: cacheDir,
    base: `/preview/${hash}/`,
    configFile: path.join(cacheDir, 'vite.config.ts'),
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false,
    },
    logLevel: 'warn',
    clearScreen: false,
  });
}

/**
 * Manual recursive copy that skips entries whose basename is in `skip`.
 *
 * Node's `fs.cp({recursive: true})` refuses when dest is a subdirectory of
 * src — which is exactly our setup (cache lives under template-react/). The
 * hand-rolled version sidesteps that check entirely because each
 * `copyFile`/`mkdir` call sees only individual paths, not the relationship.
 */
async function copyTree(
  src: string,
  dest: string,
  skip: ReadonlySet<string>
): Promise<void> {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    if (skip.has(entry.name)) continue;
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyTree(from, to, skip);
    } else if (entry.isFile()) {
      await copyFile(from, to);
    }
    // Symlinks and other special files are uncommon in template payloads;
    // silently skip them rather than try to faithfully reproduce.
  }
}
