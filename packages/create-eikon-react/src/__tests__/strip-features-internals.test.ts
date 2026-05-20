import { describe, it, expect } from 'vitest';

import {
  runWithConcurrency,
  stripBlocksForFeature,
  stripBlocksForVariant,
} from '../strip-features';

describe('runWithConcurrency', () => {
  it('runs every task to completion (side-effect contract — return value is void)', async () => {
    // The pool intentionally returns void; we record completion via a
    // shared array so the test can still verify "every task ran". This
    // matches the helper's audited contract — callers in strip-features
    // always discarded the returned values, so the array allocation has
    // been removed.
    const seen: number[] = [];
    const tasks = Array.from({ length: 20 }, (_, i) => async () => {
      seen.push(i);
    });
    const out = await runWithConcurrency(tasks, 4);
    expect(out).toBeUndefined();
    expect(seen.sort((a, b) => a - b)).toEqual(
      Array.from({ length: 20 }, (_, i) => i)
    );
  });

  it('bounds the in-flight count by `limit`', async () => {
    let inFlight = 0;
    let peak = 0;
    const tasks = Array.from({ length: 30 }, () => async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      // Yield to the event loop a few times so concurrency can build up.
      await new Promise<void>((r) => setTimeout(r, 1));
      inFlight--;
    });
    await runWithConcurrency(tasks, 4);
    expect(peak).toBeLessThanOrEqual(4);
    expect(peak).toBeGreaterThan(1);
  });

  it('handles 0 and 1 task as fast paths', async () => {
    await expect(runWithConcurrency([], 8)).resolves.toBeUndefined();
    let invoked = false;
    await runWithConcurrency([
      async () => {
        invoked = true;
      },
    ], 8);
    expect(invoked).toBe(true);
  });

  it('rejects if any task rejects', async () => {
    await expect(
      runWithConcurrency(
        [
          () => Promise.resolve('ok'),
          () => Promise.reject(new Error('boom')),
        ],
        4
      )
    ).rejects.toThrow('boom');
  });
});

describe('strip block regex caching', () => {
  /*
   * Caching is implementation detail; the test is that repeated calls
   * produce IDENTICAL output regardless of call order. (A buggy cache
   * — e.g. one that mutated lastIndex across calls — would have ordering
   * artefacts that this exercises.)
   */
  const sample = [
    '// @eikon:feature(query) begin',
    'const q = useQuery();',
    '// @eikon:feature(query) end',
    'console.log("kept");',
    '// @eikon:feature(query) begin',
    'const q2 = useQuery();',
    '// @eikon:feature(query) end',
  ].join('\n');

  it('produces stable output across repeated calls', () => {
    const a = stripBlocksForFeature(sample, 'query');
    const b = stripBlocksForFeature(sample, 'query');
    const c = stripBlocksForFeature(sample, 'query');
    expect(a).toBe(b);
    expect(b).toBe(c);
    expect(a).not.toContain('@eikon:feature(query)');
  });

  it('handles multiple features without cross-contamination', () => {
    const mixed = [
      '// @eikon:feature(supabase) begin',
      'const s = sb();',
      '// @eikon:feature(supabase) end',
      '// @eikon:feature(query) begin',
      'const q = useQuery();',
      '// @eikon:feature(query) end',
    ].join('\n');
    const removedQuery = stripBlocksForFeature(mixed, 'query');
    expect(removedQuery).toContain('const s = sb();');
    expect(removedQuery).not.toContain('const q = useQuery();');

    const removedSupabase = stripBlocksForFeature(mixed, 'supabase');
    expect(removedSupabase).toContain('const q = useQuery();');
    expect(removedSupabase).not.toContain('const s = sb();');
  });
});

describe('stripBlocksForVariant regex caching', () => {
  // The axis name + value pairs below are intentionally synthetic ('foo' /
  // 'bar') so this mechanism-level test is obviously decoupled from
  // `VARIANT_CHOICES` in src/index.ts. stripBlocksForVariant doesn't validate
  // values, it just matches marker pairs by string equality.
  const sample = [
    '// @eikon:variant(design=foo) begin',
    'const x = "foo";',
    '// @eikon:variant(design=foo) end',
    '// @eikon:variant(design=bar) begin',
    'const x = "bar";',
    '// @eikon:variant(design=bar) end',
  ].join('\n');

  it('keeps the chosen value across repeated calls', () => {
    const a = stripBlocksForVariant(sample, 'design', 'foo');
    const b = stripBlocksForVariant(sample, 'design', 'foo');
    expect(a).toBe(b);
    expect(a).toContain('const x = "foo";');
    expect(a).not.toContain('const x = "bar";');
  });

  it('flips correctly between different keepValues on the same axis', () => {
    const m = stripBlocksForVariant(sample, 'design', 'foo');
    const b = stripBlocksForVariant(sample, 'design', 'bar');
    expect(m).toContain('"foo"');
    expect(m).not.toContain('"bar"');
    expect(b).toContain('"bar"');
    expect(b).not.toContain('"foo"');
  });
});
