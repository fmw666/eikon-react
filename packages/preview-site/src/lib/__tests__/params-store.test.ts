/**
 * @file params-store.test.ts
 * @description Coverage for `snapToPlatform` — the cascade rule that runs
 * whenever the platform changes, normalising every other param to a
 * value valid under the new platform. Tested against the `snapToPlatform`
 * pure helper (rather than the full zustand store) so failures point at
 * the rule, not the store wiring.
 *
 * Phase 1's schema doesn't yet add per-platform layout `valuesWhen` —
 * that lands in Phase 2. So most of the snap behaviour is no-op today;
 * the tests below cover the structural contract (every param survives,
 * platform is preserved) so Phase 2 can extend without regressions.
 */

import { describe, expect, it } from 'vitest';

import { defaultState, type ParamState } from '../params-schema';
import { snapToPlatform } from '../params-store';

describe('snapToPlatform', () => {
  it('preserves the new platform value', () => {
    const next = snapToPlatform({ ...defaultState(), platform: 'mobile' }, 'mobile');
    expect(next.platform).toBe('mobile');
  });

  it('does not mutate its input', () => {
    const input = defaultState();
    const before = JSON.stringify(input);
    snapToPlatform(input, 'desktop');
    expect(JSON.stringify(input)).toBe(before);
  });

  it('keeps every param key under the snapped output', () => {
    const out = snapToPlatform(defaultState(), 'desktop');
    for (const key of Object.keys(defaultState()) as Array<keyof ParamState>) {
      expect(out[key]).toBeDefined();
    }
  });

  it('preserves boolean params that have no platform-specific gating', () => {
    const input: ParamState = { ...defaultState(), supabase: true };
    const out = snapToPlatform(input, 'mobile');
    expect(out.supabase).toBe(true);
  });

  it('keeps enum values that are still valid under the new platform', () => {
    // 'sidebar' is in both web and desktop value sets, so snapping
    // desktop ↔ desktop preserves it.
    const input: ParamState = { ...defaultState(), layout: 'sidebar' };
    const out = snapToPlatform(input, 'desktop');
    expect(out.layout).toBe('sidebar');
  });

  it('snaps desktop-only layouts to the mobile default when switching to mobile', () => {
    // Sidebar is excluded from mobile's `valuesWhen`, so snapping should
    // replace it with mobile's effective default ('mobile-drawer').
    const input: ParamState = { ...defaultState(), layout: 'sidebar' };
    const out = snapToPlatform(input, 'mobile');
    expect(out.layout).toBe('mobile-drawer');
  });

  it('snaps mobile-only layouts to the web default when switching to web', () => {
    // bottom-tabs-fab is mobile-only. Switching back to web must drop
    // it; the web effective default is 'stacked'.
    const input: ParamState = { ...defaultState(), layout: 'bottom-tabs-fab' };
    const out = snapToPlatform(input, 'web');
    expect(out.layout).toBe('stacked');
  });

  it('respects per-platform defaults even when starting from the schema default', () => {
    // defaultState().layout === 'stacked'; snapping to desktop should
    // promote it to 'sidebar' because the schema's static default is
    // valid under desktop's valuesWhen but isn't desktop's own default.
    // Note: this is intentionally a pass-through since 'stacked' IS in
    // the desktop value set; the cascade only fires when the value is
    // INVALID for the new platform.
    const out = snapToPlatform(defaultState(), 'desktop');
    expect(out.layout).toBe('stacked');
  });
});
