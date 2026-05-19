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
    expect(sp.get('supabase')).toBe('off');
    expect(sp.get('query')).toBe('on');
    expect(sp.get('pm')).toBe('pnpm');
    expect(sp.get('design')).toBe('default');
    expect(sp.get('layout')).toBe('stacked');
    expect(sp.get('ui')).toBe('animate-ui');
  });

  it('round-trips through parseFromQuery losslessly', () => {
    const state = {
      ...defaultState(),
      supabase: true,
      query: false,
      pm: 'bun',
      design: 'minimal',
    };
    const round = mergeWithDefaults(parseFromQuery(serializeToQuery(state)));
    expect(round).toEqual(state);
  });
});

describe('parseFromQuery', () => {
  it('ignores unknown keys', () => {
    const out = parseFromQuery('supabase=on&unknown=42&design=minimal');
    expect(out).toEqual({ supabase: true, design: 'minimal' });
  });

  it('drops invalid enum values rather than crashing', () => {
    const out = parseFromQuery('design=hot-pink&layout=stacked');
    expect(out).toEqual({ layout: 'stacked' });
  });

  it('accepts true/false aliases for booleans', () => {
    const out = parseFromQuery('supabase=true&query=false');
    expect(out).toEqual({ supabase: true, query: false });
  });
});

describe('mergeWithDefaults', () => {
  it('fills in missing params from the schema defaults', () => {
    const out = mergeWithDefaults({ design: 'brutalist' });
    expect(out).toEqual({ ...defaultState(), design: 'brutalist' });
  });
});
