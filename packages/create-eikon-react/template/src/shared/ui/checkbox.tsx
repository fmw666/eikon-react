/**
 * @file checkbox.tsx
 * @description Token-driven checkbox built on `@radix-ui/react-checkbox`.
 * Indicator uses Lucide's Check icon. Focus halo geometry tracks
 * `--ring-width` / `--ring-offset-*` per the design preset.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import * as React from 'react';

// --- Third-party Libraries ---
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';

// --- Absolute Imports ---
import { cn } from '@/shared/lib/cn';

// =================================================================================================
// Component
// =================================================================================================

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'peer h-4 w-4 shrink-0 rounded-sm',
      'border-[length:var(--surface-border-width)] border-[var(--color-border)]',
      'focus-visible:outline-none focus-visible:[box-shadow:0_0_0_var(--ring-offset-width)_var(--ring-offset-color),0_0_0_calc(var(--ring-offset-width)_+_var(--ring-width))_var(--color-ring)]',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'data-[state=checked]:bg-[var(--color-primary)] data-[state=checked]:text-[var(--color-primary-foreground)] data-[state=checked]:border-[var(--color-primary)]',
      'transition-colors duration-[var(--duration-fast)]',
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn('flex items-center justify-center text-current')}
    >
      <Check className="h-3.5 w-3.5" strokeWidth={3} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

// =================================================================================================
// Exports
// =================================================================================================

export { Checkbox };
