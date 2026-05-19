/**
 * @file tabs.tsx
 * @description Animated Tabs primitive built on @radix-ui/react-tabs +
 * motion/react shared-layout indicator.
 *
 * The active indicator uses `layoutId` so it cross-fades / slides
 * between triggers; under prefers-reduced-motion the layoutId is
 * dropped to disable the morph entirely.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import * as React from 'react';

// --- Third-party Libraries ---
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { motion, useReducedMotion } from 'motion/react';

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

interface TabsTriggerProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  layoutId?: string;
}

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(
  (
    { className, children, layoutId = 'tabs-active-indicator', ...props },
    ref
  ) => (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        'relative inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1 text-sm font-medium transition-colors',
        'data-[state=active]:text-[var(--color-foreground)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
        'disabled:pointer-events-none disabled:opacity-50',
        className
      )}
      {...props}
    >
      <Indicator layoutId={layoutId} />
      <span className="relative z-10">{children}</span>
    </TabsPrimitive.Trigger>
  )
);
TabsTrigger.displayName = 'TabsTrigger';

function Indicator({ layoutId }: { layoutId: string }) {
  // Shared layoutId animates the indicator between active triggers.
  // When the user prefers reduced motion we drop the layoutId so each
  // trigger gets a static positioned indicator (visually correct,
  // no cross-fade / slide between tabs).
  const reduceMotion = useReducedMotion();
  return (
    <motion.span
      layoutId={reduceMotion ? undefined : layoutId}
      className="absolute inset-0 rounded-sm bg-[var(--color-background)] shadow-sm data-[inactive=true]:hidden"
      transition={
        reduceMotion
          ? { duration: 0 }
          : { type: 'spring', stiffness: 380, damping: 30 }
      }
      aria-hidden
      data-inactive
    />
  );
}

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
export type { TabsTriggerProps };
