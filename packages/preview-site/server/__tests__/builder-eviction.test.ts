import { describe, it, expect, beforeEach } from 'vitest';

import { selectHashesToEvict, __testHooks } from '../builder';

describe('selectHashesToEvict', () => {
  const make = (name: string, mtime: number) => ({ name, mtime });

  it('returns nothing when the cache is under the cap', () => {
    const dirs = [make('a', 1), make('b', 2)];
    expect(selectHashesToEvict(dirs, 8, new Set())).toEqual([]);
  });

  it('returns nothing when the cache equals the cap', () => {
    const dirs = Array.from({ length: 8 }, (_, i) => make(`h${i}`, i));
    expect(selectHashesToEvict(dirs, 8, new Set())).toEqual([]);
  });

  it('evicts the oldest entries beyond the cap (by mtime)', () => {
    const dirs = [
      make('oldest', 1),
      make('mid', 5),
      make('newest', 10),
    ];
    // Cap of 1 means keep only the newest; the other two must be evicted.
    const out = selectHashesToEvict(dirs, 1, new Set());
    expect(new Set(out)).toEqual(new Set(['oldest', 'mid']));
  });

  it('never evicts hashes that appear in the keep set', () => {
    const dirs = [
      make('inflight-old', 1), // would normally be evicted
      make('idle-mid', 5),
      make('idle-new', 10),
    ];
    // Cap of 1, but `inflight-old` is held by an active build.
    const out = selectHashesToEvict(
      dirs,
      1,
      new Set(['inflight-old'])
    );
    expect(out).toEqual(['idle-mid']);
  });

  it('does not mutate its input', () => {
    const dirs = [make('a', 3), make('b', 1), make('c', 2)];
    const snapshot = JSON.stringify(dirs);
    selectHashesToEvict(dirs, 1, new Set());
    expect(JSON.stringify(dirs)).toEqual(snapshot);
  });
});

describe('error map cap', () => {
  beforeEach(() => {
    __testHooks.clearErrors();
  });

  it('honours MAX_RETAINED_ERRORS (drops oldest first)', () => {
    const cap = __testHooks.MAX_RETAINED_ERRORS;
    // Fill 1.5x the cap so we exercise the eviction loop multiple times.
    const total = Math.floor(cap * 1.5);
    for (let i = 0; i < total; i++) {
      __testHooks.setError(`hash-${i}`, `error #${i}`);
    }
    __testHooks.capErrors();
    expect(__testHooks.countErrors()).toBe(cap);
  });

  it('is a no-op when below the cap', () => {
    __testHooks.setError('a', 'boom');
    __testHooks.setError('b', 'boom');
    __testHooks.capErrors();
    expect(__testHooks.countErrors()).toBe(2);
  });
});
