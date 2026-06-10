import { spawnCollectStderr } from './spawn-collect';

async function exec(
  cmd: string,
  args: string[],
  cwd: string
): Promise<{ stderr: string }> {
  const { code, stderr } = await spawnCollectStderr(cmd, args, cwd);
  if (code === 0) return { stderr };
  // git errors are short — a terse one-line tail (last 5 lines, ` / `
  // separated) is enough to point the user at the cause.
  const trimmed = stderr.trim();
  const tail = trimmed
    ? `: ${trimmed.split(/\r?\n/).slice(-5).join(' / ')}`
    : '';
  throw new Error(`${cmd} ${args.join(' ')} exited with code ${code}${tail}`);
}

export interface InitGitResult {
  /** Whether `git init` succeeded — if false, the dir has no `.git`. */
  initialized: boolean;
  /** Reason `git commit` couldn't complete (missing identity, hooks, etc.) — null on success. */
  commitWarning: string | null;
}

export async function initGit(cwd: string): Promise<InitGitResult> {
  await exec('git', ['init', '-q'], cwd);
  try {
    await exec('git', ['add', '-A'], cwd);
    await exec(
      'git',
      ['commit', '-q', '-m', 'chore: scaffold via create-eikon-react'],
      cwd
    );
    return { initialized: true, commitWarning: null };
  } catch (err) {
    // The repo is initialised but the initial commit didn't land. Common
    // cause is a missing user.email / user.name on the host. We surface
    // the actual error rather than swallowing it so the user can fix it
    // and run `git commit` themselves — `initGit` never aborts scaffold.
    return { initialized: true, commitWarning: String(err) };
  }
}
