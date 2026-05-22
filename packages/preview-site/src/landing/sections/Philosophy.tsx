/**
 * @file Philosophy.tsx
 * @description Author's tech-stack opinions, two-column layout.
 *
 * Left column carries the lead paragraph (the "why this stack at all").
 * Right column lists four short bullets, each shaped as a compact card
 * with a numerical badge. The badge + thin vertical divider lend the
 * grid a documentation-page feel — matches the deliberate, opinionated
 * tone of the copy.
 */

import { useI18n, type I18nKey } from '../theme/i18n';

interface Point {
  titleKey: I18nKey;
  descKey: I18nKey;
}

const POINTS: ReadonlyArray<Point> = [
  {
    titleKey: 'philosophy.points.1.title',
    descKey: 'philosophy.points.1.desc',
  },
  {
    titleKey: 'philosophy.points.2.title',
    descKey: 'philosophy.points.2.desc',
  },
  {
    titleKey: 'philosophy.points.3.title',
    descKey: 'philosophy.points.3.desc',
  },
  {
    titleKey: 'philosophy.points.4.title',
    descKey: 'philosophy.points.4.desc',
  },
];

export function Philosophy() {
  const { t } = useI18n();
  return (
    <section
      className="relative rounded-3xl bg-[var(--surface-2)]/60 px-4 py-16 sm:px-6 sm:py-20 lg:py-24"
      aria-labelledby="philosophy-title"
    >
      <div className="mx-auto w-full max-w-7xl">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1.2fr]">
        {/* Left: title + intro */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-1)] bg-[var(--surface-1)] px-3 py-1 text-xs text-[var(--fg-3)]">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500 shadow-[0_0_8px_var(--accent-glow)]" />
            <span>Philosophy</span>
          </div>
          <h2
            id="philosophy-title"
            className="mt-4 text-3xl font-semibold tracking-tight text-[var(--fg-1)] sm:text-4xl"
          >
            {t('philosophy.title')}
          </h2>
          <p className="mt-3 text-sm text-[var(--fg-3)] sm:text-base">
            {t('philosophy.subtitle')}
          </p>
          <p className="mt-6 max-w-prose text-sm leading-relaxed text-[var(--fg-2)] sm:text-base">
            {t('philosophy.intro')}
          </p>
        </div>

        {/* Right: numbered point cards */}
        <ol className="flex flex-col gap-3">
          {POINTS.map((p, idx) => (
            <li
              key={p.titleKey}
              className="group relative flex gap-4 rounded-xl border border-[var(--border-1)] bg-gradient-to-b from-[var(--surface-1)] to-[var(--surface-0)] p-5 shadow-[0_1px_2px_rgb(0_0_0/0.05),0_4px_16px_-4px_rgb(0_0_0/0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-500/30 hover:shadow-[0_2px_6px_rgb(0_0_0/0.08),0_10px_28px_-4px_rgb(0_0_0/0.13)]"
            >
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--border-1)] bg-[var(--surface-2)] font-mono text-xs text-brand-400 transition-shadow duration-200 group-hover:shadow-[0_0_10px_var(--accent-glow)]">
                {String(idx + 1).padStart(2, '0')}
              </span>
              <div>
                <div className="text-sm font-semibold text-[var(--fg-1)]">
                  {t(p.titleKey)}
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--fg-3)]">
                  {t(p.descKey)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      </div>
    </section>
  );
}
