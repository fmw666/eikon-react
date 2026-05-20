/**
 * @file params-schema.test.ts
 * @description Coverage for the cross-axis helpers introduced alongside the
 * `platform` tab. The schema's static behaviour (PARAMS list, defaults,
 * `coerceValue` for unknown inputs) is exercised indirectly through
 * `params-url.test.ts` and `cli-command.test.ts`; this file pins down the
 * platform-aware filtering / narrowing semantics that those tests don't
 * touch.
 */

import { describe, expect, it } from 'vitest';

import {
  PARAMS,
  PLATFORM_VALUES,
  coerceValue,
  coercePlatform,
  defaultState,
  getEffectiveDefault,
  getEffectiveValues,
  getParam,
  isAvailable,
} from '../params-schema';

describe('params-schema: PARAMS list', () => {
  it('lists `platform` first so the prompt / UI naturally surfaces it', () => {
    expect(PARAMS[0]?.id).toBe('platform');
  });

  it('platform values are exactly web / desktop / mobile', () => {
    expect(PLATFORM_VALUES).toEqual(['web', 'desktop', 'mobile']);
  });

  it('default state pins platform to "web" — the safest target', () => {
    expect(defaultState().platform).toBe('web');
  });
});

describe('coercePlatform', () => {
  it('passes through known values', () => {
    expect(coercePlatform('web')).toBe('web');
    expect(coercePlatform('desktop')).toBe('desktop');
    expect(coercePlatform('mobile')).toBe('mobile');
  });

  it('falls back to "web" for unknown / wrong-typed input', () => {
    expect(coercePlatform('linux')).toBe('web');
    expect(coercePlatform(undefined)).toBe('web');
    expect(coercePlatform(42)).toBe('web');
  });
});

describe('isAvailable', () => {
  it('returns true for params without an availableWhen filter', () => {
    const layout = getParam('layout');
    expect(layout).toBeDefined();
    expect(isAvailable(layout!, 'web')).toBe(true);
    expect(isAvailable(layout!, 'mobile')).toBe(true);
  });
});

describe('getEffectiveValues', () => {
  it('returns the unconstrained values when the param has no valuesWhen', () => {
    const ui = getParam('ui');
    expect(ui).toBeDefined();
    expect(ui!.kind).toBe('enum');
    if (ui!.kind !== 'enum') return;
    expect(getEffectiveValues(ui!, 'mobile')).toEqual(ui!.values);
  });
});

describe('getEffectiveDefault', () => {
  it('returns the static default when no defaultWhen is keyed', () => {
    const design = getParam('design');
    expect(design).toBeDefined();
    if (design!.kind !== 'enum') return;
    expect(getEffectiveDefault(design!, 'mobile')).toBe('default');
  });
});

describe('coerceValue platform-aware narrowing', () => {
  it('without platform: accepts any value in def.values', () => {
    const layout = getParam('layout');
    if (layout!.kind !== 'enum') return;
    expect(coerceValue(layout!, 'sidebar')).toBe('sidebar');
    expect(coerceValue(layout!, 'stacked')).toBe('stacked');
  });

  it('boolean coercion ignores platform argument', () => {
    const supabase = getParam('supabase');
    expect(coerceValue(supabase!, 'on', 'mobile')).toBe(true);
    expect(coerceValue(supabase!, 'off', 'desktop')).toBe(false);
  });

  it('returns undefined for unknown enum values regardless of platform', () => {
    const design = getParam('design');
    expect(coerceValue(design!, 'hot-pink')).toBeUndefined();
    expect(coerceValue(design!, 'hot-pink', 'mobile')).toBeUndefined();
  });
});
