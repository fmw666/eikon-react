/**
 * @file switch.tsx
 * @description Token-driven toggle switch built on
 * `@radix-ui/react-switch`. Track colour swaps between `--color-input`
 * (off) and `--color-primary` (on); thumb glides on `--duration-normal`
 * with `--ease-out` so motion timing reflects the active design preset.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import * as React from 'react';

// --- Third-party Libraries ---
import * as SwitchPrimitive from '@radix-ui/react-switch';

// --- Absolute Imports ---
import { cn } from '@/shared/lib/cn';

// =================================================================================================
// Component
// =================================================================================================

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, style, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full',
      'border-[length:var(--surface-border-width)] border-transparent',
      'transition-colors',
      'focus-visible:outline-none focus-visible:[box-shadow:0_0_0_var(--ring-offset-width)_var(--ring-offset-color),0_0_0_calc(var(--ring-offset-width)_+_var(--ring-width))_var(--color-ring)]',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'data-[state=checked]:bg-[var(--color-primary)] data-[state=unchecked]:bg-[var(--color-input)]',
      className
    )}
    style={{
      transitionDuration: 'var(--duration-normal)',
      transitionTimingFunction: 'var(--ease-out)',
      ...style,
    }}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        'pointer-events-none block h-4 w-4 rounded-full bg-[var(--color-primary-foreground)] shadow-sm ring-0',
        'transition-transform',
        'data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0'
      )}
      style={{
        transitionDuration: 'var(--duration-normal)',
        transitionTimingFunction: 'var(--ease-out)',
      }}
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = SwitchPrimitive.Root.displayName;

// =================================================================================================
// Exports
// =================================================================================================

export { Switch };
