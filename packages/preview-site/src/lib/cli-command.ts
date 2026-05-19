import { PARAMS, type ParamState } from './params-schema';

/**
 * Placeholder rendered in place of the positional project-name arg when the
 * caller doesn't supply one. The angle-bracket form is intentional: it signals
 * to a coding agent reading the snippet that this slot must be substituted
 * with a real path (`.`, `app`, `my-app`, …) before running the command.
 */
export const PROJECT_NAME_PLACEHOLDER = '<proj_name>';

export interface BuildCliCommandOptions {
  /** Project name positional arg. Defaults to `<proj_name>` placeholder. */
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
  tokens.push(opts.projectName ?? PROJECT_NAME_PLACEHOLDER);

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

/**
 * Plain-text instructions appended after the command when the user copies the
 * snippet from the playground. Written so an agent can act on it directly: it
 * names the placeholder, lists the canonical target shapes (`.`, sub-folder,
 * fresh name), and reminds the agent to re-home the generated `.agent/`
 * payload into wherever its own rule/skill loader looks.
 *
 * Kept as a single newline-free string on purpose — markdown renderers and
 * chat clients reflow it cleanly, and the leading bare-string form makes it
 * trivial to grep/replace from CI if we need to tweak the wording.
 */
export const AGENT_NOTE =
  'Agent note: replace `<proj_name>` with whatever target makes sense for the' +
  ' task — use `.` to scaffold into the current directory, a sub-folder name' +
  ' like `app` to drop the template inside an existing project, or any new' +
  ' name (e.g. `my-app`) to create a fresh directory. After the CLI finishes,' +
  ' copy the generated `.agent/rules/` and `.agent/skills/` into the location' +
  " your real coding agent reads (e.g. `.cursor/rules/`, `.claude/skills/`," +
  " or the equivalent) so the agent picks up this project's conventions.";

/**
 * Render the full clipboard payload for the playground's "Copy" button:
 * the CLI invocation wrapped in backticks so it shows up as inline code in
 * markdown clients, followed by a blank line and the agent note above.
 */
export function buildAgentInstructions(command: string): string {
  return `\`${command}\`\n\n${AGENT_NOTE}`;
}
