/**
 * @file card.tsx
 * @description Card primitive + structural helpers (Header / Title / Description / Content / Footer).
 *
 * The root `<Card>` is a `motion.div`; when `hoverable` is set it lifts
 * subtly on hover, honouring `prefers-reduced-motion`.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import * as React from 'react';

// --- Third-party Libraries ---
import {
  motion,
  useReducedMotion,
  type HTMLMotionProps,
} from 'motion/react';

// --- Absolute Imports ---
import { cn } from '@/shared/lib/cn';

// =================================================================================================
// Types
// =================================================================================================

interface CardProps extends HTMLMotionProps<'div'> {
  hoverable?: boolean;
}

// =================================================================================================
// Components
// =================================================================================================

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, hoverable = false, ...props }, ref) => {
    const reduceMotion = useReducedMotion();
    const wantsHover = hoverable && !reduceMotion;
    return (
      <motion.div
        ref={ref}
        whileHover={wantsHover ? { y: -2 } : undefined}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        className={cn(
          'rounded-lg border-[length:var(--surface-border-width)] border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-card-foreground)] shadow-sm ring-[length:var(--surface-ring-width)] ring-[var(--surface-ring-color)] [backdrop-filter:var(--surface-backdrop)]',
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = 'Card';

function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col gap-1.5 p-6', className)} {...props} />
  );
}

function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        'text-lg font-semibold leading-none tracking-tight',
        className
      )}
      {...props}
    />
  );
}

function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-sm text-[var(--color-muted-foreground)]', className)}
      {...props}
    />
  );
}

function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6 pt-0', className)} {...props} />;
}

function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center p-6 pt-0', className)} {...props} />
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
};
export type { CardProps };
