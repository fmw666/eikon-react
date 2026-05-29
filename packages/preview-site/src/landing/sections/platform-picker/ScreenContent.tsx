import { memo, type CSSProperties, type ReactNode } from 'react';

import type { DevicePlatform } from '@/shell/device-shell';

const SCREEN_FONT: CSSProperties['fontFamily'] =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, sans-serif';

// Brand palette baked into the device-screen mockups so the three
// platforms read as one coherent product (the orange ramp matches the
// landing page's `--accent`). Centralised here so any future palette
// rebrand only touches this file.
const BRAND = '#f59e0b';
const BRAND_GRAD = 'linear-gradient(135deg, #fbbf24 0%, #f97316 100%)';
const BRAND_TINT_BG = '#fffbf5';
const BRAND_TINT_BORDER = '#fde68a';
const TEXT_PRIMARY = '#1d1d1f';
const TEXT_SECONDARY = '#6e6e73';
const TEXT_TERTIARY = '#86868b';
const SURFACE_RAISED = '#fafbfc';
const BORDER_HAIRLINE = '#f0f0f2';

// ------------------------------------------------------------------
// Icon primitive — 1.6px stroke, round caps, inherits `currentColor`.
// All inline SVGs in this file share these defaults so the mockups
// have one consistent line weight.
// ------------------------------------------------------------------
function Icon({
  size = 14,
  className,
  children,
  fill = 'none',
}: {
  size?: number;
  className?: string;
  children: ReactNode;
  fill?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill={fill}
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const IconSearch = (p: { size?: number; className?: string }) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.35-4.35" />
  </Icon>
);
const IconHome = (p: { size?: number; className?: string }) => (
  <Icon {...p}>
    <path d="M3 11l9-8 9 8v9a2 2 0 01-2 2h-4v-7h-6v7H5a2 2 0 01-2-2v-9z" />
  </Icon>
);
const IconCheck = (p: { size?: number; className?: string }) => (
  <Icon {...p}>
    <path d="M5 12l5 5L20 7" />
  </Icon>
);
const IconPlus = (p: { size?: number; className?: string }) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);
const IconList = (p: { size?: number; className?: string }) => (
  <Icon {...p}>
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
  </Icon>
);
const IconInbox = (p: { size?: number; className?: string }) => (
  <Icon {...p}>
    <path d="M3 13l2-7h14l2 7M3 13v7h18v-7M3 13h6l1 3h4l1-3h6" />
  </Icon>
);
const IconUser = (p: { size?: number; className?: string }) => (
  <Icon {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21v-1a6 6 0 016-6h4a6 6 0 016 6v1" />
  </Icon>
);
const IconZap = (p: { size?: number; className?: string }) => (
  <Icon {...p}>
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </Icon>
);
const IconGlobe = (p: { size?: number; className?: string }) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20" />
  </Icon>
);
const IconRocket = (p: { size?: number; className?: string }) => (
  <Icon {...p}>
    <path d="M5 19l4-4M19 5l-4 4M19 5v6h-6M5 19c0-3 1-6 3-8M19 5c-3 0-6 1-8 3" />
  </Icon>
);
const IconCalendar = (p: { size?: number; className?: string }) => (
  <Icon {...p}>
    <path d="M3 8h18M7 3v4M17 3v4" />
    <rect x="3" y="6" width="18" height="15" rx="2" />
  </Icon>
);
const IconStar = (p: { size?: number; className?: string }) => (
  <Icon {...p}>
    <path d="M12 2l3 7 7 .5-5.5 4.5 2 7-6.5-4-6.5 4 2-7L2 9.5 9 9z" />
  </Icon>
);

export const ScreenContent = memo(function ScreenContent({
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
});

// ==================================================================
// Web — SaaS dashboard chrome around the hero
// ==================================================================
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

// ==================================================================
// Desktop — productivity-app sidebar + task-list main pane
// ==================================================================
function DesktopScreenContent({
  title,
  desc,
  bullets,
}: {
  title: string;
  desc: string;
  bullets: ReadonlyArray<string>;
}) {
  // Sidebar items — first one is the active selection (matches the
  // bullet-card "first-is-brand" emphasis used on Web/Mobile).
  const sidebarItems: Array<{ label: string; icon: ReactNode; count?: number }> = [
    { label: 'Inbox', icon: <IconInbox size={14} />, count: 5 },
    { label: 'Today', icon: <IconCheck size={14} /> },
    { label: 'Upcoming', icon: <IconCalendar size={14} /> },
    { label: 'Starred', icon: <IconStar size={14} /> },
  ];

  return (
    <div
      className="relative flex h-full w-full overflow-hidden"
      style={{ fontFamily: SCREEN_FONT, background: '#fff' }}
    >
      {/* Sidebar */}
      <div
        className="flex w-[136px] shrink-0 flex-col border-r px-3 py-4 sm:w-[154px] sm:px-3.5 sm:py-5"
        style={{ borderColor: BORDER_HAIRLINE, background: SURFACE_RAISED }}
      >
        {/* Workspace header */}
        <div className="mb-3 flex items-center gap-1.5 px-1">
          <div
            className="h-4 w-4 rounded-[5px]"
            style={{ background: BRAND_GRAD }}
          />
          <span
            className="text-[13px] font-bold tracking-tight"
            style={{ color: TEXT_PRIMARY }}
          >
            Eikon
          </span>
        </div>

        <p
          className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-[0.16em]"
          style={{ color: TEXT_TERTIARY }}
        >
          Workspace
        </p>
        <div className="flex flex-col gap-0.5">
          {sidebarItems.map((item, i) => {
            const isActive = i === 0;
            return (
              <div
                key={item.label}
                className="flex items-center gap-1.5 rounded-md px-1.5 py-1"
                style={{
                  background: isActive ? BRAND_TINT_BG : 'transparent',
                  color: isActive ? BRAND : TEXT_SECONDARY,
                }}
              >
                {item.icon}
                <span
                  className="text-[12px] font-medium"
                  style={{
                    color: isActive ? '#92400e' : TEXT_SECONDARY,
                  }}
                >
                  {item.label}
                </span>
                {item.count !== undefined && (
                  <span
                    className="ml-auto rounded-full px-1.5 py-px text-[10px] font-bold"
                    style={{
                      background: isActive ? BRAND : '#e4e4e7',
                      color: isActive ? '#fff' : '#71717a',
                    }}
                  >
                    {item.count}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <p
          className="mt-3 mb-1.5 px-1 text-[10px] font-bold uppercase tracking-[0.16em]"
          style={{ color: TEXT_TERTIARY }}
        >
          Account
        </p>
        <div className="flex flex-col gap-0.5">
          <div
            className="flex items-center gap-1.5 rounded-md px-1.5 py-1"
            style={{ color: TEXT_SECONDARY }}
          >
            <IconUser size={14} />
            <span className="text-[12px] font-medium">Profile</span>
          </div>
        </div>
      </div>

      {/* Main pane */}
      <div className="flex flex-1 flex-col">
        {/* Top toolbar */}
        <div
          className="flex items-center gap-2 border-b px-5 py-2 sm:px-6"
          style={{ borderColor: BORDER_HAIRLINE }}
        >
          <span
            className="text-[12px] font-medium"
            style={{ color: TEXT_TERTIARY }}
          >
            Workspace / <span style={{ color: TEXT_PRIMARY }}>Inbox</span>
          </span>
          <div
            className="ml-auto flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-semibold text-white"
            style={{ background: BRAND }}
          >
            <IconPlus size={12} />
            New
          </div>
        </div>

        <div className="flex-1 px-5 py-4 sm:px-6 sm:py-5">
          <h3
            className="text-[22px] font-bold leading-[1.15] sm:text-[26px] md:text-[30px]"
            style={{ color: TEXT_PRIMARY, letterSpacing: '-0.025em' }}
          >
            {title}
          </h3>
          <p
            className="mt-2 max-w-[44ch] text-[14px] leading-[1.55] sm:text-[15px]"
            style={{ color: TEXT_SECONDARY }}
          >
            {desc}
          </p>

          {/* Task-row list — bullets become rows with checkboxes */}
          <div className="mt-4 flex flex-col gap-1">
            {bullets.map((b, i) => {
              const isActive = i === 0;
              return (
                <div
                  key={b}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-1.5"
                  style={{
                    background: isActive ? BRAND_TINT_BG : 'transparent',
                  }}
                >
                  <div
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded-md border"
                    style={{
                      borderColor: isActive ? BRAND : '#d4d4d8',
                      background: isActive ? BRAND : '#fff',
                      color: '#fff',
                    }}
                  >
                    {isActive && <IconCheck size={12} />}
                  </div>
                  <span
                    className="text-[13px] leading-snug sm:text-[14px]"
                    style={{
                      color: isActive ? '#92400e' : '#3a3a3c',
                      fontWeight: isActive ? 600 : 500,
                    }}
                  >
                    {b}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status bar */}
        <div
          className="flex items-center gap-2 border-t px-5 py-2 text-[11px] font-medium sm:px-6"
          style={{
            borderColor: BORDER_HAIRLINE,
            background: SURFACE_RAISED,
            color: TEXT_TERTIARY,
          }}
        >
          <div
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: '#34d399' }}
          />
          <span>Synced</span>
          <span className="ml-auto">v0.1.0</span>
        </div>
      </div>
    </div>
  );
}

// ==================================================================
// Mobile — feed app with header, content cards, tab bar
// ==================================================================
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
        className="flex items-center justify-between px-5 pt-4 pb-2 sm:px-6 sm:pt-5"
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
      <div className="px-5 pt-2 pb-3 sm:px-6">
        <p
          className="text-[13px] font-bold uppercase tracking-[0.18em] sm:text-[14px]"
          style={{ color: BRAND }}
        >
          {eyebrow}
        </p>
        <h3
          className="mt-1 text-[28px] font-bold leading-[1.15] sm:text-[32px]"
          style={{ color: TEXT_PRIMARY, letterSpacing: '-0.02em' }}
        >
          {title}
        </h3>
        <p
          className="mt-1.5 text-[14px] leading-[1.5] sm:text-[15px]"
          style={{ color: TEXT_SECONDARY }}
        >
          {desc}
        </p>
      </div>

      {/* Feature feed — bullets become cards */}
      <div className="flex flex-1 flex-col gap-2 px-4 pt-1 sm:px-5">
        {bullets.map((b, i) => {
          const isActive = i === 0;
          return (
            <div
              key={b}
              className="flex items-center gap-3 rounded-2xl border px-3.5 py-2.5 sm:px-4 sm:py-3"
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
