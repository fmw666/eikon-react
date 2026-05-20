/**
 * @file PlaygroundSection.tsx
 * @description Landing wrapper for the three-pane playground.
 *
 * Owns:
 *
 *   - Section heading ("Configure your stack").
 *   - The params card (now driven by `ParamsPanel`, with `platform`
 *     itself extracted to the PlatformPicker section above).
 *   - The playground frame (Toolbar + Files + Code + Preview), wrapped
 *     in a fixed-height rounded container so the resizable panels
 *     have a sensible parent box on a landing page that's otherwise
 *     intrinsically tall.
 *
 * The order top-to-bottom — heading → params → playground frame —
 * mirrors the natural reading flow: "what am I configuring? → which
 * dials? → what does it look like?". The Prompt/CLI output card lives
 * right below this section so the user's eye lands on the copyable
 * output as soon as they're done choosing.
 */

import { ParamsPanel } from '@/shell/ParamsPanel';
import { PlaygroundShell } from '@/shell/App';

import { useI18n } from '../theme/i18n';

/** Anchor used by the Hero CTA and by Nav's #playground link. */
export const PLAYGROUND_ANCHOR_ID = 'playground';

export function PlaygroundSection() {
  const { t } = useI18n();
  return (
    <section
      id={PLAYGROUND_ANCHOR_ID}
      className="mx-auto w-full max-w-7xl px-6 py-16 sm:py-20"
      aria-labelledby="playground-title"
    >
      <div className="mb-8 text-center">
        <h2
          id="playground-title"
          className="text-2xl font-semibold tracking-tight text-[var(--fg-1)] sm:text-3xl"
        >
          {t('params.title')}
        </h2>
        <p className="mt-2 text-sm text-[var(--fg-3)]">
          {t('params.subtitle')}
        </p>
      </div>

      <ParamsPanel />

      {/*
        Fixed-height playground frame. 680px tall fits a full Toolbar +
        a healthy device preview without crowding the viewport on
        a 13" laptop. The resizable Files / Editor / Preview panels
        compute their splits relative to this box.
      */}
      <div className="mt-6 h-[680px]">
        <PlaygroundShell />
      </div>
    </section>
  );
}
