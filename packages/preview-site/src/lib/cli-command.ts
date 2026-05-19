import { PARAMS, type ParamState } from './params-schema';

export interface BuildCliCommandOptions {
  /** Project name positional arg. */
  projectName?: string;
  /** Drop the leading `npx ` so users can paste into other runners. */
  bare?: boolean;
}

/**
 * Render a `create-evomap-app` invocation that reproduces the given state.
 *
 * Only params whose value differs from the schema default are emitted, so the
 * displayed command stays as short as possible — the CLI applies the same
 * defaults internally.
 */
export function buildCliCommand(
  state: ParamState,
  opts: BuildCliCommandOptions = {}
): string {
  const tokens: string[] = [];
  if (!opts.bare) tokens.push('npx');
  tokens.push('create-evomap-app');
  tokens.push(opts.projectName ?? 'my-app');

  for (const def of PARAMS) {
    const v = state[def.id];
    if (v === def.default) continue;

    if (def.kind === 'boolean') {
      tokens.push(v ? `--${def.cliFlag}` : `--no-${def.cliFlag}`);
    } else {
      tokens.push(`--${def.cliFlag}`, String(v));
    }
  }

  return tokens.join(' ');
}
