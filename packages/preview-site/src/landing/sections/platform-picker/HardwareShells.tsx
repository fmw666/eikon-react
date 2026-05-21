import type { CSSProperties, ReactNode } from 'react';

const LAPTOP_TOKENS = {
  lidTop: '#2a2d33',
  lidMid: '#1c1e22',
  lidBottom: '#121418',
  hingeTop: '#0a0c10',
  hingeMid: '#040506',
  deckTopRim: '#2a2c30',
  deckMidUpper: '#43464d',
  deckMid: '#585b62',
  deckMidLower: '#3e4047',
  deckBottom: '#1c1e22',
  keyWellTop: '#0d0f13',
  keyWellBottom: '#06080a',
  keyTop: '#171920',
  keyBottom: '#0a0b0e',
  trackpadTop: '#5e6168',
  trackpadMid: '#3a3d44',
  trackpadBottom: '#26282d',
} as const;

export function LaptopHardwareShell({ children }: { children: ReactNode }) {
  const lidPadding = 14;
  const notchWidth = 110;
  const notchHeight = 12;
  const deckHeight = 220;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Lid: titanium bezel + notch + camera + inner screen */}
      <div
        style={{
          position: 'relative',
          padding: lidPadding,
          paddingBottom: lidPadding - 2,
          background: `linear-gradient(180deg, ${LAPTOP_TOKENS.lidTop} 0%, ${LAPTOP_TOKENS.lidMid} 45%, ${LAPTOP_TOKENS.lidBottom} 100%)`,
          borderRadius: '16px 16px 0 0',
          boxShadow: [
            'inset 0 0 0 1px rgba(255,255,255,0.08)',
            'inset 0 1px 0 rgba(255,255,255,0.08)',
            '0 36px 60px -28px rgba(0,0,0,0.7)',
          ].join(', '),
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: notchWidth,
            height: notchHeight,
            background: '#000',
            borderRadius: '0 0 6px 6px',
            zIndex: 5,
            boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.05)',
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: notchHeight / 2 - 1.5,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 3,
            height: 3,
            borderRadius: '50%',
            background: '#1a1a1f',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.15)',
            zIndex: 6,
          }}
        />
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 4,
            background: '#000',
          }}
        >
          {children}
        </div>
      </div>

      {/* Hinge gap */}
      <div
        aria-hidden="true"
        style={{
          height: 3,
          background: `linear-gradient(180deg, ${LAPTOP_TOKENS.hingeTop} 0%, ${LAPTOP_TOKENS.hingeMid} 50%, ${LAPTOP_TOKENS.hingeTop} 100%)`,
        }}
      />

      {/* Deck: keyboard + trackpad */}
      <div
        style={{
          position: 'relative',
          height: deckHeight,
          background: `linear-gradient(180deg, ${LAPTOP_TOKENS.deckTopRim} 0%, ${LAPTOP_TOKENS.deckMidUpper} 10%, ${LAPTOP_TOKENS.deckMid} 52%, ${LAPTOP_TOKENS.deckMidLower} 86%, ${LAPTOP_TOKENS.deckBottom} 100%)`,
          borderRadius: '0 0 18px 18px',
          paddingTop: 22,
          paddingInline: 60,
          boxShadow: [
            'inset 0 1px 0 rgba(255,255,255,0.16)',
            'inset 0 -1.5px 0 rgba(0,0,0,0.5)',
            '0 22px 44px -22px rgba(0,0,0,0.65)',
          ].join(', '),
          overflow: 'hidden',
        }}
      >
        {/* Sheen */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '75%',
            background:
              'radial-gradient(ellipse 65% 90% at 50% 0%, rgba(255,255,255,0.11) 0%, rgba(255,255,255,0.04) 35%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        {/* Brushed-aluminium grain */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'repeating-linear-gradient(0deg, transparent 0 1px, rgba(255,255,255,0.022) 1px 2px)',
            opacity: 0.6,
            pointerEvents: 'none',
          }}
        />

        {/* Speaker grille */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 12,
            left: 80,
            right: 80,
            height: 4,
            background:
              'repeating-linear-gradient(90deg, rgba(0,0,0,0.5) 0 1.5px, transparent 1.5px 4px)',
            opacity: 0.6,
          }}
        />

        {/* Function-row strip */}
        <div
          aria-hidden="true"
          style={{
            position: 'relative',
            marginTop: 12,
            height: 8,
            background: `linear-gradient(180deg, ${LAPTOP_TOKENS.keyWellTop} 0%, ${LAPTOP_TOKENS.keyWellBottom} 100%)`,
            borderRadius: '4px 4px 1px 1px',
            boxShadow:
              'inset 0 1px 0 rgba(0,0,0,0.55), inset 0 -1px 0 rgba(255,255,255,0.03)',
          }}
        />

        {/* Keyboard well */}
        <div
          aria-hidden="true"
          style={{
            position: 'relative',
            marginTop: 1,
            height: 92,
            background: `linear-gradient(180deg, ${LAPTOP_TOKENS.keyWellTop} 0%, ${LAPTOP_TOKENS.keyWellBottom} 100%)`,
            borderRadius: '1px 1px 6px 6px',
            boxShadow: [
              'inset 0 1px 0 rgba(0,0,0,0.55)',
              'inset 0 -1px 0 rgba(255,255,255,0.04)',
            ].join(', '),
            padding: 7,
            display: 'grid',
            gridTemplateRows: 'repeat(4, 1fr)',
            gap: 4,
          }}
        >
          {[14, 14, 13, 9].map((cols, row) => (
            <div
              key={row}
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gap: 3,
                ...(row === 3
                  ? { paddingInline: '14%' }
                  : null),
              }}
            >
              {Array.from({ length: cols }).map((_, col) => (
                <div
                  key={col}
                  style={{
                    background: `linear-gradient(180deg, ${LAPTOP_TOKENS.keyTop} 0%, ${LAPTOP_TOKENS.keyBottom} 100%)`,
                    borderRadius: 2,
                    boxShadow:
                      'inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -1px 0 rgba(0,0,0,0.5)',
                  }}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Trackpad */}
        <div
          aria-hidden="true"
          style={{
            position: 'relative',
            margin: '14px auto 0',
            width: '50%',
            height: 60,
            background: `linear-gradient(180deg, ${LAPTOP_TOKENS.trackpadTop} 0%, ${LAPTOP_TOKENS.trackpadMid} 50%, ${LAPTOP_TOKENS.trackpadBottom} 100%)`,
            borderRadius: 9,
            boxShadow: [
              'inset 0 1px 0 rgba(255,255,255,0.22)',
              'inset 0 -1px 0 rgba(0,0,0,0.45)',
              'inset 0 0 0 1px rgba(0,0,0,0.4)',
              '0 1px 1px rgba(0,0,0,0.3)',
            ].join(', '),
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 'inherit',
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.02) 30%, transparent 60%)',
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>
    </div>
  );
}

const IMAC_TOKENS = {
  bezelTop: '#dfe0e3',
  bezelMid: '#cdced1',
  bezelBottom: '#b8babd',
  chinTop: '#cdced1',
  chinBottom: '#b1b3b7',
  neckTop: '#c3c5c8',
  neckBottom: '#a4a6aa',
  baseTop: '#bcbec2',
  baseBottom: '#94969a',
  appleLogo: 'rgba(0,0,0,0.32)',
} as const;

export function IMacHardwareShell({ children }: { children: ReactNode }) {
  const bezelPadding = 14;
  const chinHeight = 60;
  const neckHeight = 32;
  const baseHeight = 16;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Bezel + chin */}
      <div
        style={{
          position: 'relative',
          padding: bezelPadding,
          paddingBottom: bezelPadding + chinHeight,
          background: `linear-gradient(180deg, ${IMAC_TOKENS.bezelTop} 0%, ${IMAC_TOKENS.bezelMid} 45%, ${IMAC_TOKENS.bezelBottom} 100%)`,
          borderRadius: 18,
          boxShadow: [
            'inset 0 1px 0 rgba(255,255,255,0.85)',
            'inset 0 -1px 0 rgba(0,0,0,0.18)',
            'inset 0 0 0 1px rgba(0,0,0,0.08)',
            '0 30px 60px -28px rgba(0,0,0,0.45)',
          ].join(', '),
        }}
      >
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 6,
            background: '#000',
          }}
        >
          {children}
        </div>
        {/* Chin */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: chinHeight,
            background: `linear-gradient(180deg, ${IMAC_TOKENS.chinTop} 0%, ${IMAC_TOKENS.chinBottom} 100%)`,
            borderRadius: '0 0 18px 18px',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppleLogo
            style={{ width: 18, height: 22, color: IMAC_TOKENS.appleLogo }}
          />
        </div>
      </div>

      {/* Neck */}
      <div
        aria-hidden="true"
        style={{
          margin: '0 auto',
          width: '22%',
          height: neckHeight,
          background: `linear-gradient(180deg, ${IMAC_TOKENS.neckTop} 0%, ${IMAC_TOKENS.neckBottom} 100%)`,
          clipPath: 'polygon(18% 0, 82% 0, 100% 100%, 0 100%)',
        }}
      />

      {/* Base */}
      <div
        aria-hidden="true"
        style={{
          margin: '0 auto',
          width: '52%',
          height: baseHeight,
          background: `linear-gradient(180deg, ${IMAC_TOKENS.baseTop} 0%, ${IMAC_TOKENS.baseBottom} 100%)`,
          borderRadius: '6px 6px 50% 50% / 6px 6px 100% 100%',
          boxShadow: '0 12px 22px -10px rgba(0,0,0,0.45)',
        }}
      />
    </div>
  );
}

function AppleLogo({ style }: { style?: CSSProperties }) {
  return (
    <svg
      viewBox="0 0 814 1000"
      style={style}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M790.5 654c-19.6 56.7-45.1 113.3-86.7 162.4-32.6 38.4-72.1 86.2-122.7 86.5-44.6.2-58-29-118.5-29-60.4 0-77.2 28.7-119.6 29.5-49 .9-87.4-41.7-119.9-79.5C151.6 738.2 100 597.6 137 482c20.8-65.6 75.9-117.3 144.5-127.8 51.4-7.9 99 24.3 130 24.3 30.9 0 88.8-30.1 149.7-25.7 25.5 1.1 97 10.3 142.9 77.6-3.7 2.3-85.4 49.9-84.5 148.9 1 118.4 103.6 157.8 104.9 158.4-1 3.2-16.5 56.3-54 113.3zM497.5 198.4c27.9-32.7 46.4-78.4 41.4-123.7-39.6 1.6-89 26.1-117.5 58.8-25.5 28.9-47.9 75.4-41.9 119.7 43.9 3.4 88.9-22.3 118-54.8z" />
    </svg>
  );
}
