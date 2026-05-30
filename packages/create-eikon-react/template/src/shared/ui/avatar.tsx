/**
 * @file avatar.tsx
 * @description Token-driven avatar primitive built on
 * `@radix-ui/react-avatar` so the loading / fallback handshake
 * (image errored → AvatarFallback shows initials, image still loading
 * → fallback delays per `delayMs`) is taken care of for free.
 *
 * Surface tokens consumed: `--color-muted` (fallback bg),
 * `--color-muted-foreground` (initials text), `--radius-lg` for the
 * circular crop. Sized via Tailwind utility classes on the root —
 * default is `h-10 w-10`; consumers override with `size-12` etc.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import * as React from 'react';

// --- Third-party Libraries ---
import * as AvatarPrimitive from '@radix-ui/react-avatar';

// --- Absolute Imports ---
import { cn } from '@/shared/lib/cn';

// =================================================================================================
// Components
// =================================================================================================

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full',
      className
    )}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn('aspect-square h-full w-full object-cover', className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      'flex h-full w-full items-center justify-center rounded-full bg-[var(--color-muted)] text-[var(--color-muted-foreground)] text-sm font-medium',
      className
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

// =================================================================================================
// Exports
// =================================================================================================

export { Avatar, AvatarFallback, AvatarImage };
