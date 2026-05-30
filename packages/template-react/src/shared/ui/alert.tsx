/**
 * @file alert.tsx
 * @description Inline status banner with icon-slot + Title + Description
 * structure. Five variants cover the semantic colour set added by the
 * design-system audit: default (neutral), destructive, success, warning,
 * info. Each variant maps to a `--color-X` / `--color-X-foreground` pair.
 *
 * Title / Description come as separate exports rather than being baked
 * into the root so consumers can compose freely (icon + title only,
 * description only, etc.).
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import * as React from 'react';

// --- Third-party Libraries ---
import { cva, type VariantProps } from 'class-variance-authority';

// --- Absolute Imports ---
import { cn } from '@/shared/lib/cn';

// =================================================================================================
// Variants
// =================================================================================================

const alertVariants = cva(
  'relative w-full rounded-md p-4 text-sm ' +
    'border-[length:var(--surface-border-width)] ' +
    '[&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:h-4 [&>svg]:w-4 ' +
    '[&>svg+*]:pl-7 [&>svg~*]:pl-7',
  {
    variants: {
      variant: {
        default:
          'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-card-foreground)]',
        destructive:
          'border-transparent bg-[var(--color-destructive)] text-[var(--color-destructive-foreground)]',
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
// Components
// =================================================================================================

interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
);
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('mb-1 font-medium leading-none tracking-tight', className)}
    {...props}
  />
));
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm leading-relaxed [&_p]:leading-relaxed', className)}
    {...props}
  />
));
AlertDescription.displayName = 'AlertDescription';

// =================================================================================================
// Exports
// =================================================================================================

export { Alert, AlertDescription, AlertTitle };
// eslint-disable-next-line react-refresh/only-export-components
export { alertVariants };
export type { AlertProps };
