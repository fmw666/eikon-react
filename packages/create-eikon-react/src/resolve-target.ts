import path from 'node:path';

import { isValidPackageName, toValidPackageName } from './validate.js';

export interface ProjectTarget {
  /** Absolute path the template should be copied into. */
  targetDir: string;
  /** Value written into the generated package.json's `name` field. */
  projectName: string;
}

/**
 * Resolve the raw CLI/prompt input into an absolute target directory plus a
 * valid npm package name.
 *
 * Special case: when the input resolves to the current working directory
 * (e.g. `.`, `./`, or an absolute path equal to `cwd`), the template is
 * scaffolded in-place and the package name is derived from the cwd's
 * basename. This mirrors the `npm create vite@latest .` UX.
 */
export function resolveProjectTarget(
  rawName: string,
  cwd: string
): ProjectTarget {
  const resolvedCwd = path.resolve(cwd);
  const targetDir = path.resolve(cwd, rawName);

  if (targetDir === resolvedCwd) {
    const base = path.basename(targetDir);
    const normalized = isValidPackageName(base)
      ? base
      : toValidPackageName(base);
    return {
      targetDir,
      projectName: normalized || 'app',
    };
  }

  return {
    targetDir,
    projectName: rawName,
  };
}
