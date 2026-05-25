import {
  type CSSProperties,
  type ReactNode,
  memo,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { DeviceShell, type DevicePlatform } from '@/shell/device-shell';

import { ActiveAmbience } from './ActiveAmbience';
import {
  type StackSlot,
  SCREEN_DIM_SCRIM,
  SCREEN_DIM_SCRIM_INACTIVE,
  STACK_SLOT_SCALE,
} from './constants';
import { IMacHardwareShell, LaptopHardwareShell } from './HardwareShells';

const OVERLAY_STYLE_MOBILE: CSSProperties = { inset: 10, borderRadius: 32 };
const OVERLAY_STYLE_OTHER: CSSProperties = { inset: 0, borderRadius: 12 };

export const INNER_BASE_STYLE: CSSProperties = {
  transformOrigin: 'center center',
  transition: 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)',
  willChange: 'transform',
  backfaceVisibility: 'hidden',
  WebkitBackfaceVisibility: 'hidden',
  // DO NOT REMOVE — forces Chromium to use high-quality AA on this GPU layer;
  // without it, backface-visibility:hidden degrades border-radius rendering
  // on scaled/rotated side cards (visible as wavy/jagged device borders).
  filter: 'blur(0px)',
  pointerEvents: 'auto',
  cursor: 'pointer',
};

export const ScaledDeviceShell = memo(function ScaledDeviceShell({
  slot,
  platform,
  active,
  glassNonce,
  title,
  children,
}: {
  slot: StackSlot;
  platform: DevicePlatform;
  active: boolean;
  glassNonce: number;
  title: string;
  children: ReactNode;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    const inner = innerRef.current;
    if (!wrapper || !inner) return;
    const recalc = () => {
      const wr = wrapper.getBoundingClientRect();
      const natW = inner.offsetWidth;
      const natH = inner.offsetHeight;
      if (!natW || !natH || !wr.width || !wr.height) return;
      const sx = (wr.width * 0.92) / natW;
      const sy = (wr.height * 0.92) / natH;
      setScale(Math.min(sx, sy));
    };
    recalc();
    const ro = new ResizeObserver(recalc);
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, [platform]);

  const layoutScale = scale * STACK_SLOT_SCALE[slot];

  const innerStyle = useMemo<CSSProperties>(
    () => ({ ...INNER_BASE_STYLE, transform: `scale(${layoutScale})` }),
    [layoutScale]
  );

  const overlayStyle =
    platform === 'mobile' ? OVERLAY_STYLE_MOBILE : OVERLAY_STYLE_OTHER;

  const deviceClass =
    platform === 'mobile'
      ? 'eikon-device-mobile'
      : platform === 'desktop'
        ? 'eikon-device-desktop'
        : 'eikon-device-web';

  const renderScreen = (screenStyle: CSSProperties) => (
    <div
      className={deviceClass}
      style={{
        ...screenStyle,
        position: 'relative',
        overflow: 'hidden',
        background: screenStyle.background,
      }}
    >
      {children}
    </div>
  );

  const softwareShell = (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <DeviceShell
        platform={platform}
        size="small"
        title={title}
        domain="eikon-devkit.preview"
      >
        {renderScreen}
      </DeviceShell>
      {(!active || glassNonce === 0) && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute z-[3]"
          style={{
            ...overlayStyle,
            backgroundColor: !active
              ? SCREEN_DIM_SCRIM_INACTIVE
              : SCREEN_DIM_SCRIM,
          }}
        />
      )}
      {active && glassNonce > 0 && (
          <span
            key={`wake-${glassNonce}`}
            aria-hidden="true"
            className="eikon-screen-wake"
            style={overlayStyle}
          />
      )}
    </div>
  );

  let body: ReactNode;
  if (platform === 'web') {
    body = <LaptopHardwareShell>{softwareShell}</LaptopHardwareShell>;
  } else if (platform === 'desktop') {
    body = <IMacHardwareShell>{softwareShell}</IMacHardwareShell>;
  } else {
    body = softwareShell;
  }

  return (
    <div
      ref={wrapperRef}
      className="absolute inset-0 flex items-center justify-center"
    >
      <div ref={innerRef} className="relative" style={innerStyle}>
        <ActiveAmbience active={active} platform={platform} />
        <div className="relative z-10">{body}</div>
      </div>
    </div>
  );
});
