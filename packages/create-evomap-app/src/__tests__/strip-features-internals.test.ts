import { describe, it, expect } from 'vitest';

import {
  runWithConcurrency,
  stripBlocksForFeature,
  stripBlocksForVariant,
} from '../strip-features';

describe('runWithConcurrency', () => {
  it('runs every task and preserves input order in the result', async () => {
    const tasks = Array.from({ length: 20 }, (_, i) => () =>
      Promise.resolve(i * 2)
    );
    const out = await runWithConcurrency(tasks, 4);
    expect(out).toEqual(tasks.map((_, i) => i * 2));
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
      return 1;
    });
    await runWithConcurrency(tasks, 4);
    expect(peak).toBeLessThanOrEqual(4);
    expect(peak).toBeGreaterThan(1);
  });

  it('handles 0 and 1 task as fast paths', async () => {
    expect(await runWithConcurrency([], 8)).toEqual([]);
    expect(
      await runWithConcurrency([() => Promise.resolve('only')], 8)
    ).toEqual(['only']);
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
    '// @evomap:feature(query) begin',
    'const q = useQuery();',
    '// @evomap:feature(query) end',
    'console.log("kept");',
    '// @evomap:feature(query) begin',
    'const q2 = useQuery();',
    '// @evomap:feature(query) end',
  ].join('\n');

  it('produces stable output across repeated calls', () => {
    const a = stripBlocksForFeature(sample, 'query');
    const b = stripBlocksForFeature(sample, 'query');
    const c = stripBlocksForFeature(sample, 'query');
    expect(a).toBe(b);
    expect(b).toBe(c);
    expect(a).not.toContain('@evomap:feature(query)');
  });

  it('handles multiple features without cross-contamination', () => {
    const mixed = [
      '// @evomap:feature(supabase) begin',
      'const s = sb();',
      '// @evomap:feature(supabase) end',
      '// @evomap:feature(query) begin',
      'const q = useQuery();',
      '// @evomap:feature(query) end',
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
  const sample = [
    '// @evomap:variant(design=minimal) begin',
    'const x = "minimal";',
    '// @evomap:variant(design=minimal) end',
    '// @evomap:variant(design=brutalist) begin',
    'const x = "brutalist";',
    '// @evomap:variant(design=brutalist) end',
  ].join('\n');

  it('keeps the chosen value across repeated calls', () => {
    const a = stripBlocksForVariant(sample, 'design', 'minimal');
    const b = stripBlocksForVariant(sample, 'design', 'minimal');
    expect(a).toBe(b);
    expect(a).toContain('const x = "minimal";');
    expect(a).not.toContain('const x = "brutalist";');
  });

  it('flips correctly between different keepValues on the same axis', () => {
    const m = stripBlocksForVariant(sample, 'design', 'minimal');
    const b = stripBlocksForVariant(sample, 'design', 'brutalist');
    expect(m).toContain('"minimal"');
    expect(m).not.toContain('"brutalist"');
    expect(b).toContain('"brutalist"');
    expect(b).not.toContain('"minimal"');
  });
});
