/**
 * @file replay-timeline.ts
 * @description Pure, framework-free timing + display math for the agent-chat
 * replay (see `AgentChatReplay.tsx`). Kept separate from the component so the
 * loop arithmetic — "how long has it been running, how many times have I typed
 * 请继续" — can be unit-tested without a DOM.
 *
 * The replay is a four-phase loop:
 *
 *   ready → typing → hold → sent → (loop)
 *
 *   - ready  : input empty, caret blinking, the agent's answer fully visible.
 *   - typing : the reply ("请继续") appears one glyph at a time.
 *   - hold   : the full reply sits in the box for a beat (the user "about to
 *              press Enter").
 *   - sent   : Enter fired — the typed reply stays in the box but the whole
 *              composer goes "disabled" (dimmed input, darker-coral button)
 *              while the send control spins. This is where the demo
 *              deliberately *dwells*: the agent is off burning another long
 *              stretch of time, so `spinMs` is a full ~5s. Only then do we
 *              loop back to `ready`, clearing the box, with the running stats
 *              nudged forward.
 */

export type ReplayPhase = 'ready' | 'typing' | 'hold' | 'sent';

/** Per-phase durations, in milliseconds. `charMs` is per typed glyph. */
export const REPLAY_TIMING = {
  readyMs: 1100,
  charMs: 135,
  holdMs: 700,
  /** ~5s of "the agent is working" — the dwell the demo is built around. */
  spinMs: 5000,
} as const;

/**
 * Number of loop cycles before the running stats wrap back to the start.
 * Without a cap, a tab left open for an hour would creep the "elapsed" and
 * token count up indefinitely; wrapping keeps the numbers in the believable
 * "a bit over an hour / a few million tokens" band that makes the point
 * without looking like a bug.
 */
export const LOOP_CAP = 6;

export interface LoopStats {
  /** Whole hours of elapsed run time (always 1 in the current band). */
  hours: number;
  /** Remaining minutes after the hours (16–56 across the cap). */
  minutes: number;
  /** Cumulative tokens burned, in millions (2.4–4.4 across the cap). */
  tokensM: number;
}

/**
 * Map a monotonic loop counter to the numbers shown in the panel. Each cycle
 * nudges the elapsed time and the burned-token count up a notch, so on every
 * replay the viewer sees both time and tokens visibly draining — then it
 * wraps. Tokens are in the *millions* (a realistic band for a long agent run;
 * billions would be ~1000× too high).
 *
 * The modulo is written to stay correct for any integer (including the
 * theoretical negative), so callers never have to sanitise the counter.
 */
export function computeLoopStats(cycle: number): LoopStats {
  const c = ((cycle % LOOP_CAP) + LOOP_CAP) % LOOP_CAP; // 0..LOOP_CAP-1
  const totalMinutes = 76 + c * 8; // 76..116 → "1h 16m" .. "1h 56m"
  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
    tokensM: (24 + c * 4) / 10, // 2.4..4.4 (M); c===2 → the "1h 32m · 3.2M" frame
  };
}

/**
 * Minimal `{token}` interpolation for the flat landing i18n dictionary, which
 * has no built-in placeholder support. Unknown tokens are left verbatim
 * (`{foo}`) so a missing var is visible in dev rather than silently blank.
 */
export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in vars ? String(vars[key]) : `{${key}}`
  );
}
