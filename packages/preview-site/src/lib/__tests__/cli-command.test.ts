import { describe, expect, it } from 'vitest';

import {
  AGENT_NOTE,
  buildAgentInstructions,
  buildCliCommand,
} from '../cli-command';
import { defaultState } from '../params-schema';
import { snapToPlatform } from '../params-store';

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

  it('emits `--<flag> <value>` for enum overrides only', () => {
    const state = { ...defaultState(), pm: 'bun', design: 'linear' };
    const cmd = buildCliCommand(state);
    expect(cmd).toBe(
      'npx create-eikon-react <proj_name> --pm bun --design linear'
    );
  });

  it('emits `--toast-position <value>` for non-default toast position', () => {
    const state = { ...defaultState(), toastPosition: 'bottom-center' };
    const cmd = buildCliCommand(state);
    expect(cmd).toBe('npx create-eikon-react <proj_name> --toast-position bottom-center');
  });

  it('combines boolean and enum overrides in schema order', () => {
    const state = {
      ...defaultState(),
      supabase: true,
      pm: 'npm',
      design: 'anthropic',
      layout: 'sidebar',
      ui: 'custom',
      toastPosition: 'bottom-right',
    };
    const cmd = buildCliCommand(state);
    expect(cmd).toBe(
      'npx create-eikon-react <proj_name> --supabase --pm npm --design anthropic --layout sidebar --ui custom --toast-position bottom-right'
    );
  });
});

describe('buildCliCommand: platform axis', () => {
  it('emits `--platform <value>` alone when every other axis matches the platform default', () => {
    // Construct a state where every axis already matches its
    // platform-effective default — desktop's layout default is 'sidebar'
    // (not the schema-static 'stacked'), so we set it explicitly.
    const state = {
      ...defaultState(),
      platform: 'desktop',
      layout: 'sidebar',
    };
    const cmd = buildCliCommand(state);
    expect(cmd).toBe('npx create-eikon-react <proj_name> --platform desktop');
  });

  it('omits `--platform` when value matches the schema default (web)', () => {
    const cmd = buildCliCommand({ ...defaultState(), platform: 'web' });
    expect(cmd).toBe('npx create-eikon-react <proj_name>');
  });

  it('emits `--layout` only when the chosen layout differs from the platform default', () => {
    // Without snapping, defaultState().layout is 'stacked', which is NOT
    // the desktop effective default ('sidebar') — so the flag IS emitted.
    const cmd = buildCliCommand({ ...defaultState(), platform: 'desktop' });
    expect(cmd).toBe(
      'npx create-eikon-react <proj_name> --platform desktop --layout stacked'
    );
  });

  it('platform appears before the other axes (matches PARAMS order)', () => {
    // snapToPlatform pushes layout from `stacked` (invalid for mobile) to
    // mobile's default `mobile-drawer`, which then matches the effective
    // default and gets elided. Only the explicit overrides survive.
    const state = snapToPlatform(
      { ...defaultState(), platform: 'mobile', design: 'apple' },
      'mobile'
    );
    const cmd = buildCliCommand(state);
    expect(cmd).toBe(
      'npx create-eikon-react <proj_name> --platform mobile --design apple'
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
    const state = { ...defaultState(), supabase: true, design: 'linear' };
    const cmd = buildCliCommand(state);
    const out = buildAgentInstructions(cmd);
    expect(out.startsWith('`' + cmd + '`')).toBe(true);
    expect(out).toContain('--supabase');
    expect(out).toContain('--design linear');
  });

  it('reminds the agent to relocate .agent/rules and .agent/skills', () => {
    expect(AGENT_NOTE).toContain('.agent/rules/');
    expect(AGENT_NOTE).toContain('.agent/skills/');
  });
});
