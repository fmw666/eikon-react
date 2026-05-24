/**
 * @file dialog.tsx
 * @description Animated Dialog primitive that wraps @radix-ui/react-dialog
 * with motion/react enter/exit transitions.
 *
 * Key design choice: we do NOT use `forceMount` to keep the dialog
 * subtree alive forever — see the comment inside `DialogContent`.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import * as React from 'react';

// --- Third-party Libraries ---
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

// --- Absolute Imports ---
import { cn } from '@/shared/lib/cn';

// =================================================================================================
// Open-state context
// =================================================================================================

/**
 * Internal context that exposes the Radix Root's `open` state to descendant
 * components without re-reading it via DOM `data-state` queries. Required
 * because `DialogContent` needs to conditionally render its portal subtree
 * (we don't `forceMount` — see comment in DialogContent for why).
 */
interface DialogContextValue {
  readonly open: boolean;
}
const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialogOpen(): boolean {
  const ctx = React.useContext(DialogContext);
  if (!ctx) {
    throw new Error('Dialog subcomponents must be rendered inside <Dialog>.');
  }
  return ctx.open;
}

// =================================================================================================
// Root
// =================================================================================================

type DialogProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root>;

/**
 * Controlled-or-uncontrolled wrapper around Radix Dialog.Root. Mirrors the
 * Radix prop shape exactly (so existing call sites keep working), and
 * additionally publishes the resolved `open` value via context for our
 * `DialogContent` exit-animation logic.
 */
function Dialog({
  open: openProp,
  defaultOpen,
  onOpenChange,
  ...props
}: DialogProps) {
  const [openInternal, setOpenInternal] = React.useState(!!defaultOpen);
  const isControlled = openProp !== undefined;
  const open = isControlled ? !!openProp : openInternal;

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setOpenInternal(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange]
  );

  const value = React.useMemo<DialogContextValue>(() => ({ open }), [open]);

  return (
    <DialogContext.Provider value={value}>
      <DialogPrimitive.Root
        open={open}
        onOpenChange={handleOpenChange}
        {...props}
      />
    </DialogContext.Provider>
  );
}

const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

// =================================================================================================
// Motion presets
// =================================================================================================

const overlayMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.15 },
};

const contentMotion = {
  initial: { opacity: 0, scale: 0.96, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: 8 },
  transition: { type: 'spring' as const, stiffness: 340, damping: 28 },
};

/**
 * Reduced-motion fallback: present the dialog instantly with no animation.
 * AnimatePresence still controls mount/unmount, so users get the same
 * conditional-render semantics — just without the visual transition.
 */
const STATIC_MOTION = {
  initial: false as const,
  animate: { opacity: 1 },
  exit: { opacity: 1 },
  transition: { duration: 0 },
};

// =================================================================================================
// Content
// =================================================================================================

/**
 * Dialog body. Conditionally rendered based on the dialog's open state so
 * the portal subtree fully unmounts on close — this is the standard
 * Radix-with-Framer-Motion pattern.
 *
 * Why not `forceMount`: keeping a hidden subtree around indefinitely
 * costs DOM nodes, event listeners, and (for long-lived dialogs with
 * heavy content) the portal target's layout context — none of which we
 * want for a UI that's closed >99% of the time. AnimatePresence gives
 * us the exit animation without `forceMount`.
 */
function DialogContent({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>) {
  const open = useDialogOpen();
  const reduceMotion = useReducedMotion();
  const overlayAnim = reduceMotion ? STATIC_MOTION : overlayMotion;
  const contentAnim = reduceMotion ? STATIC_MOTION : contentMotion;

  return (
    <AnimatePresence>
      {open && (
        <DialogPrimitive.Portal forceMount>
          <DialogPrimitive.Overlay asChild forceMount>
            <motion.div
              {...overlayAnim}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />
          </DialogPrimitive.Overlay>
          <DialogPrimitive.Content asChild forceMount {...props}>
            <motion.div
              {...contentAnim}
              className={cn(
                'fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2',
                'rounded-lg border-[length:var(--surface-border-width)] border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-xl ring-[length:var(--surface-ring-width)] ring-[var(--surface-ring-color)] [backdrop-filter:var(--surface-backdrop)]',
                'text-[var(--color-card-foreground)]',
                className
              )}
            >
              {children}
              <DialogPrimitive.Close
                className="absolute right-3 top-3 rounded-md p-1 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </DialogPrimitive.Close>
            </motion.div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      )}
    </AnimatePresence>
  );
}

// =================================================================================================
// Structural helpers
// =================================================================================================

function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mb-4 flex flex-col gap-1.5', className)} {...props} />
  );
}

function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
        className
      )}
      {...props}
    />
  );
}

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      'text-lg font-semibold leading-none tracking-tight',
      className
    )}
    {...props}
  />
));
DialogTitle.displayName = 'DialogTitle';

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-[var(--color-muted-foreground)]', className)}
    {...props}
  />
));
DialogDescription.displayName = 'DialogDescription';

// =================================================================================================
// Exports
// =================================================================================================

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
