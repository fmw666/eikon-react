import type { ReactNode } from 'react';

import {
  BORDER_HAIRLINE,
  BRAND,
  BRAND_GRAD,
  BRAND_TINT_BG,
  SCREEN_FONT,
  SURFACE_RAISED,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
} from './theme';
import {
  IconCalendar,
  IconCheck,
  IconInbox,
  IconPlus,
  IconStar,
  IconUser,
} from './mockup-icons';

// ==================================================================
// Desktop — productivity-app sidebar + task-list main pane
// ==================================================================
export function DesktopScreenContent({
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
