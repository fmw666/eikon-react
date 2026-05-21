import type { CSSProperties } from 'react';

import type { DevicePlatform } from '@/shell/device-shell';

const AMBIENCE_SCREEN: Record<DevicePlatform, {
  far: CSSProperties;
  close: CSSProperties;
  spill: CSSProperties;
}> = {
  web: {
    far: { top: '-8%', bottom: '10%', left: '-14%', right: '-14%', borderRadius: 32 },
    close: { top: '2%', bottom: '20%', left: '-2%', right: '-2%', borderRadius: 18 },
    spill: { top: '62%', bottom: '-8%', left: '8%', right: '8%', borderRadius: 12 },
  },
  desktop: {
    far: { top: '-8%', bottom: '14%', left: '-14%', right: '-14%', borderRadius: 32 },
    close: { top: '2%', bottom: '24%', left: '-2%', right: '-2%', borderRadius: 18 },
    spill: { top: '58%', bottom: '-6%', left: '12%', right: '12%', borderRadius: 12 },
  },
  mobile: {
    far: { top: '-4%', bottom: '-10%', left: '-24%', right: '-24%', borderRadius: 36 },
    close: { top: '2%', bottom: '-2%', left: '-8%', right: '-8%', borderRadius: 24 },
    spill: { top: '8%', bottom: '-6%', left: '-14%', right: '-14%', borderRadius: 28 },
  },
};

export function ActiveAmbience({ active, platform }: { active: boolean; platform: DevicePlatform }) {
  if (!active) return null;
  const cfg = AMBIENCE_SCREEN[platform];
  return (
    <>
      {/* Far glow — large soft wash radiating from the screen shape. */}
      <span
        aria-hidden="true"
        className="eikon-screen-glow pointer-events-none absolute"
        style={{
          ...cfg.far,
          background:
            'radial-gradient(ellipse 80% 70% at 50% 55%, rgba(252,211,77,0.20) 0%, rgba(253,230,138,0.08) 40%, transparent 80%)',
          filter: 'blur(60px)',
        }}
      />
      {/* Close halo — tighter glow at the screen edges. */}
      <span
        aria-hidden="true"
        className="eikon-screen-glow pointer-events-none absolute"
        style={{
          ...cfg.close,
          background:
            'radial-gradient(ellipse 90% 80% at 50% 55%, rgba(253,230,138,0.14) 0%, rgba(253,230,138,0.04) 55%, transparent 80%)',
          filter: 'blur(20px)',
        }}
      />
      {/* Spill — faint warm wash on device body surfaces. */}
      <span
        aria-hidden="true"
        className="eikon-screen-glow pointer-events-none absolute"
        style={{
          ...cfg.spill,
          background:
            'radial-gradient(ellipse 100% 80% at 50% 0%, rgba(253,230,138,0.09) 0%, transparent 70%)',
          filter: 'blur(14px)',
        }}
      />
    </>
  );
}
