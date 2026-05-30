/**
 * @file radio-group.tsx
 * @description Token-driven radio set built on
 * `@radix-ui/react-radio-group`. Visual treatment matches
 * `checkbox.tsx`'s sizing / focus halo so the two controls feel like
 * siblings in a form.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import * as React from 'react';

// --- Third-party Libraries ---
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { Circle } from 'lucide-react';

// --- Absolute Imports ---
import { cn } from '@/shared/lib/cn';

// =================================================================================================
// Components
// =================================================================================================

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Root
    ref={ref}
    className={cn('grid gap-2', className)}
    {...props}
  />
));
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Item
    ref={ref}
    className={cn(
      'aspect-square h-4 w-4 rounded-full',
      'border-[length:var(--surface-border-width)] border-[var(--color-border)] text-[var(--color-primary)]',
      'focus-visible:outline-none focus-visible:[box-shadow:0_0_0_var(--ring-offset-width)_var(--ring-offset-color),0_0_0_calc(var(--ring-offset-width)_+_var(--ring-width))_var(--color-ring)]',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'data-[state=checked]:border-[var(--color-primary)]',
      'transition-colors duration-[var(--duration-fast)]',
      className
    )}
    {...props}
  >
    <RadioGroupPrimitive.Indicator
      className={cn('flex items-center justify-center')}
    >
      <Circle className="h-2 w-2 fill-current text-current" />
    </RadioGroupPrimitive.Indicator>
  </RadioGroupPrimitive.Item>
));
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

// =================================================================================================
// Exports
// =================================================================================================

export { RadioGroup, RadioGroupItem };
