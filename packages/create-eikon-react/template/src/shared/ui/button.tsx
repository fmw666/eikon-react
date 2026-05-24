/**
 * @file button.tsx
 * @description Animated primary Button primitive backed by class-variance-authority.
 *
 * Combines:
 *   - Radix Slot (so `asChild` lets the consumer render a different DOM
 *     element while inheriting all styling).
 *   - motion/react for the subtle tap-shrink + hover-lift micro-interaction.
 *   - `useReducedMotion` to opt out for users with prefers-reduced-motion.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import * as React from 'react';

// --- Third-party Libraries ---
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import {
  motion,
  useReducedMotion,
  type HTMLMotionProps,
} from 'motion/react';

// --- Absolute Imports ---
import { cn } from '@/shared/lib/cn';

// =================================================================================================
// Variants
// =================================================================================================

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ' +
    'ring-offset-[var(--color-background)] transition-colors ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 ' +
    'disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-sm hover:opacity-90',
        secondary:
          'bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)] hover:bg-[var(--color-accent)]',
        outline:
          'border border-[var(--color-border)] bg-transparent text-[var(--color-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)]',
        ghost:
          'bg-transparent text-[var(--color-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)]',
        destructive:
          'bg-[var(--color-destructive)] text-[var(--color-destructive-foreground)] hover:opacity-90',
        link: 'bg-transparent text-[var(--color-primary)] underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3',
        md: 'h-9 px-4',
        lg: 'h-10 px-6',
        icon: 'h-9 w-9 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

// =================================================================================================
// Types
// =================================================================================================

type MotionButtonBaseProps = Omit<HTMLMotionProps<'button'>, 'children'>;

interface ButtonProps
  extends MotionButtonBaseProps,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  children?: React.ReactNode;
}

// =================================================================================================
// Component
// =================================================================================================

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    // Honour OS-level prefers-reduced-motion: skip the hover-lift and
    // tap-shrink animations entirely (CSS hover styles still apply).
    const reduceMotion = useReducedMotion();

    if (asChild) {
      return (
        <Slot
          ref={ref as React.Ref<HTMLElement>}
          className={cn(buttonVariants({ variant, size }), className)}
          {...(props as React.HTMLAttributes<HTMLElement>)}
        >
          {children}
        </Slot>
      );
    }

    return (
      <motion.button
        ref={ref}
        whileTap={reduceMotion ? undefined : { scale: 0.97 }}
        whileHover={reduceMotion ? undefined : { y: -1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

// =================================================================================================
// Exports
// =================================================================================================

export { Button };
// eslint-disable-next-line react-refresh/only-export-components
export { buttonVariants };
export type { ButtonProps };
