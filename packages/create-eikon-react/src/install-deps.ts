import { spawnCollectStderr } from './spawn-collect';

type Pm = 'pnpm' | 'npm' | 'bun';

const STDERR_TAIL_LINES = 50;

/**
 * Install deps in `cwd` using `pm`. On failure, throw an Error whose
 * message ends with the LAST 50 lines of the package manager's stderr —
 * the previous "exit code 1" message gave the user no actionable
 * information about why install actually failed.
 *
 * Stdout is intentionally still discarded — pnpm prints a long
 * dependency graph there that would drown the spinner / next-steps
 * output. Stderr carries the diagnostics the user actually needs.
 */
export async function installDeps(cwd: string, pm: Pm): Promise<void> {
  const args = pm === 'npm' ? ['install', '--no-audit', '--no-fund'] : ['install'];
  const { code, stderr } = await spawnCollectStderr(pm, args, cwd);
  if (code === 0) return;
  const lines = stderr.trimEnd().split(/\r?\n/);
  const tail = lines.slice(-STDERR_TAIL_LINES).join('\n');
  const detail = tail.length > 0 ? `\n${tail}` : '';
  throw new Error(`${pm} install exited with code ${code}${detail}`);
}
