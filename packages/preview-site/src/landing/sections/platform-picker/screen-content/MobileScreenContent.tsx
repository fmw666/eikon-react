import type { ReactNode } from 'react';

import {
  BORDER_HAIRLINE,
  BRAND,
  BRAND_GRAD,
  BRAND_TINT_BG,
  BRAND_TINT_BORDER,
  SCREEN_FONT,
  SURFACE_RAISED,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
} from './theme';
import {
  IconGlobe,
  IconHome,
  IconInbox,
  IconList,
  IconRocket,
  IconSearch,
  IconUser,
  IconZap,
} from './mockup-icons';

// ==================================================================
// Mobile — feed app with header, content cards, tab bar
// ==================================================================
export function MobileScreenContent({
  eyebrow,
  title,
  desc,
  bullets,
}: {
  eyebrow: string;
  title: string;
  desc: string;
  bullets: ReadonlyArray<string>;
}) {
  // Phone shells render at the smallest scale of the three platforms
  // (the device aspect-ratio is portrait, so the stage's 4:3/5:3 box
  // squeezes them more than the wide laptop/iMac shells). To keep the
  // mobile mockup's text legible at the live device-shell scale we
  // bump every native font size + icon ~25% above the equivalent
  // web/desktop sizes.
  const cardIcons: ReactNode[] = [
    <IconZap key="zap" size={22} />,
    <IconGlobe key="globe" size={22} />,
    <IconRocket key="rocket" size={22} />,
  ];

  const tabs: Array<{ icon: ReactNode; label: string }> = [
    { icon: <IconHome size={18} />, label: 'Home' },
    { icon: <IconList size={18} />, label: 'Tasks' },
    { icon: <IconInbox size={18} />, label: 'Inbox' },
    { icon: <IconUser size={18} />, label: 'Me' },
  ];

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden"
      style={{ fontFamily: SCREEN_FONT, background: '#fff' }}
    >
      {/* Top app bar */}
      <div
        className="flex items-center justify-between px-5 pt-4 pb-2.5 sm:px-6 sm:pt-5"
      >
        <div className="flex items-center gap-1.5">
          <div
            className="h-4 w-4 rounded-[5px]"
            style={{ background: BRAND_GRAD }}
          />
          <span
            className="text-[14px] font-bold tracking-tight"
            style={{ color: TEXT_PRIMARY }}
          >
            Eikon
          </span>
        </div>
        <div
          className="flex h-7 w-7 items-center justify-center rounded-full"
          style={{ background: SURFACE_RAISED, color: TEXT_TERTIARY }}
        >
          <IconSearch size={15} />
        </div>
      </div>

      {/* Hero */}
      <div className="px-5 pt-2 pb-4 sm:px-6 sm:pb-5">
        <p
          className="text-[13px] font-bold uppercase tracking-[0.18em] sm:text-[14px]"
          style={{ color: BRAND }}
        >
          {eyebrow}
        </p>
        <h3
          className="mt-1.5 text-[28px] font-bold leading-[1.15] sm:text-[32px]"
          style={{ color: TEXT_PRIMARY, letterSpacing: '-0.02em' }}
        >
          {title}
        </h3>
        <p
          className="mt-2 text-[14px] leading-[1.55] sm:text-[15px]"
          style={{ color: TEXT_SECONDARY }}
        >
          {desc}
        </p>
      </div>

      {/* Feature feed — bullets become cards. Centred in the remaining
          vertical space so the three cards breathe instead of clustering
          under the hero with a dead gap above the tab bar. */}
      <div className="flex flex-1 flex-col justify-center gap-3 px-4 py-2 sm:gap-3.5 sm:px-5">
        {bullets.map((b, i) => {
          const isActive = i === 0;
          return (
            <div
              key={b}
              className="flex items-center gap-3.5 rounded-2xl border px-3.5 py-3.5 sm:gap-4 sm:px-4 sm:py-4"
              style={{
                borderColor: isActive ? BRAND_TINT_BORDER : BORDER_HAIRLINE,
                background: isActive ? BRAND_TINT_BG : SURFACE_RAISED,
              }}
            >
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12"
                style={{
                  background: isActive ? BRAND_GRAD : '#f4f4f5',
                  color: isActive ? '#fff' : '#a1a1aa',
                }}
              >
                {cardIcons[i] || <IconZap size={22} />}
              </div>
              <div className="flex flex-1 flex-col gap-0.5">
                <span
                  className="text-[15px] font-semibold leading-snug sm:text-[16px]"
                  style={{ color: TEXT_PRIMARY }}
                >
                  {b}
                </span>
                <span
                  className="text-[13px] leading-snug sm:text-[14px]"
                  style={{ color: TEXT_TERTIARY }}
                >
                  {isActive ? 'Built-in · Ready' : 'Optional · On demand'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tab bar */}
      <div
        className="mt-auto flex items-center justify-around border-t px-2 pt-2 pb-3 sm:px-3"
        style={{ borderColor: BORDER_HAIRLINE, background: '#fff' }}
      >
        {tabs.map((tab, i) => {
          const isActive = i === 0;
          return (
            <div
              key={tab.label}
              className="flex flex-col items-center gap-0.5"
              style={{ color: isActive ? BRAND : '#c7c7cc' }}
            >
              {tab.icon}
              <span
                className="text-[12px] font-medium"
                style={{ color: isActive ? BRAND : '#c7c7cc' }}
              >
                {tab.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
