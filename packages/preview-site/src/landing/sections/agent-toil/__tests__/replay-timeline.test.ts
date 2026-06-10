/**
 * @file replay-timeline.test.ts
 * @description Unit coverage for the agent-chat replay's pure timing/display
 * math. The DOM-driven replay itself isn't tested here — only the arithmetic
 * that decides what numbers the panel shows on each loop.
 */

import { describe, expect, it } from 'vitest';

import { computeLoopStats, interpolate, LOOP_CAP, REPLAY_TIMING } from '../replay-timeline';

describe('computeLoopStats', () => {
  it('starts at just over an hour with a few-million token count', () => {
    expect(computeLoopStats(0)).toEqual({
      hours: 1,
      minutes: 16,
      tokensM: 2.4,
    });
  });

  it('nudges elapsed time and token count up on each cycle', () => {
    const first = computeLoopStats(0);
    const second = computeLoopStats(1);
    expect(second.minutes).toBeGreaterThan(first.minutes);
    expect(second.tokensM).toBeGreaterThan(first.tokensM);
  });

  it('shows the "1h 32m · 3.2M" frame at cycle 2', () => {
    expect(computeLoopStats(2)).toEqual({ hours: 1, minutes: 32, tokensM: 3.2 });
  });

  it('keeps the elapsed time inside the believable "1h xx" band across the cap', () => {
    for (let cycle = 0; cycle < LOOP_CAP; cycle += 1) {
      const { hours, minutes } = computeLoopStats(cycle);
      expect(hours).toBe(1);
      expect(minutes).toBeGreaterThanOrEqual(0);
      expect(minutes).toBeLessThan(60);
    }
  });

  it('wraps after LOOP_CAP so the numbers never run away', () => {
    expect(computeLoopStats(LOOP_CAP)).toEqual(computeLoopStats(0));
    expect(computeLoopStats(LOOP_CAP + 2)).toEqual(computeLoopStats(2));
  });

  it('stays correct for negative counters (defensive modulo)', () => {
    expect(computeLoopStats(-1)).toEqual(computeLoopStats(LOOP_CAP - 1));
  });
});

describe('interpolate', () => {
  it('substitutes named tokens', () => {
    expect(interpolate('{h}h {m}m', { h: 1, m: 12 })).toBe('1h 12m');
  });

  it('leaves unknown tokens verbatim so the gap is visible', () => {
    expect(interpolate('第 {n} 次', {})).toBe('第 {n} 次');
  });
});

describe('REPLAY_TIMING', () => {
  it('exposes positive durations for every phase', () => {
    for (const ms of Object.values(REPLAY_TIMING)) {
      expect(ms).toBeGreaterThan(0);
    }
  });
});
