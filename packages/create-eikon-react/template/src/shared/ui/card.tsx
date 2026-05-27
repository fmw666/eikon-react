/**
 * @file card.tsx
 * @description Card primitive + structural helpers (Header / Title / Description / Content / Footer).
 *
 * Plain-element components that mirror the upstream shadcn / animate-ui
 * surface, so swapping `--ui` doesn't change the API. Hover-lift is now
 * an opt-in className (`cardHoverableClass`) callers add explicitly.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import * as React from 'react';

// --- Absolute Imports ---
import { cn } from '@/shared/lib/cn';

// =================================================================================================
// Constants
// =================================================================================================

const cardHoverableClass =
  'transition-shadow duration-200 hover:[box-shadow:var(--surface-hover-shadow)] active:[box-shadow:var(--surface-active-shadow)]';

// =================================================================================================
// Components
// =================================================================================================

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
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

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
// eslint-disable-next-line react-refresh/only-export-components
export { cardHoverableClass };
