/**
 * @file log.ts
 * @description Hand-rolled structured-event logger. Replaces every
 * `console.warn('[builder] msg')` site in the server with a uniform
 * one-line JSON record:
 *
 *   {"ts":1748419200000,"event":"build_started","hash":"abcdef012345",...}
 *
 * Why hand-rolled: zero deps, ~30 lines, matches the existing `[prefix]`
 * convention without dragging in pino/winston transitive deps. Fly's
 * `fly logs` view stays grep-able (the `event` field is the headline)
 * and the JSON is parseable by any downstream tool the operator picks
 * up later.
 *
 * Fields convention:
 *   - `event` is required and load-bearing — it's the primary grep key.
 *     Use snake_case nouns/verbs: `build_started`, `cache_hit`,
 *     `http_error`.
 *   - Add hash / requestId / route / duration_ms whenever the event
 *     touches them. Operators correlate across lines via these fields.
 *   - Don't log payloads or user input — every value goes through
 *     JSON.stringify, but the goal is to keep log volume bounded and
 *     sensitive data off Fly logs.
 */

export interface LogFields {
  readonly [key: string]: unknown;
}

/**
 * Emit one JSON event to stdout. Uses `process.stdout.write` directly
 * (not console.log) so a custom Node `console` shim cannot intercept
 * the structured stream and add line decoration.
 */
export function logEvent(event: string, fields: LogFields = {}): void {
  const record = { ts: Date.now(), event, ...fields };
  try {
    process.stdout.write(`${JSON.stringify(record)}\n`);
  } catch {
    // Best-effort: a stdout that rejects writes (broken pipe during
    // shutdown, exhausted file descriptors) shouldn't crash the
    // request-handling path. Drop the line silently — the alternative
    // is propagating the error and forcing every call site to wrap.
  }
}

/**
 * Emit an error event with stack info. Convenience wrapper that
 * normalises `Error` vs unknown and writes to the same stream as
 * `logEvent` so all events live on stdout (Fly aggregates stdout +
 * stderr into one stream anyway, but keeping them on one channel makes
 * local tail | grep cleaner).
 */
export function logError(
  event: string,
  err: unknown,
  fields: LogFields = {}
): void {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  logEvent(event, {
    ...fields,
    error_message: message,
    ...(stack ? { error_stack: stack } : {}),
  });
}
