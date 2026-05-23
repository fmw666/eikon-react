/**
 * @file TechStackWall.tsx
 * @description Two-layer presentation of the built-in stack.
 *
 *   1. Marquee strip   — every logo, looped horizontally with a slow
 *                        translate. Used as the "trusted stack" band
 *                        right under the section header so the page
 *                        breathes a little before the tier grid below.
 *   2. Tiered grid     — logos grouped by role (core / state / quality /
 *                        platform). Lets readers locate any single
 *                        technology without scanning a sea of icons.
 *
 * Logos come from `@iconify/react`. The `simple-icons:` set covers most
 * of these names; for project-specific brands we use generic symbols
 * (e.g. the `lucide:` set) so we never ship a broken icon ref.
 *
 * The marquee is implemented in CSS only — we duplicate the children
 * once inline so a single keyframe (`eikon-marquee`) translates -50%
 * for a seamless loop. No JS, no rAF, plays at 60fps everywhere.
 */

import { Icon } from '@iconify/react';
import { useI18n, type I18nKey } from '../theme/i18n';

interface LogoSpec {
  /** Iconify reference, e.g. 'simple-icons:react'. */
  icon: string;
  label: string;
  /** Optional tint applied to monochrome icons. */
  color?: string;
}

const CORE: ReadonlyArray<LogoSpec> = [
  { icon: 'simple-icons:react', label: 'React', color: '#61DAFB' },
  { icon: 'simple-icons:vite', label: 'Vite', color: '#646CFF' },
  { icon: 'simple-icons:typescript', label: 'TypeScript', color: '#3178C6' },
  { icon: 'simple-icons:tailwindcss', label: 'Tailwind CSS', color: '#06B6D4' },
];

const STATE: ReadonlyArray<LogoSpec> = [
  { icon: 'simple-icons:reactquery', label: 'TanStack Query', color: '#FF4154' },
  { icon: 'lucide:layers', label: 'Zustand' },
  { icon: 'simple-icons:reactrouter', label: 'React Router', color: '#CA4245' },
  { icon: 'simple-icons:i18next', label: 'i18next', color: '#26A69A' },
];

const QUALITY: ReadonlyArray<LogoSpec> = [
  { icon: 'simple-icons:vitest', label: 'Vitest', color: '#6E9F18' },
  { icon: 'simple-icons:testinglibrary', label: 'Testing Library', color: '#E33332' },
  { icon: 'simple-icons:eslint', label: 'ESLint', color: '#4B32C3' },
  { icon: 'simple-icons:prettier', label: 'Prettier', color: '#F7B93E' },
];

const PLATFORM: ReadonlyArray<LogoSpec> = [
  { icon: 'simple-icons:tauri', label: 'Tauri 2', color: '#FFC131' },
  { icon: 'simple-icons:capacitor', label: 'Capacitor', color: '#119EFF' },
  { icon: 'simple-icons:supabase', label: 'Supabase', color: '#3ECF8E' },
  { icon: 'simple-icons:shadcnui', label: 'shadcn/ui' },
];

const ALL_LOGOS = [...CORE, ...STATE, ...QUALITY, ...PLATFORM];

export function TechStackWall() {
  const { t } = useI18n();
  return (
    <section
      className="relative mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24"
      aria-labelledby="stack-title"
      style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 600px' }}
    >
      {/* Subtle radial backdrop wash */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 40%, var(--accent-glow), transparent 70%)',
          opacity: 0.4,
        }}
      />

      <div className="mb-10 text-center">
        <p className="mb-3 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--fg-4)]">
          <span className="inline-block h-1 w-1 rounded-full bg-brand-500 shadow-[0_0_8px_var(--accent-glow)]" />
          {t('stack.eyebrow')}
        </p>
        <h2
          id="stack-title"
          className="text-3xl font-semibold tracking-tight text-[var(--fg-1)] sm:text-4xl"
        >
          {t('stack.title')}
        </h2>
        <p className="mt-3 text-sm text-[var(--fg-3)] sm:text-base">
          {t('stack.subtitle')}
        </p>
      </div>

      {/* Marquee */}
      <Marquee logos={ALL_LOGOS} />

      {/* Tier grid */}
      <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Tier titleKey="stack.tier.core" logos={CORE} />
        <Tier titleKey="stack.tier.state" logos={STATE} />
        <Tier titleKey="stack.tier.quality" logos={QUALITY} />
        <Tier titleKey="stack.tier.platform" logos={PLATFORM} />
      </div>
    </section>
  );
}

/**
 * Horizontal infinite-loop logo strip.
 *
 * The track holds two identical copies of the logo list, each wrapped
 * in its own flex group with internal `gap-12` plus a trailing `pr-12`.
 * That trailing gap belongs to the group itself, so the track width is
 * exactly 2 × one-copy-footprint; the CSS `eikon-marquee` keyframe
 * translates the track by -50%, which lands the second copy's leading
 * edge precisely where the first copy started — wrap is invisible, no
 * half-gap jump at the seam.
 *
 * Hover-pause / focus-pause and `prefers-reduced-motion` are handled
 * purely in CSS via the `.eikon-marquee-host` / `.eikon-marquee-track`
 * pair (see `styles/index.css`), so no JS state, no re-renders.
 *
 * Fade-mask on both sides softens the edge where logos exit and
 * re-enter the visible area.
 */
function Marquee({ logos }: { logos: ReadonlyArray<LogoSpec> }) {
  return (
    <div
      className="eikon-marquee-host relative overflow-hidden"
      style={{
        maskImage:
          'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
        WebkitMaskImage:
          'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
      }}
    >
      <div className="eikon-marquee-track flex w-max py-4">
        {[0, 1].map((copyIdx) => (
          <div
            key={copyIdx}
            className="flex shrink-0 items-center gap-12 pr-12"
            aria-hidden={copyIdx === 1}
          >
            {logos.map((l, i) => (
              <MarqueeItem key={`${copyIdx}-${l.label}-${i}`} logo={l} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function MarqueeItem({ logo }: { logo: LogoSpec }) {
  return (
    <div className="flex shrink-0 items-center gap-2.5 opacity-70 transition hover:opacity-100">
      <Icon
        icon={logo.icon}
        className="h-6 w-6"
        style={logo.color ? { color: logo.color } : undefined}
      />
      <span className="whitespace-nowrap text-sm font-medium text-[var(--fg-2)]">
        {logo.label}
      </span>
    </div>
  );
}

function Tier({
  titleKey,
  logos,
}: {
  titleKey: I18nKey;
  logos: ReadonlyArray<LogoSpec>;
}) {
  const { t } = useI18n();
  return (
    <div className="rounded-xl border border-[var(--border-1)] bg-gradient-to-b from-[var(--surface-1)] to-[var(--surface-0)] p-5 shadow-[0_1px_3px_rgb(0_0_0/0.06),0_6px_20px_-6px_rgb(0_0_0/0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--border-2)] hover:shadow-[0_2px_6px_rgb(0_0_0/0.08),0_12px_32px_-6px_rgb(0_0_0/0.14)]">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[var(--fg-3)]">
        <span className="inline-block h-1 w-1 rounded-full bg-brand-500 shadow-[0_0_6px_var(--accent-glow)]" />
        {t(titleKey)}
      </div>
      <ul className="mt-4 flex flex-col gap-3">
        {logos.map((l) => (
          <li
            key={l.label}
            className="flex items-center gap-3 text-sm text-[var(--fg-2)]"
          >
            <Icon
              icon={l.icon}
              className="h-4.5 w-4.5 shrink-0"
              style={l.color ? { color: l.color } : undefined}
            />
            <span>{l.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
