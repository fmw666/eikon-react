import type { CSSProperties } from 'react';

import type { DevicePlatform } from '@/shell/DeviceShell';

const SCREEN_FONT: CSSProperties['fontFamily'] =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, sans-serif';

export function ScreenContent({
  eyebrow,
  title,
  desc,
  bullets,
  platform,
}: {
  eyebrow: string;
  title: string;
  desc: string;
  bullets: ReadonlyArray<string>;
  platform: DevicePlatform;
}) {
  if (platform === 'mobile') {
    return <MobileScreenContent eyebrow={eyebrow} title={title} desc={desc} bullets={bullets} />;
  }
  if (platform === 'desktop') {
    return <DesktopScreenContent title={title} desc={desc} bullets={bullets} />;
  }
  return <WebScreenContent eyebrow={eyebrow} title={title} desc={desc} bullets={bullets} />;
}

function WebScreenContent({
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
  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden"
      style={{ fontFamily: SCREEN_FONT, background: '#fff' }}
    >
      {/* Nav bar */}
      <div className="flex items-center gap-5 border-b border-[#eee] px-7 py-3">
        <div className="h-4 w-4 rounded-[4px] bg-gradient-to-br from-[#f59e0b] to-[#f97316]" />
        <div className="h-2 w-14 rounded-full bg-[#e8e8ed]" />
        <div className="h-2 w-10 rounded-full bg-[#e8e8ed]" />
        <div className="h-2 w-12 rounded-full bg-[#e8e8ed]" />
        <div className="ml-auto h-6 w-[52px] rounded-full bg-gradient-to-r from-[#f59e0b]/80 to-[#fb923c]/80" />
      </div>

      {/* Hero section */}
      <div className="flex flex-1 flex-col px-7 pt-6 pb-5 sm:px-9 sm:pt-7">
        <p
          className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] sm:text-xs"
          style={{ color: '#f59e0b' }}
        >
          {eyebrow}
        </p>
        <h3
          className="text-[22px] font-bold leading-[1.15] sm:text-[26px] md:text-[30px]"
          style={{ color: '#1d1d1f', letterSpacing: '-0.025em' }}
        >
          {title}
        </h3>
        <p
          className="mt-3 text-[13px] leading-[1.6] sm:text-[15px]"
          style={{ color: '#6e6e73' }}
        >
          {desc}
        </p>

        {/* Feature cards */}
        <div className="mt-auto grid grid-cols-3 gap-3 pt-5">
          {bullets.map((b, i) => (
            <div
              key={b}
              className="flex flex-col gap-2 rounded-xl border border-[#f0f0f2] px-3 py-3 sm:px-4 sm:py-3.5"
              style={{ background: i === 0 ? '#fffbf5' : '#fafafa' }}
            >
              <div
                className="h-5 w-5 rounded-md sm:h-6 sm:w-6"
                style={{
                  background: i === 0
                    ? 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)'
                    : 'linear-gradient(135deg, #e8e8ed 0%, #d4d4d8 100%)',
                  opacity: i === 0 ? 0.85 : 0.6,
                }}
              />
              <span
                className="text-[10px] leading-snug sm:text-[11px]"
                style={{ color: '#3a3a3c' }}
              >
                {b}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DesktopScreenContent({
  title,
  desc,
  bullets,
}: {
  title: string;
  desc: string;
  bullets: ReadonlyArray<string>;
}) {
  return (
    <div
      className="relative flex h-full w-full overflow-hidden"
      style={{ fontFamily: SCREEN_FONT, background: '#fff' }}
    >
      {/* Sidebar */}
      <div className="flex w-[130px] shrink-0 flex-col border-r border-[#f0f0f2] bg-[#fafbfc] px-4 py-5 sm:w-[150px]">
        <div className="mb-4 h-3 w-14 rounded-full bg-[#e8e8ed]" />
        <div className="flex flex-col gap-[7px]">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-[2px] bg-[#f59e0b]/50" />
            <div className="h-[5px] w-16 rounded-full bg-[#ddd]" />
          </div>
          <div className="flex items-center gap-2 pl-3">
            <div className="h-[5px] w-14 rounded-full bg-[#e8e8ed]" />
          </div>
          <div className="flex items-center gap-2 pl-3">
            <div className="h-[5px] w-10 rounded-full bg-[#e8e8ed]" />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="h-2 w-2 rounded-[2px] bg-[#e0e0e0]" />
            <div className="h-[5px] w-12 rounded-full bg-[#ddd]" />
          </div>
          <div className="flex items-center gap-2 pl-3">
            <div className="h-[5px] w-16 rounded-full bg-[#e8e8ed]" />
          </div>
          <div className="flex items-center gap-2 pl-3">
            <div className="h-[5px] w-8 rounded-full bg-[#e8e8ed]" />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="h-2 w-2 rounded-[2px] bg-[#e0e0e0]" />
            <div className="h-[5px] w-14 rounded-full bg-[#ddd]" />
          </div>
        </div>
      </div>

      {/* Main pane */}
      <div className="flex flex-1 flex-col">
        <div className="flex-1 px-6 py-5 sm:px-7 sm:py-6">
          <h3
            className="text-[22px] font-bold leading-[1.15] sm:text-[26px] md:text-[30px]"
            style={{ color: '#1d1d1f', letterSpacing: '-0.025em' }}
          >
            {title}
          </h3>
          <p
            className="mt-3 text-[13px] leading-[1.6] sm:text-[15px]"
            style={{ color: '#6e6e73' }}
          >
            {desc}
          </p>

          {/* Bullet list as numbered chips */}
          <div className="mt-5 flex flex-col gap-2">
            {bullets.map((b, i) => (
              <div key={b} className="flex items-center gap-2.5">
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[9px] font-bold sm:h-6 sm:w-6 sm:text-[10px]"
                  style={{
                    background: i === 0 ? '#fef3c7' : '#f4f4f5',
                    color: i === 0 ? '#d97706' : '#a1a1aa',
                  }}
                >
                  {i + 1}
                </span>
                <span
                  className="text-[12px] leading-snug sm:text-[13px]"
                  style={{ color: '#3a3a3c' }}
                >
                  {b}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Status bar */}
        <div className="flex items-center gap-3 border-t border-[#f0f0f2] bg-[#fafbfc] px-5 py-2">
          <div className="h-[6px] w-[6px] rounded-full bg-[#34d399]" />
          <div className="h-[5px] w-16 rounded-full bg-[#e0e0e0]" />
          <div className="ml-auto h-[5px] w-10 rounded-full bg-[#e8e8ed]" />
          <div className="h-[5px] w-6 rounded-full bg-[#e8e8ed]" />
        </div>
      </div>
    </div>
  );
}

function MobileScreenContent({
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
  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden"
      style={{ fontFamily: SCREEN_FONT, background: '#fff' }}
    >
      {/* App header */}
      <div className="px-6 pt-5 pb-3 sm:px-7 sm:pt-6">
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.18em] sm:text-[11px]"
          style={{ color: '#f59e0b' }}
        >
          {eyebrow}
        </p>
        <h3
          className="mt-1.5 text-[17px] font-bold leading-[1.2] sm:text-[19px]"
          style={{ color: '#1d1d1f', letterSpacing: '-0.015em' }}
        >
          {title}
        </h3>
        <p
          className="mt-2 text-[11px] leading-[1.5] sm:text-[12px]"
          style={{ color: '#6e6e73' }}
        >
          {desc}
        </p>
      </div>

      {/* Feature list */}
      <div className="flex flex-1 flex-col gap-2.5 px-5 pt-1 sm:px-6 sm:gap-3">
        {bullets.map((b, i) => (
          <div
            key={b}
            className="flex items-center gap-3 rounded-2xl border px-4 py-3.5 sm:px-5"
            style={{
              borderColor: i === 0 ? '#fde68a' : '#f0f0f2',
              background: i === 0 ? '#fffdf7' : '#fafbfc',
            }}
          >
            <div
              className="h-8 w-8 shrink-0 rounded-xl sm:h-9 sm:w-9"
              style={{
                background: i === 0
                  ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
                  : 'linear-gradient(135deg, #f0f0f2 0%, #e4e4e7 100%)',
                opacity: i === 0 ? 0.8 : 0.7,
              }}
            />
            <span
              className="text-[11px] leading-snug sm:text-[12px]"
              style={{ color: '#2c2c2e' }}
            >
              {b}
            </span>
          </div>
        ))}

        {/* Skeleton items */}
        <div className="flex items-center gap-3 rounded-2xl border border-[#f0f0f2] bg-[#fafbfc] px-4 py-3.5 sm:px-5">
          <div className="h-8 w-8 shrink-0 rounded-xl bg-[#f0f0f2] sm:h-9 sm:w-9" />
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="h-[5px] w-4/5 rounded-full bg-[#e8e8ed]" />
            <div className="h-[4px] w-3/5 rounded-full bg-[#f0f0f2]" />
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="mt-auto flex items-center justify-around border-t border-[#f0f0f2] px-6 py-3 sm:px-7">
        <div className="flex flex-col items-center gap-[3px]">
          <div className="h-4 w-4 rounded-[5px] bg-[#f59e0b]/60" />
          <div className="h-[3px] w-5 rounded-full bg-[#f59e0b]/40" />
        </div>
        <div className="flex flex-col items-center gap-[3px]">
          <div className="h-4 w-4 rounded-[5px] bg-[#e0e0e5]" />
          <div className="h-[3px] w-5 rounded-full bg-[#e8e8ed]" />
        </div>
        <div className="flex flex-col items-center gap-[3px]">
          <div className="h-4 w-4 rounded-[5px] bg-[#e0e0e5]" />
          <div className="h-[3px] w-5 rounded-full bg-[#e8e8ed]" />
        </div>
        <div className="flex flex-col items-center gap-[3px]">
          <div className="h-4 w-4 rounded-[5px] bg-[#e0e0e5]" />
          <div className="h-[3px] w-5 rounded-full bg-[#e8e8ed]" />
        </div>
      </div>
    </div>
  );
}
