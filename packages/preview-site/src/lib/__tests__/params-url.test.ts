import { describe, expect, it } from 'vitest';

import { defaultState } from '../params-schema';
import {
  mergeWithDefaults,
  parseFromQuery,
  serializeToQuery,
} from '../params-url';

describe('serializeToQuery', () => {
  it('serializes defaults with boolean=on/off and enum=value', () => {
    const qs = serializeToQuery(defaultState());
    const sp = new URLSearchParams(qs);
    expect(sp.get('platform')).toBe('web');
    expect(sp.get('supabase')).toBe('off');
    expect(sp.get('query')).toBe('on');
    expect(sp.get('pm')).toBe('pnpm');
    expect(sp.get('design')).toBe('default');
    expect(sp.get('layout')).toBe('stacked');
    expect(sp.get('ui')).toBe('animate-ui');
    expect(sp.get('toast')).toBe('default');
  });

  it('round-trips through parseFromQuery losslessly', () => {
    const state = {
      ...defaultState(),
      supabase: true,
      query: false,
      pm: 'bun',
      design: 'linear',
      toast: 'minimal',
    };
    const round = mergeWithDefaults(parseFromQuery(serializeToQuery(state)));
    expect(round).toEqual(state);
  });
});

describe('parseFromQuery', () => {
  it('ignores unknown keys', () => {
    const out = parseFromQuery('supabase=on&unknown=42&design=linear');
    expect(out).toEqual({ supabase: true, design: 'linear' });
  });

  it('drops invalid enum values rather than crashing', () => {
    const out = parseFromQuery(
      'design=hot-pink&layout=stacked&toast=not-a-preset'
    );
    expect(out).toEqual({ layout: 'stacked' });
  });

  it('accepts true/false aliases for booleans', () => {
    const out = parseFromQuery('supabase=true&query=false');
    expect(out).toEqual({ supabase: true, query: false });
  });
});

describe('mergeWithDefaults', () => {
  it('fills in missing params from the schema defaults', () => {
    const out = mergeWithDefaults({ design: 'anthropic' });
    expect(out).toEqual({ ...defaultState(), design: 'anthropic' });
  });
});

describe('platform axis round-trip', () => {
  it('serializes and parses the chosen platform', () => {
    const state = { ...defaultState(), platform: 'mobile' };
    const qs = serializeToQuery(state);
    expect(new URLSearchParams(qs).get('platform')).toBe('mobile');
    const parsed = parseFromQuery(qs);
    expect(parsed.platform).toBe('mobile');
  });

  it('drops invalid platform values rather than crashing', () => {
    const out = parseFromQuery('platform=linux&design=linear');
    expect(out.platform).toBeUndefined();
    // Other valid params still come through.
    expect(out.design).toBe('linear');
  });

  it('treats absent platform as default (no key in partial state)', () => {
    const out = parseFromQuery('design=apple');
    expect(out.platform).toBeUndefined();
    expect(out.design).toBe('apple');
    // mergeWithDefaults fills the gap.
    expect(mergeWithDefaults(out).platform).toBe('web');
  });
});
