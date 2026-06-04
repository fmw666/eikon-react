import { useEffect, useState } from 'react';

import { COLOR_TEXT_MUTED } from './tokens';

export function TreeSpinner({ delay = 400 }: { delay?: number }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  if (!show) return null;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        minHeight: 80,
        animation: 'eikon-fade-in 300ms ease both',
      }}
    >
      <svg
        width={18}
        height={18}
        viewBox="0 0 24 24"
        style={{ animation: 'spin 0.8s linear infinite', color: COLOR_TEXT_MUTED }}
      >
        <circle
          cx={12}
          cy={12}
          r={10}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeDasharray="50 20"
          strokeLinecap="round"
        />
      </svg>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes eikon-fade-in{from{opacity:0}to{opacity:1}}
      `}</style>
    </div>
  );
}
