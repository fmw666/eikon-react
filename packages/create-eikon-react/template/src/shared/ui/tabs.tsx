/**
 * @file tabs.tsx
 * @description Tabs primitive built on @radix-ui/react-tabs.
 *
 * The active trigger gets a static positioned indicator (no shared
 * layout / cross-fade morph). This shape matches what shadcn and
 * animate-ui ship out of the box, so swapping these custom files for
 * a snapshot at scaffold time is a drop-in replacement — no
 * project-specific API surface to reconcile.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import * as React from 'react';

// --- Third-party Libraries ---
import * as TabsPrimitive from '@radix-ui/react-tabs';

// --- Absolute Imports ---
import { cn } from '@/shared/lib/cn';

// =================================================================================================
// Root
// =================================================================================================

const Tabs = TabsPrimitive.Root;

// =================================================================================================
// List
// =================================================================================================

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex h-9 items-center justify-center rounded-md bg-[var(--color-muted)] p-1 text-[var(--color-muted-foreground)]',
      className
    )}
    {...props}
  />
));
TabsList.displayName = 'TabsList';

// =================================================================================================
// Trigger
// =================================================================================================

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1 text-sm font-medium transition-colors',
      'data-[state=active]:bg-[var(--color-background)] data-[state=active]:text-[var(--color-foreground)] data-[state=active]:shadow-sm',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
      'disabled:pointer-events-none disabled:opacity-50',
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = 'TabsTrigger';

// =================================================================================================
// Content
// =================================================================================================

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
      className
    )}
    {...props}
  />
));
TabsContent.displayName = 'TabsContent';

// =================================================================================================
// Exports
// =================================================================================================

export { Tabs, TabsContent, TabsList, TabsTrigger };
