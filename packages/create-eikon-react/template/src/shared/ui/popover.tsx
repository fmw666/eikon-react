/**
 * @file popover.tsx
 * @description Token-driven popover built on `@radix-ui/react-popover`.
 * Surface treatment matches `command.tsx`'s panel (popover bg, border,
 * surface backdrop) so a popover with a Command palette inside reads
 * as one unified surface. Z-index is bound to `--z-popover`.
 *
 * `Popover` / `PopoverTrigger` are passthroughs from Radix because
 * they have no styling concerns — only `PopoverContent` carries the
 * design tokens.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import * as React from 'react';

// --- Third-party Libraries ---
import * as PopoverPrimitive from '@radix-ui/react-popover';

// --- Absolute Imports ---
import { cn } from '@/shared/lib/cn';

// =================================================================================================
// Components
// =================================================================================================

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = 'center', sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'z-[var(--z-popover)] w-72 rounded-md p-4 outline-none',
        'app-dropdown-content',
        'bg-[var(--color-popover)] text-[var(--color-popover-foreground)]',
        'border-[length:var(--surface-border-width)] border-[var(--color-border)]',
        '[backdrop-filter:var(--surface-backdrop)]',
        'shadow-md',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2',
        'data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        className
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

// =================================================================================================
// Exports
// =================================================================================================

export { Popover, PopoverAnchor, PopoverContent, PopoverTrigger };
