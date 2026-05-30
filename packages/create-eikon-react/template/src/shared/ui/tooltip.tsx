/**
 * @file tooltip.tsx
 * @description Token-driven tooltip built on `@radix-ui/react-tooltip`.
 * Inverted background (`--color-foreground` on `--color-background`) so
 * the tooltip reads as a "callout" rather than blending into the page.
 * Z-index is bound to `--z-tooltip` (the highest layer) so tooltips
 * stack above modals and popovers.
 *
 * Provider is exposed as a named export so consumers wrap their app
 * once at the root (the Radix pattern) and stage Tooltip subtrees freely.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import * as React from 'react';

// --- Third-party Libraries ---
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

// --- Absolute Imports ---
import { cn } from '@/shared/lib/cn';

// =================================================================================================
// Components
// =================================================================================================

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      'z-[var(--z-tooltip)] overflow-hidden rounded-md px-3 py-1.5 text-xs',
      'bg-[var(--color-foreground)] text-[var(--color-background)]',
      'shadow-md',
      'data-[state=delayed-open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0 data-[state=delayed-open]:fade-in-0',
      'data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1',
      'data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1',
      className
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

// =================================================================================================
// Exports
// =================================================================================================

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
