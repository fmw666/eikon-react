/**
 * @file metrics.ts
 * @description Tiny in-memory counters / observations exposed at
 * `/metrics`. Hand-rolled to match `log.ts`'s no-dep stance. Output
 * format is plain `key=value` lines — one observation per line, easy
 * to `curl /metrics | grep build_`. Not Prometheus textfmt yet (YAGNI
 * — switch when an actual scraper shows up).
 *
 * Two shapes today:
 *   - **counters**: monotonic integer events (`build_started`,
 *     `cache_hit`, `cache_miss`, `cache_eviction`, `http_5xx`).
 *   - **observations**: numeric samples (`build_duration_ms`).
 *     Stored as `count`, `sum`, `min`, `max` — enough for a back-of-
 *     the-envelope average without buffering every sample.
 *
 * No Prometheus, no histograms, no labels. Adding labels would force
 * the call sites to enumerate the cardinality up front, and we don't
 * yet have a scraper that would consume them.
 */

const counters = new Map<string, number>();

interface Observation {
  count: number;
  sum: number;
  min: number;
  max: number;
}
const observations = new Map<string, Observation>();

/** Bump a counter by `by` (default 1). Creates the entry if absent. */
export function incr(name: string, by = 1): void {
  counters.set(name, (counters.get(name) ?? 0) + by);
}

/** Record a numeric sample under `name`. Updates count/sum/min/max. */
export function observe(name: string, valueMs: number): void {
  const prev = observations.get(name);
  if (!prev) {
    observations.set(name, {
      count: 1,
      sum: valueMs,
      min: valueMs,
      max: valueMs,
    });
    return;
  }
  prev.count += 1;
  prev.sum += valueMs;
  if (valueMs < prev.min) prev.min = valueMs;
  if (valueMs > prev.max) prev.max = valueMs;
}

/**
 * Snapshot the current state as a flat `key=value` map. Used by the
 * `/metrics` HTTP handler to render text output. Each observation
 * expands to four entries (`<name>_count`, `_sum`, `_min`, `_max`).
 */
export function snapshot(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of counters) out[k] = v;
  for (const [k, o] of observations) {
    out[`${k}_count`] = o.count;
    out[`${k}_sum`] = o.sum;
    out[`${k}_min`] = o.min;
    out[`${k}_max`] = o.max;
    if (o.count > 0) out[`${k}_avg`] = Math.round(o.sum / o.count);
  }
  return out;
}

/**
 * Render the snapshot as a plain-text response body, sorted for
 * deterministic output (operators can diff two snapshots).
 */
export function renderText(): string {
  const snap = snapshot();
  const keys = Object.keys(snap).sort();
  return keys.map((k) => `${k}=${snap[k]}`).join('\n') + '\n';
}

/**
 * Test-only escape hatch. Not exported in `index.ts` — call sites
 * that legitimately need to reset state should import directly from
 * this module.
 */
export function __resetMetricsForTests(): void {
  counters.clear();
  observations.clear();
}
