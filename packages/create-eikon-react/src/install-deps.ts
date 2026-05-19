import { spawn } from 'node:child_process';

type Pm = 'pnpm' | 'npm' | 'bun';

export function installDeps(cwd: string, pm: Pm): Promise<void> {
  const args = pm === 'npm' ? ['install', '--no-audit', '--no-fund'] : ['install'];
  return new Promise((resolve, reject) => {
    const child = spawn(pm, args, {
      cwd,
      stdio: 'ignore',
      shell: process.platform === 'win32',
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${pm} install exited with code ${code}`));
    });
  });
}
