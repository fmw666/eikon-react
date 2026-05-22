/**
 * @file PainPoints.tsx
 * @description 4-up "problem → solution" card grid.
 *
 * Quiet supporting section. Previously each card carried an
 * Aceternity-style mousemove spotlight (radial gradient following
 * the cursor); we removed it so this section doesn't compete with
 * the PlaygroundSection above for "look here" energy. Cards now
 * change only border-colour on hover.
 *
 * The icons are loaded from `lucide:` via Iconify — chosen because
 * lucide ships consistent stroke widths and is already a transitive
 * dep of `@iconify/react` (no extra install).
 */

import { Icon } from '@iconify/react';
import { type ReactNode } from 'react';

import { useI18n, type I18nKey } from '../theme/i18n';

interface Pain {
  icon: string;
  titleKey: I18nKey;
  descKey: I18nKey;
}

const PAINS: ReadonlyArray<Pain> = [
  {
    icon: 'lucide:terminal-square',
    titleKey: 'pain.1.title',
    descKey: 'pain.1.desc',
  },
  {
    icon: 'lucide:list-tree',
    titleKey: 'pain.2.title',
    descKey: 'pain.2.desc',
  },
  {
    icon: 'lucide:package-search',
    titleKey: 'pain.3.title',
    descKey: 'pain.3.desc',
  },
  {
    icon: 'lucide:bot',
    titleKey: 'pain.4.title',
    descKey: 'pain.4.desc',
  },
];

export function PainPoints() {
  const { t } = useI18n();
  return (
    <section
      className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24"
      aria-labelledby="pain-title"
    >
      <div className="mb-12 text-center">
        <p className="mb-3 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--fg-4)]">
          <span className="inline-block h-1 w-1 rounded-full bg-brand-500 shadow-[0_0_8px_var(--accent-glow)]" />
          {t('pain.eyebrow')}
        </p>
        <h2
          id="pain-title"
          className="text-3xl font-semibold tracking-tight text-[var(--fg-1)] sm:text-4xl"
        >
          {t('pain.title')}
        </h2>
        <p className="mt-3 text-sm text-[var(--fg-3)] sm:text-base">
          {t('pain.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PAINS.map((p) => (
          <PainCard
            key={p.titleKey}
            icon={
              <Icon
                icon={p.icon}
                className="h-5 w-5"
                aria-hidden="true"
              />
            }
            title={t(p.titleKey)}
            desc={t(p.descKey)}
          />
        ))}
      </div>
    </section>
  );
}

function PainCard({
  icon,
  title,
  desc,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="eikon-shimmer-hover group/card rounded-xl border border-[var(--border-1)] bg-gradient-to-b from-[var(--surface-1)] to-[var(--surface-0)] p-6 shadow-[0_1px_3px_rgb(0_0_0/0.06),0_8px_24px_-8px_rgb(0_0_0/0.1)] transition-all duration-200 hover:-translate-y-1 hover:border-[var(--border-2)] hover:shadow-[0_2px_6px_rgb(0_0_0/0.08),0_16px_40px_-8px_rgb(0_0_0/0.16)]">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-brand-500/20 bg-brand-500/5 text-[var(--fg-3)] shadow-[inset_0_1px_0_rgb(255_255_255/0.04)] transition-all duration-200 group-hover/card:border-brand-500/35 group-hover/card:text-brand-500 group-hover/card:shadow-[0_0_12px_var(--accent-glow)]">
        {icon}
      </span>
      <h3 className="mt-4 text-base font-semibold text-[var(--fg-1)]">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--fg-3)]">
        {desc}
      </p>
    </div>
  );
}
