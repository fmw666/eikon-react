import * as TabsPrimitive from '@radix-ui/react-tabs';
import { motion } from 'motion/react';
import * as React from 'react';

import { cn } from '@/shared/lib/cn';

export const Tabs = TabsPrimitive.Root;

export const TabsList = React.forwardRef<
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

interface TabsTriggerProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  layoutId?: string;
}

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, children, layoutId = 'tabs-active-indicator', ...props }, ref) => (
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
));
TabsTrigger.displayName = 'TabsTrigger';

function Indicator({ layoutId }: { layoutId: string }) {
  // Render a layoutId-shared motion box that animates between active triggers.
  // We render it conditionally via data-state of the parent in CSS:
  // It's still safe to render always; framer-motion will pick the active one
  // based on data-state via aria.
  return (
    <motion.span
      layoutId={layoutId}
      className="absolute inset-0 rounded-sm bg-[var(--color-background)] shadow-sm data-[inactive=true]:hidden"
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      aria-hidden
      data-inactive
    />
  );
}

export const TabsContent = React.forwardRef<
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
