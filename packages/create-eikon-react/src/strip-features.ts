import { readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

export interface FeatureFlags {
  supabase: boolean;
  i18n: boolean;
}

/**
 * Variant selections — one value per axis (design / layout / ui). The schema
 * is intentionally open (`Record<string, string>`) so new axes can be added
 * here without touching strip-features beyond the marker grammar.
 */
export type VariantSelections = Record<string, string>;

export const DEFAULT_VARIANTS: VariantSelections = {
  platform: 'web',
  design: 'default',
  layout: 'stacked',
  ui: 'animate-ui',
  toastPosition: 'top-right',
};

/**
 * Comment markers used inside template source files to delimit optional code.
 *
 *   // @eikon:feature(name) begin
 *   …code…
 *   // @eikon:feature(name) end
 *
 * Or for whole-file ownership (MUST be the very first line of the file — see
 * FILE_MARKER_RE below):
 *
 *   // @eikon:feature(name) file
 *
 * The leading slashes may be preceded by `{/*`, JSX `{/*` style, or `<!--` for
 * env files; we treat them all as line-level markers and just match the token.
 */
// IMPORTANT — the `\\*\\/\\}?` shape (no whitespace between `*/` and the
// optional `}`) is load-bearing. Earlier iterations used `\\*\\/\\s*\\}?`
// which made the closing-brace optional even across newlines. That
// silently swallowed the `@theme {…}` close brace whenever a marker block
// sat next to it (e.g. when stripping `--touch-target-min` from
// `src/styles/index.css`), turning the next `}` into part of the marker
// match. JSX-style `{/* … */}` keeps `*/}` adjacent, so requiring
// adjacency is also semantically correct — never reintroduce `\\s*` here.
const BLOCK_RE =
  /[ \t]*(?:\/\/|\/\*|\{\/\*|#|<!--)\s*@eikon:feature\(([^)]+)\)\s*begin\s*(?:\*\/\}?|-->)?[ \t]*\r?\n?/g;
const BLOCK_END_RE_SRC =
  '[ \\t]*(?:\\/\\/|\\/\\*|\\{\\/\\*|#|<!--)\\s*@eikon:feature\\(NAME\\)\\s*end\\s*(?:\\*\\/\\}?|-->)?[ \\t]*\\r?\\n?';
// File-level markers are only honoured on the FIRST LINE of the file. This is
// the convention used by every real consumer in the template (see
// `src/shared/supabase/client.ts:1`, `src/shared/i18n/index.ts:1`, …) and the
// constraint is load-bearing: without it, any documentation file that quotes
// the marker as a literal — like `.agent/skills/enable-supabase/SKILL.md` —
// gets silently deleted whenever the corresponding feature is stripped.
// The regex is intentionally NOT multiline (`m` flag) so `^` anchors to
// string start, not line start.
const FILE_MARKER_RE =
  /^[ \t]*(?:\/\/|\/\*|\{\/\*|#|<!--)\s*@eikon:feature\(([^)]+)\)\s*file[^\n]*/;

/**
 * Variant grammar — same comment shapes as features but with an `axis=value`
 * payload. Examples (axis/value names below are illustrative; this module
 * is unaware of which axis/value pairs are valid — that knowledge lives in
 * `VARIANT_CHOICES` in `index.ts`):
 *
 *   // @eikon:variant(design=<value>) begin
 *   …kept only when design === '<value>'…
 *   // @eikon:variant(design=<value>) end
 *
 *   // @eikon:variant(layout=sidebar) file
 *   …whole file kept only when layout === 'sidebar'…
 *
 * Same first-line constraint as FILE_MARKER_RE — see comment above for why.
 */
const VARIANT_FILE_MARKER_RE =
  /^[ \t]*(?:\/\/|\/\*|\{\/\*|#|<!--)\s*@eikon:variant\(([^=)]+)=([^)]+)\)\s*file[^\n]*/;

const PACKAGE_DEPS_BY_FEATURE: Record<string, string[]> = {
  supabase: ['@supabase/supabase-js'],
  // i18n and TanStack Query are non-strippable in this template; if a
  // future template strips one of them, its deps would go here. TanStack
  // Query (`@tanstack/react-query`) is treated as baseline infrastructure
  // alongside React / React Router — every scaffold ships with it.
  //
  // `examples` used to live here (pruning `web-vitals` /
  // `@tanstack/react-virtual` / `cmdk`), but the showcase is now shipped
  // unconditionally — the runtime `import.meta.env.DEV` gate in
  // `app/router.tsx` keeps the routes out of production bundles, so end
  // users carry the source but pay nothing in their built app.
};

/**
 * Optional knobs that bypass the default strip behaviour.
 *
 * All of these knobs exist for the in-repo preview playground; every other
 * caller (the CLI, the e2e suite) leaves them at their defaults so
 * end-user projects get the fully-stripped tree.
 *
 *   - `keepAllVariantFiles`: skip the `@eikon:variant(<axis>=<value>) file`
 *     first-line strip so every variant sibling stays on disk (all 4
 *     `*RootLayout.tsx`, …). Block-level variant markers still apply,
 *     so dispatchers like `app/layouts/RootLayout.tsx` continue to
 *     narrow to the user's chosen value — variant selection in the
 *     playground still drives the rendered global UI.
 *
 *   - `keepShells`: keep the `apps/desktop/` (Tauri) and `apps/mobile/`
 *     (Capacitor) directories regardless of the chosen platform, and
 *     skip the `prunePackageScripts` pass that drops the `tauri:*` /
 *     `cap:*` scripts from `package.json`. The preview playground never
 *     runs Tauri/Capacitor itself (it only does a Vite web build), so
 *     the shell directories are inert — we keep them so the same cache
 *     entry can serve every platform without rebuilding the directory
 *     tree, and so the playground's "View source" panel can show users
 *     what the shells look like.
 *
 *   - `keepAllVariants`: a list of axis names whose block-level AND
 *     file-level variant markers should be skipped. Used by the preview
 *     playground for axes the template handles at *runtime* —
 *     `design` / `ui` (CSS class), `layout` (React Context),
 *     `toastPosition` (component state). For those axes the playground
 *     wants every value's source to coexist in the build so the iframe
 *     can switch with no rebuild; the template's own runtime dispatch
 *     picks one. CLI users pass nothing → every axis is stripped to
 *     the chosen value, exactly as before.
 *
 *     `platform` is intentionally NOT runtime-switchable — its blocks
 *     gate things like the `apple-mobile-web-app-capable` meta tag
 *     and `--touch-target-min` token that aren't safe to coexist —
 *     so callers pass `['design','ui','layout','toastPosition']`
 *     rather than a blanket boolean.
 */
export interface StripOptions {
  keepAllVariantFiles?: boolean;
  keepShells?: boolean;
  keepAllVariants?: ReadonlyArray<string>;
}

/**
 * Walk the project tree and remove code/files corresponding to disabled
 * features and to non-chosen variants.
 *
 * `variants` is optional for backward compatibility (callers that only deal
 * with feature flags can omit it); when not provided, no variant marker is
 * stripped — the template behaves exactly as it did before variants existed.
 */
export async function stripFeatures(
  root: string,
  flags: FeatureFlags,
  variants: VariantSelections = {},
  options: StripOptions = {}
): Promise<void> {
  const disabled = new Set<string>();
  if (!flags.supabase) disabled.add('supabase');
  if (!flags.i18n) disabled.add('i18n'); // currently never disabled by the CLI
  // The `examples` feature used to be stripped by default — end users
  // were considered to never want a template-internal showcase in their
  // scaffolded project. That decision was reversed: examples now ships
  // unconditionally so the playground's file panel matches the scaffold
  // output 1:1, and so end users can browse the showcase locally with
  // `npm run dev`. Production bundles stay clean via the runtime
  // `import.meta.env.DEV` gate in `app/router.tsx` — `pnpm build` /
  // `vite build` evaluates that gate to `false`, tree-shaking the
  // routes out. The `@eikon:feature(examples)` markers across the
  // template tree are now inert (no consumer adds 'examples' to
  // `disabled`), but they're left in place as documentation and as a
  // ready hook should the strip ever need to come back.

  await walkAndStrip(root, disabled, variants, options);
  await pruneDependencies(root, disabled);
  // Platform-aware script pruning. Runs after the file-tree walk so the
  // shell directories' deletion above and the script pruning here move
  // in lock-step — never delete `apps/desktop/` while keeping `tauri:*`
  // scripts that point at it.
  if (!options.keepShells) {
    await prunePackageScripts(root, variants);
    await prunePlatformOnlyRootFiles(root, variants);
    // After the per-shell deletes above, `apps/` may be left as an
    // empty directory (e.g. on `--platform web`, both `apps/desktop`
    // and `apps/mobile` are gone). The structural guards in scaffolded
    // projects assert "apps/ either has a known shell OR is absent",
    // and `pnpm-workspace.yaml` is dropped on web — so an orphan empty
    // `apps/` would be both ugly and a structural-test failure.
    await pruneEmptyAppsDir(root);
  }
}

/**
 * Remove the `apps/` parent directory if (and only if) it's empty
 * after the shell-level deletes. We don't recurse on purpose: any
 * surviving entry inside `apps/` means the user opted into a
 * platform that needs the directory, and removing it would break
 * their build.
 */
async function pruneEmptyAppsDir(root: string): Promise<void> {
  const apps = path.join(root, 'apps');
  let entries: string[];
  try {
    entries = await readdir(apps);
  } catch {
    return; // apps/ doesn't exist — nothing to do.
  }
  if (entries.length === 0) {
    await rm(apps, { recursive: true, force: true });
  }
}

/**
 * Cap on the per-directory leaf-file concurrency. The template is small
 * (~60 files), so a single high cap (32) keeps the queue empty without
 * risking too many open fds on machines with tight ulimits.
 */
const FILE_CONCURRENCY = 32;

async function walkAndStrip(
  dir: string,
  disabled: ReadonlySet<string>,
  variants: VariantSelections,
  options: StripOptions
): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  const fileTasks: Array<() => Promise<void>> = [];
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
      // Platform shell directories: drop unless the chosen platform
      // matches AND the playground hasn't asked us to keep them. The
      // preview opts out via `keepShells: true` so platform-switching
      // in the playground stays cache-cheap.
      if (!options.keepShells) {
        const platform = variants['platform'];
        if (isInsideDesktopShellDir(full) && platform !== 'desktop') {
          await rm(full, { recursive: true, force: true });
          continue;
        }
        if (isInsideMobileShellDir(full) && platform !== 'mobile') {
          await rm(full, { recursive: true, force: true });
          continue;
        }
      }
      // Directories still recurse sequentially — bounded depth in the
      // template tree means there's nothing to gain from racing them,
      // and serial recursion keeps fd usage predictable.
      await walkAndStrip(full, disabled, variants, options);
      continue;
    }
    if (!entry.isFile()) continue;
    fileTasks.push(() => stripFile(full, disabled, variants, options));
  }
  // Leaf-file work is independent and IO-bound (read → maybe write).
  // Running them with a small concurrency bound trims wall-clock time
  // noticeably on directories with many marker-bearing siblings (e.g.
  // src/styles/, src/shared/ui/).
  await runWithConcurrency(fileTasks, FILE_CONCURRENCY);
}

/**
 * Run an array of async tasks with at most `limit` in flight at a time.
 *
 * Returns `void`: every caller in this module discards the resolved
 * values (the tasks themselves perform IO side-effects on the strip
 * target), so retaining a results array forced an allocation + an
 * unused `Promise<unknown[]>` shape callers had to ignore. The earlier
 * iteration returned `T[]` for symmetry with `Promise.all`, which the
 * audit flagged as semantic dead weight.
 *
 * If a future caller genuinely needs the resolved values, prefer
 * `Promise.all` (with manual chunking) or reintroduce an overload —
 * don't sneak the array back in by default; the discard is part of
 * this helper's contract now.
 */
async function runWithConcurrency(
  tasks: ReadonlyArray<() => Promise<unknown>>,
  limit: number
): Promise<void> {
  if (tasks.length <= 1) {
    if (tasks.length === 1) await tasks[0]!();
    return;
  }
  let next = 0;
  async function worker(): Promise<void> {
    while (true) {
      const i = next++;
      if (i >= tasks.length) return;
      await tasks[i]!();
    }
  }
  const workers = Array.from(
    { length: Math.min(limit, tasks.length) },
    () => worker()
  );
  await Promise.all(workers);
}

function isInsideSupabaseDir(p: string): boolean {
  const norm = p.replace(/\\/g, '/');
  return norm.endsWith('/src/shared/supabase');
}

/**
 * The Tauri 2 desktop shell lives in `apps/desktop/`. The directory is
 * unconditionally removed unless the chosen platform is `desktop` (or
 * the playground's `keepShells` opt-out is set). This is the platform
 * analog of `isInsideSupabaseDir` — JSON / TOML files inside don't
 * accept `@eikon:variant(...) file` markers, so directory-level
 * removal is the right hammer.
 */
function isInsideDesktopShellDir(p: string): boolean {
  const norm = p.replace(/\\/g, '/');
  return norm.endsWith('/apps/desktop');
}

/**
 * The Capacitor 6 mobile shell lives in `apps/mobile/`. Same removal
 * semantics as the desktop shell above, gated on `platform !== 'mobile'`.
 */
function isInsideMobileShellDir(p: string): boolean {
  const norm = p.replace(/\\/g, '/');
  return norm.endsWith('/apps/mobile');
}

async function stripFile(
  file: string,
  disabled: ReadonlySet<string>,
  variants: VariantSelections,
  options: StripOptions
): Promise<void> {
  if (await isBinary(file)) return;
  const raw = await readFile(file, 'utf8');

  // File ownership wins over block-level work: if the file is tied to a
  // disabled feature or a non-chosen variant we can simply delete it.
  const fileMatch = raw.match(FILE_MARKER_RE);
  if (fileMatch && disabled.has(fileMatch[1]!)) {
    await rm(file, { force: true });
    return;
  }

  // Variant file-level strip: removes orphan variant siblings (e.g. the
  // 3 unchosen layouts) so the scaffolded project only carries the user's
  // selection. The playground opts out via `keepAllVariantFiles` (drops
  // the whole pass) or `keepAllVariants` (per-axis exclusion — used to
  // keep all `layout=*` files while still letting `platform=*` strip).
  if (!options.keepAllVariantFiles) {
    const variantFileMatch = raw.match(VARIANT_FILE_MARKER_RE);
    if (variantFileMatch) {
      const axis = variantFileMatch[1]!;
      const value = variantFileMatch[2]!;
      const chosen = variants[axis];
      const axisKept = options.keepAllVariants?.includes(axis) ?? false;
      if (!axisKept && chosen !== undefined && chosen !== value) {
        await rm(file, { force: true });
        return;
      }
    }
  }

  let out = raw;
  for (const feature of disabled) {
    out = stripBlocksForFeature(out, feature);
  }
  for (const [axis, chosen] of Object.entries(variants)) {
    // Skip block-level strip for runtime-switchable axes the playground
    // opted out of (design / ui / layout / toastPosition). Marker
    // comments stay in source — they're inert.
    if (options.keepAllVariants?.includes(axis)) continue;
    out = stripBlocksForVariant(out, axis, chosen);
  }

  if (out !== raw) {
    await writeFile(file, out, 'utf8');
  }
}

/**
 * Cache compiled regexes by feature name. The cost of `new RegExp(...)` is
 * small in absolute terms, but `stripFeatures` calls this once per
 * `(file × disabled-feature)` — without caching, a ~60 file template with
 * one disabled feature recompiles the same regex 60 times. Module-level
 * cache means one compile per feature per CLI run.
 */
const featureRegexCache = new Map<string, RegExp>();

function regexForFeature(feature: string): RegExp {
  let re = featureRegexCache.get(feature);
  if (re) return re;
  const escaped = feature.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // See header comment on BLOCK_RE — `\\*\\/\\}?` (no whitespace) is
  // load-bearing; do not reintroduce `\\s*` between `*/` and `\\}?`.
  const beginPart =
    '[ \\t]*(?:\\/\\/|\\/\\*|\\{\\/\\*|#|<!--)\\s*@eikon:feature\\(' +
    escaped +
    '\\)\\s*begin\\s*(?:\\*\\/\\}?|-->)?[ \\t]*\\r?\\n?';
  const endPart = BLOCK_END_RE_SRC.replace('NAME', escaped);
  re = new RegExp(beginPart + '[\\s\\S]*?' + endPart, 'g');
  featureRegexCache.set(feature, re);
  return re;
}

function stripBlocksForFeature(input: string, feature: string): string {
  // Stateful flag (`g`) means we must reset lastIndex between calls; using
  // `String.prototype.replace` with a global regex already does the right
  // thing (it ignores lastIndex), so caching the compiled regex is safe.
  return input.replace(regexForFeature(feature), '');
}

/**
 * Cache regex by axis name. The regex captures the value via a group, so
 * a single compiled regex per axis serves every keepValue selection.
 */
const variantRegexCache = new Map<string, RegExp>();

function regexForVariantAxis(axis: string): RegExp {
  let re = variantRegexCache.get(axis);
  if (re) return re;
  const escAxis = axis.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // See header comment on BLOCK_RE — `\\*\\/\\}?` (no whitespace) is
  // load-bearing; do not reintroduce `\\s*` between `*/` and `\\}?`.
  // The CSS regression that motivated this: a `/* @eikon:variant(...)
  // end */` line inside `@theme { ... }` would, with `\\s*\\}?`,
  // greedy-eat the next-line `}` along with the marker, breaking
  // brace balance for the Tailwind v4 parser.
  const beginPart =
    '[ \\t]*(?:\\/\\/|\\/\\*|\\{\\/\\*|#|<!--)\\s*@eikon:variant\\(' +
    escAxis +
    '=([^)]+)\\)\\s*begin\\s*(?:\\*\\/\\}?|-->)?[ \\t]*\\r?\\n?';
  const endPart =
    '[ \\t]*(?:\\/\\/|\\/\\*|\\{\\/\\*|#|<!--)\\s*@eikon:variant\\(' +
    escAxis +
    '=\\1\\)\\s*end\\s*(?:\\*\\/\\}?|-->)?[ \\t]*\\r?\\n?';
  re = new RegExp(beginPart + '[\\s\\S]*?' + endPart, 'g');
  variantRegexCache.set(axis, re);
  return re;
}

/**
 * Drop every `@eikon:variant(<axis>=<other-value>)` block where the value
 * does NOT match `keepValue`. Blocks for `keepValue` are left as-is (marker
 * comments included), mirroring how stripBlocksForFeature treats kept
 * features.
 */
function stripBlocksForVariant(
  input: string,
  axis: string,
  keepValue: string
): string {
  return input.replace(regexForVariantAxis(axis), (match, value: string) =>
    value === keepValue ? match : ''
  );
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

/**
 * Platform-keyed script tags. The root `package.json` ships every
 * scaffold-time script in one block (so the unstripped template tree
 * passes lint / typecheck / `pnpm install` on its own); on strip we drop
 * the scripts whose tag doesn't match the chosen platform. Maintained
 * here rather than as JSON5 comments inside `package.json` because
 * standard JSON doesn't accept comments and we don't want to fork to
 * JSON5 just for one axis.
 *
 * The map is hard-coded; new platforms just add a key. The CLI's
 * `VARIANT_CHOICES.platform` and the playground schema's
 * `platform.values` must stay in sync with this map's keys (verified by
 * the platform e2e scenarios).
 */
const PLATFORM_SCRIPTS: Record<string, readonly string[]> = {
  desktop: ['tauri', 'tauri:dev', 'tauri:build'],
  mobile: [
    'cap',
    'cap:sync',
    'cap:add:ios',
    'cap:add:android',
    'cap:open:ios',
    'cap:open:android',
    'cap:run:ios',
    'cap:run:android',
  ],
  web: [],
};

/**
 * Drop platform-specific scripts from the root `package.json` whose tag
 * doesn't match the chosen platform. Runs as a final pass after the
 * file-tree walk; safe to call when no platform is set (no-op).
 *
 * Exported so unit tests can run it on a fixture `package.json`
 * directly without spinning up the whole strip pipeline.
 */
export async function prunePackageScripts(
  root: string,
  variants: VariantSelections
): Promise<void> {
  const platform = variants['platform'];
  if (!platform) return;
  const pkgPath = path.join(root, 'package.json');
  let raw: string;
  try {
    raw = await readFile(pkgPath, 'utf8');
  } catch {
    return; // No package.json at root — nothing to do (e.g. apps/* sub-roots).
  }
  const pkg = JSON.parse(raw) as { scripts?: Record<string, string> };
  if (!pkg.scripts) return;

  const toDrop = new Set<string>();
  for (const [tag, scripts] of Object.entries(PLATFORM_SCRIPTS)) {
    if (tag === platform) continue;
    for (const s of scripts) toDrop.add(s);
  }
  if (toDrop.size === 0) return;

  let changed = false;
  for (const key of toDrop) {
    if (key in pkg.scripts) {
      delete pkg.scripts[key];
      changed = true;
    }
  }
  if (!changed) return;
  await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
}

/**
 * Root-level files that are tied to a specific platform and have no
 * comment syntax, so they can't carry an inline marker. Each entry is
 * pruned when the chosen platform is NOT in the entry's keep-set.
 *
 * `pnpm-workspace.yaml`: declares `apps/*` as workspace packages so the
 *   root `tauri:*` / `cap:*` scripts can do `pnpm --filter ./apps/...`.
 *   On `--platform web` the entire `apps/` directory is removed by the
 *   directory walk above and the workspace filters are dropped by
 *   `prunePackageScripts`, so the workspace declaration becomes inert.
 *   Removing the file keeps the scaffold strictly single-package and
 *   leaves the user free to opt into a workspace later (recreate the
 *   file, add a `packages/` glob, etc.).
 *
 * Maintained as a small inline table rather than a comment-marker
 * approach because YAML accepts `#` comments but the file is small
 * enough that a whole-file delete is simpler than block stripping.
 */
const PLATFORM_ONLY_ROOT_FILES: ReadonlyArray<{
  readonly path: string;
  readonly keepFor: ReadonlyArray<string>;
}> = [
  {
    path: 'pnpm-workspace.yaml',
    keepFor: ['desktop', 'mobile'],
  },
];

/**
 * Delete platform-only root files when the chosen platform isn't in the
 * file's keep-set. No-op when `variants.platform` is missing (preserves
 * backward compat with feature-only callers).
 *
 * Exported for unit tests; CLI / e2e callers reach it via `stripFeatures`.
 */
export async function prunePlatformOnlyRootFiles(
  root: string,
  variants: VariantSelections
): Promise<void> {
  const platform = variants['platform'];
  if (!platform) return;
  for (const entry of PLATFORM_ONLY_ROOT_FILES) {
    if (entry.keepFor.includes(platform)) continue;
    const target = path.join(root, entry.path);
    await rm(target, { force: true });
  }
}

// Re-export for potential reuse in tests.
export { stripBlocksForFeature, stripBlocksForVariant, runWithConcurrency };
// Reference exported helpers so unused-export lints don't trigger.
export const __BLOCK_RE_FOR_TESTS = BLOCK_RE;

// ---------------------------------------------------------------------------
// Pure helpers exposed for the preview server's `simulate-strip.ts`.
//
// `simulateStrip()` (in preview-site) needs to produce, *per request and
// without writing to disk*, the file tree + per-file content the CLI
// would generate for a given (flags, variants) tuple. Re-implementing the
// rules over there would drift; instead the pure pieces of the rule set
// live here and the simulator composes them.
//
// Importantly: these are also load-bearing for CLI users (the regexes
// power `stripFile`), so any breaking edit here is caught by CLI strip
// tests and the playground drift test (Phase J) in lock-step.
// ---------------------------------------------------------------------------

export const FEATURE_FILE_MARKER_RE = FILE_MARKER_RE;
export const VARIANT_FILE_MARKER = VARIANT_FILE_MARKER_RE;

/** Map: feature name → npm deps removed when the feature is disabled. */
export const FEATURE_DEPS = PACKAGE_DEPS_BY_FEATURE;

/** Map: platform name → `package.json` scripts gated to that platform. */
export const PLATFORM_SCRIPT_TAGS = PLATFORM_SCRIPTS;

/**
 * Root-level files that exist only for certain platforms. Each entry
 * carries the platforms whose scaffolds should KEEP the file; for any
 * other platform the file is dropped from the tree.
 */
export const PLATFORM_ROOT_FILES = PLATFORM_ONLY_ROOT_FILES;

/**
 * Predicate flavours of the directory-level removal rules. The CLI's
 * strip walker uses inline checks (it has the absolute path); the
 * simulator works with relative POSIX paths so it gets a normalised
 * version here.
 *
 * `relPath` is template-relative and POSIX-separated, e.g.
 * `'apps/desktop/src-tauri/Cargo.toml'`.
 */
export function isInsideSupabaseTree(relPath: string): boolean {
  return (
    relPath === 'src/shared/supabase' ||
    relPath.startsWith('src/shared/supabase/')
  );
}
export function isInsideDesktopShellTree(relPath: string): boolean {
  return relPath === 'apps/desktop' || relPath.startsWith('apps/desktop/');
}
export function isInsideMobileShellTree(relPath: string): boolean {
  return relPath === 'apps/mobile' || relPath.startsWith('apps/mobile/');
}
