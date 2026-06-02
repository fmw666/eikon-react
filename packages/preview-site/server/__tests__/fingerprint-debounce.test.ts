import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  invalidateTemplateRev,
  scheduleInvalidateTemplateRev,
} from '../fingerprint';

describe('scheduleInvalidateTemplateRev', () => {
  beforeEach(() => {
    // Only fake the timer APIs the debounce actually uses. Faking the
    // full default set (which includes queueMicrotask / nextTick) lets
    // vitest's own async hook-teardown promise hang under CI's
    // scheduling, surfacing as a 10s "afterEach hook timed out" — even
    // though every assertion here passes. Restricting `toFake` keeps
    // the microtask queue real so teardown resolves normally.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    invalidateTemplateRev();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('coalesces a burst of calls into a single flush callback', () => {
    const onFlush = vi.fn();
    scheduleInvalidateTemplateRev(onFlush);
    scheduleInvalidateTemplateRev(onFlush);
    scheduleInvalidateTemplateRev(onFlush);

    // Before the debounce window elapses, nothing fires.
    vi.advanceTimersByTime(20);
    expect(onFlush).not.toHaveBeenCalled();

    vi.advanceTimersByTime(200);
    expect(onFlush).toHaveBeenCalledTimes(1);
  });

  it('uses the LAST onFlush passed in (overrides prior callbacks)', () => {
    const a = vi.fn();
    const b = vi.fn();
    scheduleInvalidateTemplateRev(a);
    scheduleInvalidateTemplateRev(b);

    vi.advanceTimersByTime(500);
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('flushes again after a fresh burst', () => {
    const onFlush = vi.fn();
    scheduleInvalidateTemplateRev(onFlush);
    vi.advanceTimersByTime(500);
    expect(onFlush).toHaveBeenCalledTimes(1);

    scheduleInvalidateTemplateRev(onFlush);
    vi.advanceTimersByTime(500);
    expect(onFlush).toHaveBeenCalledTimes(2);
  });

  it('is safe to call without an onFlush callback', () => {
    expect(() => {
      scheduleInvalidateTemplateRev();
      vi.advanceTimersByTime(500);
    }).not.toThrow();
  });
});
