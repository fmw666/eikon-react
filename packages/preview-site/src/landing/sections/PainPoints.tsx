/**
 * @file PainPoints.tsx
 * @description 4-up "problem → solution" card grid.
 *
 * Each card uses an Aceternity-style "spotlight hover": as the cursor
 * moves over the card, a small brand-tinted radial gradient follows it,
 * subtly lighting up the card without producing any visible glow until
 * the cursor enters. Implemented with two CSS vars updated on
 * `mousemove`, zero React state.
 *
 * The icons are loaded from `lucide:` via Iconify — chosen because
 * lucide ships consistent stroke widths and is already a transitive
 * dep of `@iconify/react` (no extra install).
 */

import { Icon } from '@iconify/react';
import { useCallback, type CSSProperties, type ReactNode } from 'react';

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
      className="mx-auto w-full max-w-7xl px-6 py-28 sm:py-32"
      aria-labelledby="pain-title"
    >
      <div className="mb-12 text-center">
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
  // Spotlight: update --sx/--sy via the host element's style on every
  // mousemove. The pseudo-overlay below reads these vars in a radial
  // gradient, so the highlight follows the cursor at GPU speed without
  // re-rendering React.
  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--sx', `${e.clientX - rect.left}px`);
    el.style.setProperty('--sy', `${e.clientY - rect.top}px`);
  }, []);

  return (
    <div
      onMouseMove={onMouseMove}
      style={{ '--sx': '50%', '--sy': '50%' } as CSSProperties}
      className="group relative overflow-hidden rounded-2xl border border-[var(--border-1)] bg-[var(--surface-1)] p-6 transition hover:border-[var(--border-2)]"
    >
      {/* Spotlight overlay */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(220px at var(--sx) var(--sy), rgba(139, 92, 246, 0.12), transparent 70%)',
        }}
      />

      <div className="relative">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border-1)] bg-[var(--surface-2)] text-brand-400">
          {icon}
        </span>
        <h3 className="mt-4 text-base font-semibold text-[var(--fg-1)]">
          {title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--fg-3)]">
          {desc}
        </p>
      </div>
    </div>
  );
}
