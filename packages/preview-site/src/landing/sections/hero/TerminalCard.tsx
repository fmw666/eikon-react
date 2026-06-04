/**
 * @file TerminalCard.tsx
 * @description Internal Hero piece — the decorative, replayable terminal card
 * used by the hero's bottom-right teaser. Kept as a sibling of Hero.tsx (not in
 * any feature barrel) so it stays a private implementation detail of the hero.
 *
 * Visual structure (left → right inside the card):
 *
 *   ●●●            ← macOS traffic-light dots (red/yellow/green),
 *                    purely aesthetic; we use the canonical macOS hex
 *                    values rather than theme tokens because the dots
 *                    should read as "this is a terminal" regardless of
 *                    light/dark mode.
 *   $ <command>    ← prompt sigil in brand slate + the actual
 *                    command in the standard mono token, no syntax
 *                    highlighting (a single `npx` line doesn't need it
 *                    and any colour beyond the sigil would compete
 *                    with the gradient title above).
 *   │              ← slim cursor bar with a macOS-Terminal-style
 *                    blink: stays fully visible, fades out for a
 *                    beat, hides briefly, then *snaps* back in. The
 *                    snap-on (not the fade-off) is the eye-catching
 *                    moment, which is what makes the teaser read as
 *                    a real prompt waiting for input.
 *
 * The card itself is just a rounded surface with the same
 * border/blur stack the rest of the landing uses, so it slots into
 * either theme without an extra branch.
 */

import { useState, type CSSProperties } from 'react';

const TERMINAL_INSTALL_STEPS = [
  { kind: 'installing', text: 'Installing packages...', delay: '2.55s' },
  { kind: 'package', text: 'react@19.0.0', delay: '4.3s' },
  { kind: 'package', text: 'vite@6.0.0', delay: '5s' },
  { kind: 'package', text: '@eikon/core@1.0.0', delay: '5.7s' },
  { kind: 'success', text: 'Project created successfully!', delay: '6.65s' },
] as const;

export function TerminalCard({ command }: { command: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [runKey, setRunKey] = useState(0);

  const replayInstallDemo = () => {
    setIsExpanded(true);
    setRunKey((current) => current + 1);
  };

  return (
    <button
      // `max-w-full` + the inner `min-w-0` + `truncate` on the code
      // line keep the card from forcing a horizontal scroll on
      // viewports narrower than the command's natural width
      // (320-340px iPhones with the `npx create-eikon-react .`
      // string render OK without it but any longer command would
      // overflow).
      type="button"
      className={[
        'eikon-shimmer-hover eikon-terminal-demo max-w-full rounded-xl border border-[var(--border-1)] bg-[var(--surface-2)]/85 px-3 py-2.5 text-left shadow-lg shadow-black/5 backdrop-blur transition-colors hover:border-[var(--border-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/40 dark:shadow-black/40 sm:px-4 sm:py-3',
        isExpanded ? 'is-expanded' : '',
      ].join(' ')}
      aria-label={`Run terminal install demo: ${command}`}
      aria-expanded={isExpanded}
      onClick={replayInstallDemo}
      onBlur={() => setIsExpanded(false)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        <div className="flex shrink-0 items-center gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </div>
        <code
          className="min-w-0 whitespace-nowrap font-mono text-xs text-[var(--fg-2)] sm:text-sm"
          style={{ '--eikon-terminal-command-chars': command.length } as CSSProperties}
        >
          <span className="text-brand-500">$ </span>
          <span
            key={isExpanded ? runKey : 'idle'}
            className={isExpanded ? 'eikon-terminal-typewriter' : undefined}
          >
            {command}
          </span>
          {/* Trailing slim cursor — `eikon-cursor-blink` mimics the
              native macOS Terminal.app cadence: fully visible by
              default, fades out for one short beat, sits hidden for
              a noticeable pause, then *snaps* back in (no fade-in).
              The snap-on is the moment that sells "this is a real
              prompt waiting for input". Geometry: `w-[0.18em]` makes
              it a thin vertical bar (~1.5–2px at the surrounding
              text size) instead of a wide block — closer to modern
              line-cursors and less visually heavy next to the mono
              command. We bump the colour from --fg-3 up to --fg-2
              so the now-thinner bar still reads clearly against the
              terminal surface. */}
          <span
            aria-hidden="true"
            className="eikon-cursor-blink ml-0.5 inline-block h-[1em] w-[0.18em] translate-y-[2px] bg-[var(--fg-2)]"
          />
        </code>
      </div>

      <div
        key={runKey}
        className="eikon-terminal-log mt-4 space-y-2 pl-7 font-mono text-xs sm:text-sm"
        aria-hidden={!isExpanded}
      >
        {TERMINAL_INSTALL_STEPS.map((step) => (
          <div
            key={step.text}
            className="eikon-terminal-log-line flex items-center gap-2.5"
            style={{ '--eikon-terminal-line-delay': step.delay } as CSSProperties}
          >
            {step.kind === 'installing' ? (
              <>
                <span className="relative inline-flex w-[1.6em] items-center" aria-hidden="true">
                  <span className="eikon-terminal-spinner absolute left-0" />
                  <span className="eikon-terminal-install-done absolute left-0 text-[#8f949e]">
                    ok
                  </span>
                </span>
                <span className="text-[#62a8ff]">{step.text}</span>
              </>
            ) : step.kind === 'success' ? (
              <>
                <span aria-hidden="true" className="text-[#ffbd5b]">
                  *
                </span>
                <span className="font-semibold text-[#b6ff5b]">{step.text}</span>
              </>
            ) : (
              <>
                <span aria-hidden="true" className="text-[#8f949e]">
                  ok
                </span>
                <span className="text-[var(--fg-3)]">{step.text}</span>
              </>
            )}
          </div>
        ))}
      </div>
    </button>
  );
}
