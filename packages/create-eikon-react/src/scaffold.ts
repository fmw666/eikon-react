/**
 * @file scaffold.ts
 * @description The non-interactive build pipeline that turns a resolved
 * set of `CliOptions` into a project on disk: copy template → strip
 * features → bake the UI snapshot → stamp HTML variants → re-flavour
 * package.json for the chosen PM → (optionally) git init + install deps.
 *
 * Internal sibling of `index.ts`. The entry file owns prompting and
 * argv; this module owns side effects. `templateDir` is threaded in so
 * this module stays independent of the entry file's path constants.
 */

import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import { log, spinner } from '@clack/prompts';
import kleur from 'kleur';

import { applyUiSnapshot } from './apply-ui-snapshot.js';
import { copyTemplate } from './copy-template.js';
import { initGit } from './init-git.js';
import { injectHtmlVariants } from './inject-html-variants.js';
import { installDeps } from './install-deps.js';
import { rewritePackageManagerFields } from './rewrite-package-manager.js';
import {
  DEFAULT_VARIANTS,
  stripFeatures,
  type FeatureFlags,
  type VariantSelections,
} from './strip-features.js';

export interface CliOptions {
  targetDir: string;
  projectName: string;
  packageManager: 'pnpm' | 'npm' | 'bun';
  features: FeatureFlags;
  variants: VariantSelections;
  installDeps: boolean;
  initGit: boolean;
}

export async function scaffold(opts: CliOptions, templateDir: string): Promise<void> {
  const s = spinner();

  s.start('Copying template files');
  await mkdir(opts.targetDir, { recursive: true });
  await copyTemplate({
    src: templateDir,
    dest: opts.targetDir,
    projectName: opts.projectName,
  });
  s.stop('Template copied');

  s.start('Applying feature selection');
  await stripFeatures(opts.targetDir, opts.features, opts.variants);
  s.stop('Feature selection applied');

  // Phase J: bake the chosen `--ui` library's components into the
  // project. For `--ui custom` this is a no-op (the project keeps the
  // self-authored Radix wrappers already in `src/shared/ui/`); for
  // `--ui shadcn` / `--ui animate-ui` it swaps the seven replaceable
  // primitives for the upstream-registry copies pre-baked under
  // `template-snapshots/<ui>/`, drops `components.json` at the project
  // root, and merges the snapshot's `package-deps.json` into the
  // project's `package.json`.
  //
  // Scaffold step order:
  //   stripFeatures → applyUiSnapshot → injectHtmlVariants → rewritePackageManagerFields
  //
  // - applyUiSnapshot runs AFTER stripFeatures so feature-strip doesn't
  //   fight the snapshot files we're about to drop in.
  // - applyUiSnapshot runs BEFORE rewritePackageManagerFields so the
  //   deps merge happens on the same package.json the rewriter mutates.
  // - The order between applyUiSnapshot and injectHtmlVariants is
  //   convention rather than necessity — applyUiSnapshot only touches
  //   `src/shared/ui/*.tsx`, `components.json`, and `package.json`,
  //   while injectHtmlVariants only edits `index.html`. The two are
  //   disjoint; if the snapshot ever starts rewriting `index.html` this
  //   ordering MUST be preserved (snapshot first).
  await applyUiSnapshot(opts.targetDir, opts.variants.ui ?? DEFAULT_VARIANTS.ui!);

  // Phase I: stamp the picked design / layout onto `<html>` so the
  // first paint renders without a flash and the runtime initialisers in
  // `src/main.tsx` + `src/app/LayoutVariantContext.tsx` resolve to the
  // same value. `default` design collapses to no class/data attrs,
  // while `data-layout` is always stamped as the layout Context's
  // initial value. The `ui` axis is NOT mirrored here — it's a
  // scaffold-time file swap (Phase J), not a runtime style.
  await injectHtmlVariants(opts.targetDir, opts.variants);

  // Re-flavour `package.json` for the chosen package manager. No-op on
  // pnpm (the template is already pnpm-flavoured); for npm/bun this
  // rewrites `engines`, `packageManager`, and any `pnpm run` callsites
  // in aggregate scripts (`check`, `ci`). Workspace-scoped scripts
  // (`tauri:*`, `cap:*`) are pnpm-only — `resolvePackageManager` snaps
  // `--pm` to pnpm on desktop/mobile so we never reach this with a
  // non-pnpm PM on those platforms.
  await rewritePackageManagerFields(opts.targetDir, opts.packageManager);

  if (opts.initGit) {
    s.start('Initializing git repository');
    try {
      const result = await initGit(opts.targetDir);
      if (result.commitWarning) {
        s.stop('Git repository initialized (no initial commit)');
        log.warn(
          `git commit skipped: ${result.commitWarning}. ` +
            `Set user.email / user.name and run \`git commit\` manually.`
        );
      } else {
        s.stop('Git repository initialized');
      }
    } catch (err) {
      s.stop('Skipping git init (git not available or already initialized)');
      log.warn(String(err));
    }
  }

  if (opts.installDeps) {
    s.start(`Installing dependencies with ${opts.packageManager}`);
    try {
      await installDeps(opts.targetDir, opts.packageManager);
      s.stop('Dependencies installed');
    } catch (err) {
      s.stop(kleur.red('Dependency install failed'));
      log.error(String(err));
      log.info(
        `You can retry manually: ${kleur.cyan(
          `cd ${path.relative(process.cwd(), opts.targetDir)} && ${opts.packageManager} install`
        )}`
      );
    }
  }
}
