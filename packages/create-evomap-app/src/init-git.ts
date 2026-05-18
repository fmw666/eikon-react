import { spawn } from 'node:child_process';

function exec(cmd: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      stdio: 'ignore',
      shell: process.platform === 'win32',
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

export async function initGit(cwd: string): Promise<void> {
  await exec('git', ['init', '-q'], cwd);
  try {
    await exec('git', ['add', '-A'], cwd);
    await exec(
      'git',
      ['commit', '-q', '-m', 'chore: scaffold via create-evomap-app'],
      cwd
    );
  } catch {
    // If commit fails (no git identity etc.) we still leave the repo initialized.
  }
}
