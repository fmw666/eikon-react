import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion, type HTMLMotionProps } from 'motion/react';
import * as React from 'react';

import { cn } from '@/shared/lib/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ' +
    'ring-offset-[var(--color-background)] transition-colors ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 ' +
    'disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:opacity-90',
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

type MotionButtonBaseProps = Omit<HTMLMotionProps<'button'>, 'children'>;

export interface ButtonProps
  extends MotionButtonBaseProps,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  children?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
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
        whileTap={{ scale: 0.97 }}
        whileHover={{ y: -1 }}
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

// eslint-disable-next-line react-refresh/only-export-components
export { buttonVariants };
