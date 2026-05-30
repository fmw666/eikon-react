/**
 * @file textarea.tsx
 * @description Token-driven `<textarea>` wrapper. Mirrors `input.tsx`'s
 * styling vocabulary so a form can pair Input and Textarea controls
 * without visible styling drift — same border, same focus halo, same
 * placeholder colour. Defaults to `min-h-20` so single-line autoresize
 * libraries get a sane starting size.
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

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'flex min-h-20 w-full rounded-md bg-[var(--color-input)] px-3 py-2 text-sm text-[var(--color-foreground)]',
          'border-[length:var(--surface-border-width)] border-[var(--color-border)]',
          'placeholder:text-[var(--color-muted-foreground)]',
          'transition-[box-shadow,border-color] duration-[var(--duration-fast)]',
          'focus-visible:outline-none focus-visible:[box-shadow:0_0_0_var(--ring-offset-width)_var(--ring-offset-color),0_0_0_calc(var(--ring-offset-width)_+_var(--ring-width))_var(--color-ring)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'resize-y',
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';

// =================================================================================================
// Exports
// =================================================================================================

export { Textarea };
export type { TextareaProps };
