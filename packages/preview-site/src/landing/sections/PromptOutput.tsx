/**
 * @file PromptOutput.tsx
 * @description Copyable Prompt / CLI block tied to the current params.
 *
 * Two modes, switchable via a small tab strip on top of the card:
 *
 *   - Prompt (default) : the full `buildAgentInstructions(...)` payload
 *                        — backticked CLI line + a blank line + the
 *                        `AGENT_NOTE` from `cli-command.ts`. This is
 *                        the artifact users paste into Cursor / Claude /
 *                        Codex / any chat agent.
 *   - CLI              : the bare `buildCliCommand(...)` string —
 *                        useful when the user knows what they're doing
 *                        and just wants to run it in a terminal.
 *
 * Both produce text from `lib/cli-command.ts` unchanged — we deliberately
 * do NOT mutate or wrap the output, per the user requirement to "use
 * existing content, do not modify".
 *
 * The Copy button copies whichever tab is active. Success is reported
 * inline ("Copied!") for 1.6s and falls back to "Copy failed" if the
 * clipboard API throws (e.g. iframe sandbox or insecure origin).
 */

import { useMemo, useState } from 'react';

import {
  buildAgentInstructions,
  buildCliCommand,
} from '@/lib/cli-command';
import { useShellStore } from '@/shell/store';

import { useI18n } from '../theme/i18n';

type Mode = 'prompt' | 'cli';

/**
 * Anchor id used by Hero's "find it" CTA (the down-arrow pill next to
 * the decorative terminal teaser) to smooth-scroll users to this
 * section — the place where the real, parameterised prompt + CLI
 * command actually live.
 */
export const PROMPT_OUTPUT_ANCHOR_ID = 'prompt-output';

export interface PromptOutputProps {
  /**
   * Compact layout for the dedicated /playground page sidebar:
   * drops the landing section wrapper (no max-width, no `<section>`,
   * no marketing heading) and tightens the inner padding so the card
   * fits flush inside a ~320–380px sidebar.
   */
  compact?: boolean;
}

export function PromptOutput({ compact = false }: PromptOutputProps = {}) {
  const { t } = useI18n();
  const state = useShellStore((s) => s.state);
  const [mode, setMode] = useState<Mode>('prompt');
  const [copyState, setCopyState] = useState<
    'idle' | 'copied' | 'failed'
  >('idle');

  // Derive both texts every render (cheap: pure string-builds; the
  // schema walk is O(params)). useMemo just avoids re-rendering child
  // <pre> blocks that would otherwise see fresh string instances.
  const { cli, prompt } = useMemo(() => {
    const cli = buildCliCommand(state);
    return { cli, prompt: buildAgentInstructions(cli) };
  }, [state]);

  const displayText = mode === 'prompt' ? prompt : cli;

  async function copy() {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(displayText);
        setCopyState('copied');
      } else {
        throw new Error('clipboard unavailable');
      }
    } catch {
      setCopyState('failed');
    }
    window.setTimeout(() => setCopyState('idle'), 1600);
  }

  // ---- Card body (shared by both layouts) ------------------------------
  const card = (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--border-1)] bg-[var(--surface-1)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border-1)] bg-[var(--surface-2)] px-3 py-2">
        <div
          role="tablist"
          aria-label={t('prompt.title')}
          className="inline-flex overflow-hidden rounded-md border border-[var(--border-1)] bg-[var(--surface-1)] p-0.5"
        >
          <ModeTab
            active={mode === 'prompt'}
            onClick={() => setMode('prompt')}
            label={t('prompt.tab.prompt')}
          />
          <ModeTab
            active={mode === 'cli'}
            onClick={() => setMode('cli')}
            label={t('prompt.tab.cli')}
          />
        </div>

        <CopyButton
          state={copyState}
          onCopy={copy}
          labels={{
            copy: t('prompt.copy'),
            copied: t('prompt.copied'),
            failed: t('prompt.copyFailed'),
          }}
        />
      </div>

      <pre
        aria-label={mode === 'prompt' ? 'prompt' : 'cli-command'}
        className={
          'm-0 min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words font-mono leading-relaxed text-[var(--fg-1)] ' +
          (compact ? 'px-4 py-3 text-xs' : 'max-h-[420px] px-5 py-4 text-[13px]')
        }
      >
        <PromptHighlighter text={displayText} mode={mode} />
      </pre>
    </div>
  );

  if (compact) {
    return card;
  }

  return (
    <section
      id={PROMPT_OUTPUT_ANCHOR_ID}
      className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6 sm:pb-24 lg:pb-28"
      aria-labelledby="prompt-title"
    >
      <div className="mb-6 flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            id="prompt-title"
            className="text-2xl font-semibold tracking-tight text-[var(--fg-1)] sm:text-3xl"
          >
            {t('prompt.title')}
          </h2>
          <p className="mt-1.5 text-sm text-[var(--fg-3)]">
            {t('prompt.subtitle')}
          </p>
        </div>
      </div>

      {card}
    </section>
  );
}

function ModeTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={
        'rounded px-3 py-1 text-xs font-medium transition ' +
        (active
          ? 'bg-brand-500/15 text-brand-400'
          : 'text-[var(--fg-3)] hover:text-[var(--fg-1)]')
      }
    >
      {label}
    </button>
  );
}

function CopyButton({
  state,
  onCopy,
  labels,
}: {
  state: 'idle' | 'copied' | 'failed';
  onCopy: () => void;
  labels: { copy: string; copied: string; failed: string };
}) {
  const text =
    state === 'copied'
      ? labels.copied
      : state === 'failed'
        ? labels.failed
        : labels.copy;

  // `eikon-shimmer-hover` adds a diagonal light streak across the
  // button on hover. We skip it for the `copied` / `failed` states
  // because those are status flashes — the visitor isn't pointing at
  // the button to copy again, they're reading the outcome, and a
  // light sweep crossing a green/red status pill would read as a
  // glitch rather than a polish cue.
  const showShimmer = state === 'idle';

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-live="polite"
      className={
        (showShimmer ? 'eikon-shimmer-hover ' : '') +
        'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition ' +
        (state === 'copied'
          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
          : state === 'failed'
            ? 'border-red-500/40 bg-red-500/10 text-red-400'
            : 'border-[var(--border-1)] bg-[var(--surface-1)] text-[var(--fg-2)] hover:border-[var(--border-2)] hover:text-[var(--fg-1)]')
      }
    >
      {state === 'copied' ? (
        <CheckIcon className="h-3.5 w-3.5" />
      ) : (
        <ClipboardIcon className="h-3.5 w-3.5" />
      )}
      <span>{text}</span>
    </button>
  );
}

/**
 * Render `text` with light token highlighting:
 *
 *   - The wrapping backticks of the CLI line (Prompt mode) and the
 *     `$` shell-prompt prefix (CLI mode) are dimmed.
 *   - The literal `<proj_name>` placeholder is highlighted in brand
 *     colour so the agent reading the prompt can SEE the slot it
 *     needs to fill — same purpose as the existing angle-bracket
 *     convention in `cli-command.ts`, just visualised.
 *
 * Anything more (full bash tokenizer) would conflict with the design
 * goal of "simple style"; we keep this to one regex split.
 */
function PromptHighlighter({
  text,
  mode,
}: {
  text: string;
  mode: Mode;
}) {
  // Split around `<proj_name>` so we can wrap exactly that token.
  const parts = text.split(/(<proj_name>)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p === '<proj_name>') {
          return (
            <span
              key={i}
              className="rounded bg-brand-500/15 px-1 py-0.5 text-brand-400"
            >
              &lt;proj_name&gt;
            </span>
          );
        }
        if (mode === 'cli' && i === 0) {
          return (
            <span key={i}>
              <span className="select-none text-[var(--fg-4)]">$ </span>
              {p}
            </span>
          );
        }
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

function ClipboardIcon({ className }: { className: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
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
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
