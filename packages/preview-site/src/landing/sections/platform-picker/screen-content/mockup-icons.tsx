import type { ReactNode } from 'react';

// ------------------------------------------------------------------
// Icon primitive — 1.6px stroke, round caps, inherits `currentColor`.
// All inline SVGs in the screen mockups share these defaults so the
// mockups have one consistent line weight.
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
      shapeRendering="geometricPrecision"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

type IconProps = { size?: number; className?: string };

export const IconSearch = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.35-4.35" />
  </Icon>
);
export const IconHome = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 11l9-8 9 8v9a2 2 0 01-2 2h-4v-7h-6v7H5a2 2 0 01-2-2v-9z" />
  </Icon>
);
export const IconCheck = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 12l5 5L20 7" />
  </Icon>
);
export const IconPlus = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);
export const IconList = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
  </Icon>
);
export const IconInbox = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 13l2-7h14l2 7M3 13v7h18v-7M3 13h6l1 3h4l1-3h6" />
  </Icon>
);
export const IconUser = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21v-1a6 6 0 016-6h4a6 6 0 016 6v1" />
  </Icon>
);
export const IconZap = (p: IconProps) => (
  <Icon {...p}>
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </Icon>
);
export const IconGlobe = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20" />
  </Icon>
);
export const IconRocket = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 19l4-4M19 5l-4 4M19 5v6h-6M5 19c0-3 1-6 3-8M19 5c-3 0-6 1-8 3" />
  </Icon>
);
export const IconCalendar = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 8h18M7 3v4M17 3v4" />
    <rect x="3" y="6" width="18" height="15" rx="2" />
  </Icon>
);
export const IconStar = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 2l3 7 7 .5-5.5 4.5 2 7-6.5-4-6.5 4 2-7L2 9.5 9 9z" />
  </Icon>
);
