import {
  type CSSProperties,
  type ReactNode,
  useLayoutEffect,
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

export function ScaledDeviceShell({
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

  const renderScreen = (screenStyle: CSSProperties) => (
    <div
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

  const overlayStyle: CSSProperties =
    platform === 'mobile'
      ? { inset: 10, borderRadius: 32 }
      : { inset: 0, borderRadius: 12 };

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
      <div
        ref={innerRef}
        className="relative"
        style={{
          transform: `scale(${layoutScale})`,
          transformOrigin: 'center center',
          transition: 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)',
          willChange: 'transform',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          filter: 'blur(0px)',
          pointerEvents: 'auto',
          cursor: 'pointer',
        }}
      >
        <ActiveAmbience active={active} platform={platform} />
        <div className="relative z-10">{body}</div>
      </div>
    </div>
  );
}
