import type { CSSProperties } from 'react';

import type { FrameSize } from '../store';
import type { DeviceShellProps } from './types';
import { DESKTOP_SCREEN } from './types';
import { APPLE_TOKENS } from './tokens';

// =================================================================================================
// DesktopShell — macOS Sequoia window
// =================================================================================================

export const TITLE_BAR_HEIGHT = 28;

export function DesktopShell({
  size,
  title,
  children,
}: {
  size: FrameSize;
  title: string;
  children: DeviceShellProps['children'];
}) {
  const screen = DESKTOP_SCREEN[size];
  const radius = 12;

  return (
    <div
      style={{
        position: 'relative',
        width: screen.width,
        height: screen.height + TITLE_BAR_HEIGHT,
        maxWidth: '100%',
        maxHeight: '100%',
        background: '#fff',
        borderRadius: radius,
        boxShadow: APPLE_TOKENS.bodyShadow,
        border: `1px solid ${APPLE_TOKENS.windowBorder}`,
        overflow: 'hidden',
        flex: '0 0 auto',
        display: 'flex',
        flexDirection: 'column',
      }}
      role="img"
      aria-label="macOS window preview"
    >
      <TitleBar title={title} />
      <div style={{ flex: 1, position: 'relative' }}>
        {children({
          width: '100%',
          height: '100%',
          border: 0,
          borderRadius: 0,
          background: '#fff',
        })}
      </div>
    </div>
  );
}

function TitleBar({ title }: { title: string }) {
  return (
    <div
      aria-hidden="true"
      style={{
        height: TITLE_BAR_HEIGHT,
        background: APPLE_TOKENS.titleBarBg,
        borderBottom: `1px solid ${APPLE_TOKENS.windowBorder}`,
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        padding: '0 12px',
        userSelect: 'none',
      }}
    >
      <TrafficLights />
      <div
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: APPLE_TOKENS.titleColor,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {title}
      </div>
      <span />
    </div>
  );
}

export function TrafficLights() {
  // Three real-shaped traffic-light buttons. We don't wire them to any
  // window-management action — the playground's window IS the parent —
  // but we draw them so the chrome reads as a real macOS title bar at
  // a glance. Slight inner shadow + border gives the dot a tactile feel.
  const dot = (color: string): CSSProperties => ({
    width: 12,
    height: 12,
    borderRadius: '50%',
    background: color,
    border: `1px solid ${APPLE_TOKENS.trafficStroke}`,
    boxShadow: '0 0 0 1px rgba(0,0,0,0.04) inset',
  });
  return (
    <span style={{ display: 'inline-flex', gap: 8 }}>
      <span style={dot(APPLE_TOKENS.trafficClose)} />
      <span style={dot(APPLE_TOKENS.trafficMin)} />
      <span style={dot(APPLE_TOKENS.trafficMax)} />
    </span>
  );
}
