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
import { IconGlobe, IconRocket, IconSearch, IconZap } from './mockup-icons';

// ==================================================================
// Web — SaaS dashboard chrome around the hero
// ==================================================================
export function WebScreenContent({
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
  const featureIcons: ReactNode[] = [
    <IconZap key="zap" size={18} />,
    <IconGlobe key="globe" size={18} />,
    <IconRocket key="rocket" size={18} />,
  ];

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden"
      style={{ fontFamily: SCREEN_FONT, background: '#fff' }}
    >
      {/* Top nav — brand mark · nav items · search · avatar */}
      <div
        className="flex items-center gap-4 border-b px-5 py-2.5 sm:px-6"
        style={{ borderColor: BORDER_HAIRLINE, background: '#fff' }}
      >
        <div className="flex items-center gap-1.5">
          <div
            className="h-5 w-5 rounded-[6px]"
            style={{ background: BRAND_GRAD }}
          />
          <span
            className="text-[15px] font-bold tracking-tight"
            style={{ color: TEXT_PRIMARY }}
          >
            Eikon
          </span>
        </div>
        <nav
          className="flex items-center gap-3.5 text-[14px] font-medium"
          style={{ color: TEXT_TERTIARY }}
        >
          <span style={{ color: TEXT_PRIMARY }}>Dashboard</span>
          <span>Tasks</span>
          <span>Reports</span>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <div
            className="hidden items-center gap-1.5 rounded-full border px-2.5 py-1 sm:flex"
            style={{
              borderColor: BORDER_HAIRLINE,
              background: SURFACE_RAISED,
              color: '#a1a1aa',
            }}
          >
            <IconSearch size={14} />
            <div className="h-1 w-14 rounded-full bg-[#e8e8ed]" />
          </div>
          <div
            className="h-6 w-6 rounded-full border-2 border-white shadow-sm"
            style={{ background: BRAND_GRAD }}
          />
        </div>
      </div>

      {/* Hero */}
      <div className="flex flex-1 flex-col px-6 pt-5 pb-4 sm:px-8 sm:pt-7">
        <p
          className="mb-1.5 text-[14px] font-bold uppercase tracking-[0.2em] sm:text-[15px]"
          style={{ color: BRAND }}
        >
          {eyebrow}
        </p>
        <h3
          className="text-[28px] font-bold leading-[1.1] sm:text-[34px] md:text-[38px]"
          style={{ color: TEXT_PRIMARY, letterSpacing: '-0.025em' }}
        >
          {title}
        </h3>
        <p
          className="mt-2.5 max-w-[36ch] text-[16px] leading-[1.55] sm:text-[17px]"
          style={{ color: TEXT_SECONDARY }}
        >
          {desc}
        </p>

        {/* Feature cards */}
        <div className="mt-auto grid grid-cols-3 gap-2.5 pt-5 sm:gap-3">
          {bullets.map((b, i) => {
            const isActive = i === 0;
            return (
              <div
                key={b}
                className="flex flex-col gap-2 rounded-xl border px-3 py-2.5 sm:py-3"
                style={{
                  borderColor: isActive ? BRAND_TINT_BORDER : BORDER_HAIRLINE,
                  background: isActive ? BRAND_TINT_BG : SURFACE_RAISED,
                }}
              >
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg sm:h-9 sm:w-9"
                  style={{
                    background: isActive ? BRAND_GRAD : '#f4f4f5',
                    color: isActive ? '#fff' : '#a1a1aa',
                  }}
                >
                  {featureIcons[i] || <IconZap size={18} />}
                </div>
                <span
                  className="text-[13px] font-medium leading-snug sm:text-[14px]"
                  style={{ color: '#3a3a3c' }}
                >
                  {b}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
