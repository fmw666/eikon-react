import { spawn } from 'node:child_process';

/**
 * Spawn `cmd args` in `cwd`, discard stdout, collect stderr, and resolve
 * once the child closes. stdout is dropped on purpose (git / package
 * managers print noise there that would drown the CLI's own spinner and
 * next-steps output); stderr is captured so callers can build an
 * actionable failure message from it.
 *
 * Resolves `{ code, stderr }` for BOTH success and non-zero exits — the
 * caller decides how to format failures (`initGit` wants a terse
 * one-line tail; `installDeps` wants the last 50 lines verbatim), so this
 * helper stays formatting-agnostic. It rejects only when the process
 * cannot be spawned at all (`child.on('error')`).
 */
export function spawnCollectStderr(
  cmd: string,
  args: string[],
  cwd: string
): Promise<{ code: number | null; stderr: string }> {
  return new Promise((resolve, reject) => {
    let stderr = '';
    const child = spawn(cmd, args, {
      cwd,
      stdio: ['ignore', 'ignore', 'pipe'],
      shell: process.platform === 'win32',
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stderr }));
  });
}
