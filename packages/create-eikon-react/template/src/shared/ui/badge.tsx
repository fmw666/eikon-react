/**
 * @file badge.tsx
 * @description Token-driven status / tag chip. Eight variants cover the
 * standard states (default / secondary / destructive / outline) plus
 * the new semantic state colours (success / warning / info) shipped by
 * the design-system audit pass. Variant pickup is via class-variance-
 * authority, matching `button.tsx`'s shape so consumers familiar with
 * Button feel at home.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import type * as React from 'react';

// --- Third-party Libraries ---
import { cva, type VariantProps } from 'class-variance-authority';

// --- Absolute Imports ---
import { cn } from '@/shared/lib/cn';

// =================================================================================================
// Variants
// =================================================================================================

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-medium ' +
    'border-[length:var(--surface-border-width)] transition-colors duration-[var(--duration-fast)]',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-[var(--color-primary)] text-[var(--color-primary-foreground)]',
        secondary:
          'border-transparent bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)]',
        destructive:
          'border-transparent bg-[var(--color-destructive)] text-[var(--color-destructive-foreground)]',
        outline:
          'border-[var(--color-border)] text-[var(--color-foreground)]',
        success:
          'border-transparent bg-[var(--color-success)] text-[var(--color-success-foreground)]',
        warning:
          'border-transparent bg-[var(--color-warning)] text-[var(--color-warning-foreground)]',
        info:
          'border-transparent bg-[var(--color-info)] text-[var(--color-info-foreground)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

// =================================================================================================
// Component
// =================================================================================================

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export { Badge };
// eslint-disable-next-line react-refresh/only-export-components
export { badgeVariants };
export type { BadgeProps };
