#!/usr/bin/env node
/**
 * @file check-no-preview-cache.mjs
 * @description Pre-commit guard: refuse a commit that stages anything
 * under `.preview-cache/`. The directory is .gitignore'd, but a
 * `git add -f` can still drop stripped variants of source into a commit
 * — that would commit a transient build artifact whose hash bakes the
 * caller's exact playground inputs, polluting history with non-source.
 * P5.8 in tech-debt-cleanup.
 */

import { execSync } from 'node:child_process';

let staged;
try {
  staged = execSync('git diff --cached --name-only', { encoding: 'utf8' });
} catch (err) {
  console.error('[pre-commit] failed to read staged files:', err.message);
  process.exit(1);
}

const offenders = staged
  .split('\n')
  .map((s) => s.trim())
  .filter((s) => s.length > 0)
  .filter((p) => p.includes('.preview-cache/'));

if (offenders.length > 0) {
  console.error(
    '[pre-commit] refusing to commit `.preview-cache/` content:'
  );
  for (const p of offenders) console.error('  ' + p);
  console.error(
    '\nThis directory is a transient build artifact (gitignored). ' +
      'If you need to inspect a stripped variant, copy the relevant ' +
      'file out of `.preview-cache/` before staging.'
  );
  process.exit(1);
}

process.exit(0);
