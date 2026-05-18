import { motion, type HTMLMotionProps } from 'motion/react';
import * as React from 'react';

import { cn } from '@/shared/lib/cn';

export interface CardProps extends HTMLMotionProps<'div'> {
  hoverable?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, hoverable = false, ...props }, ref) => (
    <motion.div
      ref={ref}
      whileHover={hoverable ? { y: -2 } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className={cn(
        'rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-card-foreground)] shadow-sm',
        className
      )}
      {...props}
    />
  )
);
Card.displayName = 'Card';

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1.5 p-6', className)} {...props} />;
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-lg font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  );
}

export function CardDescription({
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

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6 pt-0', className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center p-6 pt-0', className)} {...props} />
  );
}
