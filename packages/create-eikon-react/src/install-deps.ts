import { spawn } from 'node:child_process';

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
export function installDeps(cwd: string, pm: Pm): Promise<void> {
  const args = pm === 'npm' ? ['install', '--no-audit', '--no-fund'] : ['install'];
  return new Promise((resolve, reject) => {
    let stderr = '';
    const child = spawn(pm, args, {
      cwd,
      stdio: ['ignore', 'ignore', 'pipe'],
      shell: process.platform === 'win32',
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      const lines = stderr.trimEnd().split(/\r?\n/);
      const tail = lines.slice(-STDERR_TAIL_LINES).join('\n');
      const detail = tail.length > 0 ? `\n${tail}` : '';
      reject(new Error(`${pm} install exited with code ${code}${detail}`));
    });
  });
}
