/**
 * @file input.tsx
 * @description Token-driven `<input>` wrapper. Native element under the
 * hood — no Radix dependency, since the browser already gives us full
 * keyboard semantics, IME composition handling, and form-association.
 *
 * Surface tokens consumed: `--color-input` (background), `--color-foreground`
 * (text), `--color-muted-foreground` (placeholder), `--color-ring` +
 * `--ring-width` + `--ring-offset-*` (focus halo), `--radius-md`,
 * `--surface-border-width`. Matches the focus-ring geometry tokens added
 * in the design-system audit so the halo width/offset reflects the
 * active design preset rather than a one-size-fits-all 2px ring.
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

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          'flex h-9 w-full rounded-md bg-[var(--color-input)] px-3 py-1 text-sm text-[var(--color-foreground)]',
          'border-[length:var(--surface-border-width)] border-[var(--color-border)]',
          'placeholder:text-[var(--color-muted-foreground)]',
          'transition-[box-shadow,border-color] duration-[var(--duration-fast)]',
          'focus-visible:outline-none focus-visible:[box-shadow:0_0_0_var(--ring-offset-width)_var(--ring-offset-color),0_0_0_calc(var(--ring-offset-width)_+_var(--ring-width))_var(--color-ring)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[var(--color-foreground)]',
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

// =================================================================================================
// Exports
// =================================================================================================

export { Input };
export type { InputProps };
