import { describe, expect, it } from 'vitest';

import { buildCliCommand } from '../cli-command';
import { defaultState } from '../params-schema';

describe('buildCliCommand', () => {
  it('emits only the binary + project name when state matches defaults', () => {
    const cmd = buildCliCommand(defaultState());
    expect(cmd).toBe('npx create-evomap-app my-app');
  });

  it('uses the custom project name when provided', () => {
    const cmd = buildCliCommand(defaultState(), { projectName: 'my-app-2' });
    expect(cmd).toBe('npx create-evomap-app my-app-2');
  });

  it('drops the `npx` prefix when bare=true', () => {
    const cmd = buildCliCommand(defaultState(), { bare: true });
    expect(cmd).toBe('create-evomap-app my-app');
  });

  it('emits `--<flag>` when a boolean default=false is enabled', () => {
    const state = { ...defaultState(), supabase: true };
    const cmd = buildCliCommand(state);
    expect(cmd).toBe('npx create-evomap-app my-app --supabase');
  });

  it('emits `--no-<flag>` when a boolean default=true is disabled', () => {
    const state = { ...defaultState(), query: false };
    const cmd = buildCliCommand(state);
    expect(cmd).toBe('npx create-evomap-app my-app --no-query');
  });

  it('emits `--<flag> <value>` for enum overrides only', () => {
    const state = { ...defaultState(), pm: 'bun', design: 'minimal' };
    const cmd = buildCliCommand(state);
    expect(cmd).toBe(
      'npx create-evomap-app my-app --pm bun --design minimal'
    );
  });

  it('combines boolean and enum overrides in schema order', () => {
    const state = {
      ...defaultState(),
      supabase: true,
      install: false,
      pm: 'npm',
      design: 'brutalist',
      layout: 'sidebar',
      ui: 'radix',
    };
    const cmd = buildCliCommand(state);
    expect(cmd).toBe(
      'npx create-evomap-app my-app --supabase --no-install --pm npm --design brutalist --layout sidebar --ui radix'
    );
  });
});
