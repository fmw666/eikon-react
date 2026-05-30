/**
 * @file skeleton.tsx
 * @description Loading-state placeholder. Pulses on `--color-muted`
 * using the design's `--duration-slow` + `--ease-in-out` tokens so
 * the animation cadence reflects the active design language (apple's
 * relaxed pulse, vercel's snappier blink, cyberpunk's fast flicker).
 *
 * No Radix dependency — it's a div with a class.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import type * as React from 'react';

// --- Absolute Imports ---
import { cn } from '@/shared/lib/cn';

// =================================================================================================
// Component
// =================================================================================================

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

function Skeleton({ className, style, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-md bg-[var(--color-muted)]',
        'motion-safe:animate-pulse',
        className
      )}
      style={{
        animationDuration: 'var(--duration-slow)',
        animationTimingFunction: 'var(--ease-in-out)',
        ...style,
      }}
      {...props}
    />
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export { Skeleton };
export type { SkeletonProps };
