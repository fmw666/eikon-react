// @eikon:variant(layout=mobile-drawer) file
/**
 * @file sheet.tsx
 * @description Side-anchored slide-in panel ("drawer") built on top of
 * `@radix-ui/react-dialog` + `motion/react`. Used by the mobile-drawer
 * layout to surface the primary navigation behind a hamburger button —
 * desktop layouts and the other mobile layouts (bottom-tabs, centered)
 * never load this primitive, so the file is whole-stripped from any
 * scaffolded project whose chosen layout is not `mobile-drawer`.
 *
 * The first-line `@eikon:variant(layout=mobile-drawer) file` marker is
 * how strip-features.ts recognises this ownership; see
 * `packages/create-eikon-react/src/strip-features.ts` (search for
 * `VARIANT_FILE_MARKER_RE`).
 *
 * Why we don't reuse `dialog.tsx`: that primitive is centre-anchored
 * with a scale+fade transition tuned for modal forms (login, confirm).
 * A drawer needs an axis-aligned slide and a different shape (full-height
 * column flush to the edge), so giving it its own primitive keeps both
 * components' transitions clean rather than overloading `Dialog` with
 * a `side` prop and conditional motion.
 *
 * Zero new dependencies — `@radix-ui/react-dialog` and `motion` are
 * already in the template's deps list.
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
// Types
// =================================================================================================

type SheetSide = 'left' | 'right' | 'top' | 'bottom';

interface SheetContextValue {
  readonly open: boolean;
}
const SheetContext = React.createContext<SheetContextValue | null>(null);

function useSheetContext(): SheetContextValue {
  const ctx = React.useContext(SheetContext);
  if (!ctx) {
    throw new Error('Sheet subcomponents must be rendered inside <Sheet>.');
  }
  return ctx;
}

// =================================================================================================
// Root
// =================================================================================================

type SheetProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root>;

/**
 * Controlled-or-uncontrolled wrapper around Radix Dialog.Root that
 * publishes the current `open` state to descendants via context so
 * `SheetContent` can drive `AnimatePresence`'s conditional render.
 *
 * API matches shadcn / animate-ui's `<Sheet>` — the `side` prop lives
 * on `<SheetContent>` (not the root), and there's no `description`
 * prop anywhere; consumers render `<SheetDescription>` as a child for
 * a11y, and Radix wires `aria-describedby` automatically via context.
 */
function Sheet({
  open: openProp,
  defaultOpen,
  onOpenChange,
  ...props
}: SheetProps) {
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

  const value = React.useMemo<SheetContextValue>(() => ({ open }), [open]);

  return (
    <SheetContext.Provider value={value}>
      <DialogPrimitive.Root
        open={open}
        onOpenChange={handleOpenChange}
        {...props}
      />
    </SheetContext.Provider>
  );
}

const SheetTrigger = DialogPrimitive.Trigger;
const SheetPortal = DialogPrimitive.Portal;
const SheetClose = DialogPrimitive.Close;

// =================================================================================================
// Motion presets
// =================================================================================================

/**
 * Direction-keyed slide offsets. Using viewport units (`100vw`/`100vh`)
 * means the panel always starts fully off-screen regardless of its own
 * rendered size — important when the panel content height changes
 * between renders (e.g. nav items collapse).
 */
const SLIDE_OFFSETS: Record<SheetSide, { x?: string; y?: string }> = {
  left: { x: '-100%' },
  right: { x: '100%' },
  top: { y: '-100%' },
  bottom: { y: '100%' },
};

const overlayMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.15 },
};

function panelMotion(side: SheetSide) {
  const off = SLIDE_OFFSETS[side];
  return {
    initial: { ...off, opacity: 0.95 },
    animate: { x: 0, y: 0, opacity: 1 },
    exit: { ...off, opacity: 0.95 },
    transition: { type: 'spring' as const, stiffness: 360, damping: 32 },
  };
}

const STATIC_MOTION = {
  initial: false as const,
  animate: { opacity: 1 },
  exit: { opacity: 1 },
  transition: { duration: 0 },
};

// =================================================================================================
// Side-keyed positioning
// =================================================================================================

/**
 * Tailwind class fragment that anchors the panel to the chosen edge.
 * Width / height are kept generous on small screens (capped on larger
 * ones via `max-w-*`) so the drawer behaves like a real mobile sheet
 * regardless of viewport. Safe-area insets are applied so the panel
 * doesn't clip under iOS notches / Android navigation gestures.
 */
function panelClass(side: SheetSide): string {
  const base =
    'fixed z-[var(--z-modal)] flex flex-col bg-[var(--color-card)] text-[var(--color-card-foreground)] shadow-xl ring-[length:var(--surface-ring-width)] ring-[var(--surface-ring-color)] [backdrop-filter:var(--surface-backdrop)]';
  switch (side) {
    case 'left':
      return cn(
        base,
        'inset-y-0 left-0 h-full w-[86vw] max-w-[20rem]',
        'border-r-[length:var(--surface-border-width)] border-[var(--color-border)]',
        'pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]'
      );
    case 'right':
      return cn(
        base,
        'inset-y-0 right-0 h-full w-[86vw] max-w-[20rem]',
        'border-l-[length:var(--surface-border-width)] border-[var(--color-border)]',
        'pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pr-[env(safe-area-inset-right)]'
      );
    case 'top':
      return cn(
        base,
        'inset-x-0 top-0 max-h-[80vh]',
        'border-b-[length:var(--surface-border-width)] border-[var(--color-border)]',
        'pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]'
      );
    case 'bottom':
      return cn(
        base,
        'inset-x-0 bottom-0 max-h-[80vh]',
        'border-t-[length:var(--surface-border-width)] border-[var(--color-border)]',
        'pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]'
      );
  }
}

// =================================================================================================
// Content
// =================================================================================================

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  /** Edge to anchor the panel against. Defaults to `right` to match
   *  shadcn / animate-ui's `<SheetContent>` API. */
  readonly side?: SheetSide;
}

/**
 * Sheet body. Same conditional-render strategy as `DialogContent` so the
 * portal subtree fully unmounts on close (no `forceMount` of the open
 * branch). `AnimatePresence` keeps the exit animation alive until the
 * spring settles before unmount.
 *
 * For accessibility, render a `<SheetDescription>` child somewhere
 * inside the panel — Radix's Dialog primitive auto-wires
 * `aria-describedby` via context, no manual hook-up needed. If a
 * description is intentionally absent, pass `aria-describedby={undefined}`
 * to silence Radix's dev warning (the documented escape hatch).
 */
function SheetContent({
  className,
  children,
  side = 'right',
  ...props
}: SheetContentProps) {
  const { open } = useSheetContext();
  const reduceMotion = useReducedMotion();
  const overlayAnim = reduceMotion ? STATIC_MOTION : overlayMotion;
  const panelAnim = reduceMotion ? STATIC_MOTION : panelMotion(side);

  return (
    <AnimatePresence>
      {open && (
        <DialogPrimitive.Portal forceMount>
          <DialogPrimitive.Overlay asChild forceMount>
            <motion.div
              {...overlayAnim}
              className="fixed inset-0 z-[var(--z-overlay)] bg-[var(--color-overlay)] backdrop-blur-sm"
            />
          </DialogPrimitive.Overlay>
          <DialogPrimitive.Content asChild forceMount {...props}>
            <motion.div {...panelAnim} className={cn(panelClass(side), className)}>
              {children}
              <DialogPrimitive.Close
                className="absolute right-3 top-3.5 inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-muted-foreground)] opacity-70 transition-[opacity,background-color,color] hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)] hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
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

function SheetHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 border-b border-[var(--color-border)] px-5 py-6 pr-16',
        className
      )}
      {...props}
    />
  );
}

function SheetFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 border-t border-[var(--color-border)] px-3 py-3',
        className
      )}
      {...props}
    />
  );
}

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-xl font-semibold tracking-tight', className)}
    {...props}
  />
));
SheetTitle.displayName = 'SheetTitle';

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-[var(--color-muted-foreground)]', className)}
    {...props}
  />
));
SheetDescription.displayName = 'SheetDescription';

// =================================================================================================
// Exports
// =================================================================================================

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
};
