/**
 * @file label.tsx
 * @description Token-driven `<label>` wrapper. We don't bring in
 * `@radix-ui/react-label` because native `<label htmlFor>` already
 * gives us click-forwarding + screen-reader association, and the
 * Radix wrapper's only differentiator (preventing text selection on
 * double-click) is a behaviour shadcn / animate-ui replicate via
 * Tailwind's `select-none`. Keeping zero new deps for the simple case.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import * as React from 'react';

// --- Absolute Imports ---
import { cn } from '@/shared/lib/cn';

// =================================================================================================
// Component
// =================================================================================================

type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          'text-sm font-medium leading-none text-[var(--color-foreground)] select-none',
          'peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
          className
        )}
        {...props}
      />
    );
  }
);

Label.displayName = 'Label';

// =================================================================================================
// Exports
// =================================================================================================

export { Label };
export type { LabelProps };
