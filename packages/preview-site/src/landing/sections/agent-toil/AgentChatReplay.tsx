/**
 * @file AgentChatReplay.tsx
 * @description The replayable "agent product" chat mock used by the AgentToil
 * section. It tells one small, looping story:
 *
 *   1. An agent has been running for over an hour. Its answer is on screen:
 *      scaffolding done, tooling wired, quality pass green — and a closing
 *      question that the current design still has an architectural flaw, so
 *      should it keep going?
 *   2. The user types "请继续" into the box, glyph by glyph.
 *   3. They press Enter. The input clears, the send button becomes a spinner
 *      and spins — the agent is off burning another stretch of time/tokens.
 *   4. A beat later the whole thing loops, with the elapsed clock and the
 *      "请继续" tally nudged one notch higher each time.
 *
 * Why JS-driven (not pure CSS like the Hero terminal): the sequence has a
 * typing pass whose length depends on the localized reply, an Enter beat, a
 * spinner beat, and per-loop counters — a state machine reads far clearer
 * than a stack of `animation-delay`s. The timing/loop arithmetic lives in the
 * pure `replay-timeline.ts` (unit-tested); this file is the presentation.
 *
 * Respect for the visitor:
 *   - `prefers-reduced-motion` → no loop at all; we render a static composed
 *     frame (reply sitting in the box, no spinner) so the story still reads.
 *   - Off-screen → the loop is paused via IntersectionObserver so a panel the
 *     visitor has scrolled past isn't churning timers in the background.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';

import { useI18n } from '../../theme/i18n';
import { computeLoopStats, interpolate, REPLAY_TIMING, type ReplayPhase } from './replay-timeline';
import { useInView } from './use-in-view';

interface AgentChatReplayProps {
  /**
   * Optional visibility signal. The panel is rendered inside a 3D float tilt,
   * and IntersectionObserver never fires for a target inside a 3D-transformed
   * subtree (see use-in-view.ts) — so the parent observes the panel's
   * untransformed container and passes the result here. When omitted (e.g.
   * standalone use with no 3D wrapper) the panel falls back to observing
   * itself.
   */
  inView?: boolean;
}

export function AgentChatReplay({ inView: inViewProp }: AgentChatReplayProps = {}) {
  const { t } = useI18n();
  const hostRef = useRef<HTMLDivElement | null>(null);

  const reducedMotion = usePrefersReducedMotion();
  // Self-observe only when the parent hasn't supplied a signal — observing the
  // panel directly is unreliable once it's wrapped in the 3D float tilt.
  const selfInView = useInView(hostRef, inViewProp === undefined);
  const inView = inViewProp ?? selfInView;
  const animate = inView && !reducedMotion;

  const { typed, phase, cycle } = useReplay(t('toil.demo.reply'), animate);

  // In the static (reduced-motion) frame, show the reply already sitting in
  // the box so the "请继续" beat still reads without any motion.
  const staticReply = reducedMotion ? t('toil.demo.reply') : '';
  const shownText = reducedMotion ? staticReply : typed;
  const isSending = phase === 'sent';

  const stats = computeLoopStats(cycle);
  const elapsed = interpolate(t('toil.demo.elapsed'), {
    h: stats.hours,
    m: stats.minutes,
  });
  const tokens = interpolate(t('toil.demo.tokens'), {
    n: stats.tokensM.toFixed(1),
  });

  return (
    <div
      ref={hostRef}
      className="overflow-hidden rounded-2xl border border-[var(--border-1)] bg-gradient-to-b from-[var(--surface-1)] to-[var(--surface-0)] shadow-[0_1px_3px_rgb(0_0_0/0.06),0_24px_60px_-24px_rgb(0_0_0/0.28)]"
      role="img"
      aria-label={t('toil.demo.aria')}
    >
      {/* ── Header bar: agent identity + "running for 1h xx" status ── */}
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border-1)] bg-[var(--surface-1)] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--border-1)] bg-[var(--surface-2)]">
            <ClaudeIcon className="h-4 w-4" />
          </span>
          <span className="truncate text-sm font-semibold text-[var(--fg-1)]">
            {t('toil.demo.agent')}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--border-1)] bg-[var(--surface-0)]/60 px-2.5 py-1">
          <span
            aria-hidden="true"
            className="eikon-pulse-glow inline-block h-1.5 w-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgb(245_158_11/0.7)]"
          />
          <span className="font-mono text-[11px] text-[var(--fg-3)]">
            {elapsed} · {tokens}
          </span>
        </div>
      </div>

      {/* ── Conversation transcript ── */}
      <div className="space-y-4 px-4 py-4 sm:px-5">
        {/* User request */}
        <div className="flex justify-end">
          <p className="max-w-[80%] rounded-2xl rounded-br-md border border-[var(--border-1)] bg-[var(--surface-2)] px-3.5 py-2 text-[13px] leading-relaxed text-[var(--fg-2)]">
            {t('toil.demo.user')}
          </p>
        </div>

        {/* Agent answer */}
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[var(--border-1)] bg-[var(--surface-2)]">
            <ClaudeIcon className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 flex-1 space-y-3">
            <ul className="space-y-1.5">
              <DoneLine>{t('toil.demo.done1')}</DoneLine>
              <DoneLine>{t('toil.demo.done2')}</DoneLine>
              <DoneLine>{t('toil.demo.done3')}</DoneLine>
              <DoneLine>{t('toil.demo.done4')}</DoneLine>
            </ul>

            <p className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-[var(--border-1)] bg-[var(--surface-2)]/60 px-2.5 py-1.5 font-mono text-[11px] text-[var(--fg-3)]">
              {t('toil.demo.quality')}
            </p>

            <p className="text-[13px] leading-relaxed text-[var(--fg-2)]">
              {t('toil.demo.question')}
            </p>
          </div>
        </div>
      </div>

      {/* ── Composer: the typed "请继续" + send / spinner ──
          While sending, the whole input goes "disabled": the reply stays put
          but greys out, the box recedes, and the send button dims to a darker
          coral — the agent is busy, nothing is editable. */}
      <div className="border-t border-[var(--border-1)] bg-[var(--surface-1)] p-3">
        <div
          className={[
            'flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors',
            isSending
              ? 'border-[var(--border-1)] bg-[var(--surface-2)]'
              : 'border-[var(--border-2)] bg-[var(--surface-0)] shadow-[inset_0_1px_2px_rgb(0_0_0/0.04)]',
          ].join(' ')}
        >
          <div className="min-w-0 flex-1 text-[13px]">
            {shownText.length === 0 ? (
              <span className="text-[var(--fg-4)]">{t('toil.demo.placeholder')}</span>
            ) : (
              <span className={isSending ? 'text-[var(--fg-4)]' : 'text-[var(--fg-1)]'}>
                {shownText}
              </span>
            )}
            {/* Caret is always rendered — hidden (not removed) while sending —
                so the line never reflows and the typed reply stays put in the
                exact same spot through the whole spin. */}
            <span
              aria-hidden="true"
              className={[
                'ml-0.5 inline-block h-[1.05em] w-[1.5px] translate-y-[2px] bg-[var(--fg-3)]',
                isSending ? 'invisible' : 'eikon-cursor-blink',
              ].join(' ')}
            />
          </div>

          <SendControl key={cycle} sending={isSending} active={shownText.length > 0} />
        </div>
      </div>
    </div>
  );
}

/** A single completed-task line with a green "done" check tick. */
function DoneLine({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-[13px] leading-relaxed text-[var(--fg-2)]">
      <span className="mt-[3px] inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
        <CheckIcon className="h-2.5 w-2.5" />
      </span>
      <span className="min-w-0">{children}</span>
    </li>
  );
}

/**
 * The send button. Swaps arrow → spinner the instant the user "presses Enter"
 * (`sending`), with a one-shot scale pop so the submit reads as a keypress.
 * `key={cycle}` on the caller re-mounts it each loop so the pop replays.
 *
 * Its active highlight uses the agent's own colour (Claude coral #D97757), not
 * the site's brand — so the composer reads as part of the agent product, in
 * line with the coral logo / green checks / amber status already in the mock.
 */
function SendControl({ sending, active }: { sending: boolean; active: boolean }) {
  return (
    <span
      className={[
        'eikon-agent-send-pop inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors',
        sending
          ? // spinning = disabled: a darker, muted coral with a dimmed spinner
            'cursor-not-allowed bg-[#A8573C] text-white/80'
          : active
            ? 'bg-[#D97757] text-white shadow-[0_2px_10px_-2px_#D9775780]'
            : 'bg-[var(--surface-3)] text-[var(--fg-4)]',
      ].join(' ')}
      aria-hidden="true"
    >
      {sending ? (
        <span className="eikon-agent-spinner h-3.5 w-3.5" />
      ) : (
        <ArrowUpIcon className="h-4 w-4" />
      )}
    </span>
  );
}

// =============================================================================
// Replay state machine
// =============================================================================

interface ReplayState {
  typed: string;
  phase: ReplayPhase;
  cycle: number;
}

/**
 * Drive the ready → typing → hold → sent loop. Self-schedules with a single
 * chained `setTimeout`; one cancellable timer is live at a time. When
 * `enabled` is false the loop is parked at a clean idle frame so the static
 * (reduced-motion / off-screen) render is stable.
 */
function useReplay(reply: string, enabled: boolean): ReplayState {
  const [state, setState] = useState<ReplayState>({
    typed: '',
    phase: 'ready',
    cycle: 0,
  });

  useEffect(() => {
    if (!enabled) {
      setState((prev) => ({ typed: '', phase: 'ready', cycle: prev.cycle }));
      return;
    }

    const glyphs = Array.from(reply);
    let timer: ReturnType<typeof setTimeout> | undefined;
    let alive = true;

    const at = (ms: number, fn: () => void) => {
      timer = setTimeout(() => {
        if (alive) fn();
      }, ms);
    };

    const startReady = () => {
      setState((prev) => ({ typed: '', phase: 'ready', cycle: prev.cycle }));
      at(REPLAY_TIMING.readyMs, () => typeAt(0));
    };

    const typeAt = (i: number) => {
      if (i >= glyphs.length) {
        setState((prev) => ({ ...prev, typed: reply, phase: 'hold' }));
        at(REPLAY_TIMING.holdMs, sent);
        return;
      }
      const next = glyphs.slice(0, i + 1).join('');
      setState((prev) => ({ ...prev, typed: next, phase: 'typing' }));
      at(REPLAY_TIMING.charMs, () => typeAt(i + 1));
    };

    const sent = () => {
      // Keep the reply in the box (disabled) while the agent "works"; the box
      // is only cleared on the next startReady().
      setState((prev) => ({ typed: reply, phase: 'sent', cycle: prev.cycle + 1 }));
      at(REPLAY_TIMING.spinMs, startReady);
    };

    startReady();

    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [reply, enabled]);

  return state;
}

// =============================================================================
// Visibility / motion preferences
// =============================================================================

/** Live `prefers-reduced-motion` flag (defaults to "motion ok" in SSR). */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return reduced;
}

// =============================================================================
// Inline icons (kept local so this private mock ships no icon-registry deps)
// =============================================================================

/**
 * Claude mark (lobehub `claude-color`, the coral burst). Fixed brand colour
 * #D97757 rather than `currentColor` so it reads as the real Claude logo; the
 * avatar chip around it is kept neutral so the coral stays the only accent.
 */
function ClaudeIcon({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#D97757" aria-hidden="true">
      <path d="M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z" />
    </svg>
  );
}

function CheckIcon({ className }: { className: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}

function ArrowUpIcon({ className }: { className: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 19V5m-7 7 7-7 7 7" />
    </svg>
  );
}
