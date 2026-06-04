/**
 * @file WorkbenchHeader.tsx
 * @description The editorial heading block for the playground
 * workbench — LIVE eyebrow (with pulsing dot) + the page's loudest
 * `<h2>` + subtitle.
 *
 * Internal to PlaygroundSection. Pulled out so the section's
 * structural JSX reads as "backdrop → header → workbench card"
 * without inlining the heading's copy and styling. Pulls its three
 * strings from i18n directly so the parent doesn't have to thread
 * them through props.
 *
 * The `<h2>` keeps `id="playground-title"`, which the section's
 * `aria-labelledby` points at — do not rename it.
 */
import { useI18n } from '../../theme/i18n';

export function WorkbenchHeader() {
  const { t } = useI18n();
  return (
    // ---- Editorial heading ------------------------------------
    // The loudest title on the page on purpose. Bigger than
    // PlatformPicker above (text-2xl/3xl) and heavier than any
    // downstream section. The LIVE eyebrow with its pulsing
    // dot reinforces "real working tool", which pairs with the
    // breathing playground frame underneath.
    //
    // Centred and spaced; we deliberately do NOT make it
    // sticky. The workbench card right below carries the
    // visual weight, and a sticky chapter heading would just
    // take screen real estate from the surface that actually
    // needs it. The visitor's eye lands on the heading once,
    // then falls into the workbench.
    //
    // The header is `mx-auto max-w-3xl` even though the
    // enclosing section breaks out to ~1760px — a heading
    // stretched to the full workbench width would read as a
    // tradeshow banner, not editorial. The card below is
    // allowed to fill the wide section; the heading is not.
    <header className="mx-auto mb-10 max-w-3xl text-center sm:mb-12">
      <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-400/30 bg-brand-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-300">
        <span className="eikon-pulse-glow inline-block h-1.5 w-1.5 rounded-full bg-brand-300 shadow-[0_0_8px_var(--accent-glow)]" />
        {t('playground.eyebrow')}
      </p>
      <h2
        id="playground-title"
        className="text-4xl font-semibold tracking-tight text-[var(--fg-1)] sm:text-5xl"
      >
        {t('params.title')}
      </h2>
      <p className="mx-auto mt-4 max-w-2xl text-sm text-[var(--fg-3)] sm:text-base">
        {t('params.subtitle')}
      </p>
    </header>
  );
}
