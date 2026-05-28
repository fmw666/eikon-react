// Cross-platform dev orchestrator for the CLI package.
//
// `pnpm dev` previously ran `tsup --watch` only, which left the bundled
// `template/` snapshot stale whenever a contributor edited the
// source-of-truth at `packages/template-react/`. They had to remember
// to run `pnpm build` to pick up changes. Audit close-out
// (accepted-debt A.23): the dev loop now also re-syncs the template
// on edits.
//
// Implemented as a Node script rather than `concurrently` to avoid
// adding a dev dep. Both children inherit stdio; on Ctrl-C the parent
// forwards the signal so they shut down cleanly.

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI_DIR = path.resolve(__dirname, '..');

const isWin = process.platform === 'win32';

const children = [
  spawn(process.execPath, ['./scripts/sync-template.mjs', '--watch'], {
    cwd: CLI_DIR,
    stdio: 'inherit',
    shell: false,
  }),
  spawn(isWin ? 'tsup.cmd' : 'tsup', ['--watch'], {
    cwd: CLI_DIR,
    stdio: 'inherit',
    // tsup is exposed as a `node_modules/.bin/tsup(.cmd)` shim. spawn
    // resolves that against PATH inheritance from pnpm — `shell: true`
    // on Windows ensures the .cmd shim is invoked correctly.
    shell: isWin,
  }),
];

let exiting = false;
const shutdown = (signal) => {
  if (exiting) return;
  exiting = true;
  for (const child of children) {
    if (!child.killed) child.kill(signal);
  }
  setTimeout(() => process.exit(0), 200).unref();
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// If any child exits, take down the rest. The watcher pair only makes
// sense as a unit; a half-running pair leaves the user unaware that
// one of them died.
for (const child of children) {
  child.on('exit', (code) => {
    if (exiting) return;
    console.error(`[dev] child exited (code=${code ?? 'null'}) — shutting down siblings`);
    shutdown('SIGTERM');
  });
}
