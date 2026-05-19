import { describe, expect, it } from 'vitest';

import {
  AGENT_NOTE,
  buildAgentInstructions,
  buildCliCommand,
} from '../cli-command';
import { defaultState } from '../params-schema';

describe('buildCliCommand', () => {
  it('emits the binary + <proj_name> placeholder when state matches defaults', () => {
    const cmd = buildCliCommand(defaultState());
    expect(cmd).toBe('npx create-eikon-react <proj_name>');
  });

  it('uses the custom project name when provided', () => {
    const cmd = buildCliCommand(defaultState(), { projectName: 'my-app-2' });
    expect(cmd).toBe('npx create-eikon-react my-app-2');
  });

  it('drops the `npx` prefix when bare=true', () => {
    const cmd = buildCliCommand(defaultState(), { bare: true });
    expect(cmd).toBe('create-eikon-react <proj_name>');
  });

  it('emits `--<flag>` when a boolean default=false is enabled', () => {
    const state = { ...defaultState(), supabase: true };
    const cmd = buildCliCommand(state);
    expect(cmd).toBe('npx create-eikon-react <proj_name> --supabase');
  });

  it('emits `--no-<flag>` when a boolean default=true is disabled', () => {
    const state = { ...defaultState(), query: false };
    const cmd = buildCliCommand(state);
    expect(cmd).toBe('npx create-eikon-react <proj_name> --no-query');
  });

  it('emits `--<flag> <value>` for enum overrides only', () => {
    const state = { ...defaultState(), pm: 'bun', design: 'linear' };
    const cmd = buildCliCommand(state);
    expect(cmd).toBe(
      'npx create-eikon-react <proj_name> --pm bun --design linear'
    );
  });

  it('emits `--toast <value>` for non-default toast preset', () => {
    const state = { ...defaultState(), toast: 'minimal' };
    const cmd = buildCliCommand(state);
    expect(cmd).toBe('npx create-eikon-react <proj_name> --toast minimal');
  });

  it('combines boolean and enum overrides in schema order', () => {
    const state = {
      ...defaultState(),
      supabase: true,
      pm: 'npm',
      design: 'anthropic',
      layout: 'sidebar',
      ui: 'radix',
      toast: 'glass',
    };
    const cmd = buildCliCommand(state);
    expect(cmd).toBe(
      'npx create-eikon-react <proj_name> --supabase --pm npm --design anthropic --layout sidebar --ui radix --toast glass'
    );
  });
});

describe('buildAgentInstructions', () => {
  it('wraps the command in backticks and appends the agent note', () => {
    const cmd = buildCliCommand(defaultState());
    const out = buildAgentInstructions(cmd);
    expect(out).toBe(
      '`npx create-eikon-react <proj_name>`\n\n' + AGENT_NOTE
    );
  });

  it('preserves any flags emitted by the command', () => {
    const state = { ...defaultState(), supabase: true, query: false };
    const cmd = buildCliCommand(state);
    const out = buildAgentInstructions(cmd);
    expect(out.startsWith('`' + cmd + '`')).toBe(true);
    expect(out).toContain('--supabase');
    expect(out).toContain('--no-query');
  });

  it('reminds the agent to relocate .agent/rules and .agent/skills', () => {
    expect(AGENT_NOTE).toContain('.agent/rules/');
    expect(AGENT_NOTE).toContain('.agent/skills/');
  });
});
