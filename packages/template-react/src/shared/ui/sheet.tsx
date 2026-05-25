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
  readonly side: SheetSide;
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

interface SheetProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root> {
  /** Edge to anchor the panel against. Defaults to `left` (most common
   *  for primary-nav drawers on mobile). */
  readonly side?: SheetSide;
}

/**
 * Controlled-or-uncontrolled wrapper around Radix Dialog.Root, plus a
 * `side` prop that publishes the chosen edge to descendants via context
 * so `SheetContent` can pick the right slide axis without re-receiving
 * the prop down a long chain.
 */
function Sheet({
  open: openProp,
  defaultOpen,
  onOpenChange,
  side = 'left',
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

  const value = React.useMemo<SheetContextValue>(
    () => ({ open, side }),
    [open, side]
  );

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
    'fixed z-50 flex flex-col bg-[var(--color-card)] text-[var(--color-card-foreground)] shadow-xl ring-[length:var(--surface-ring-width)] ring-[var(--surface-ring-color)] [backdrop-filter:var(--surface-backdrop)]';
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

/**
 * Visually-hidden helper for screen-reader-only descriptions. Same set
 * of utilities shadcn / Radix examples use — inlined here rather than
 * depending on a Tailwind plugin so the primitive remains drop-in for
 * projects that don't ship `@tailwindcss/forms`.
 */
const SR_ONLY =
  'absolute h-px w-px overflow-hidden whitespace-nowrap border-0 p-0 [clip:rect(0_0_0_0)] [clip-path:inset(50%)]';

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  /**
   * Short prose describing the panel for screen readers. Honours
   * Radix's a11y contract — every `Dialog.Content` is supposed to carry
   * a description. Render flow:
   *
   *   - non-empty string → emitted as a visually-hidden
   *     `<DialogDescription>` child (Radix auto-wires `aria-describedby`).
   *   - `""` (empty string) → consumer explicitly opts out; the primitive
   *     forwards `aria-describedby={undefined}` to silence the dev warning,
   *     matching Radix's documented escape hatch.
   *   - omitted → consumer is expected to render their OWN
   *     `<SheetDescription>` somewhere inside the panel.
   */
  readonly description?: string;
}

/**
 * Sheet body. Same conditional-render strategy as `DialogContent` so the
 * portal subtree fully unmounts on close (no `forceMount` of the open
 * branch). `AnimatePresence` keeps the exit animation alive until the
 * spring settles before unmount.
 *
 * The `description` prop is the recommended path: pass a one-line
 * summary and the primitive renders an `sr-only` `<DialogDescription>`
 * — Radix wires `aria-describedby` itself via context. Pass
 * `description=""` if no description is appropriate; the primitive will
 * forward `aria-describedby={undefined}` so the dev-mode warning stays
 * silent. Other props are forwarded to Radix's `Dialog.Content`
 * unchanged.
 */
function SheetContent({
  className,
  children,
  description,
  ...props
}: SheetContentProps) {
  const { open, side } = useSheetContext();
  const reduceMotion = useReducedMotion();
  const overlayAnim = reduceMotion ? STATIC_MOTION : overlayMotion;
  const panelAnim = reduceMotion ? STATIC_MOTION : panelMotion(side);

  // When `description=""` the consumer is opting out — forward
  // `aria-describedby={undefined}` so Radix's dev warning stays quiet.
  // When `description` is undefined, leave aria-describedby alone:
  // either the consumer passed it directly (we forward as-is) or
  // they're rendering their own <SheetDescription> child (Radix
  // auto-wires it via context).
  const isOptOut = description === '';
  const contentProps =
    isOptOut && !('aria-describedby' in props)
      ? { ...props, 'aria-describedby': undefined }
      : props;

  return (
    <AnimatePresence>
      {open && (
        <DialogPrimitive.Portal forceMount>
          <DialogPrimitive.Overlay asChild forceMount>
            <motion.div
              {...overlayAnim}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            />
          </DialogPrimitive.Overlay>
          <DialogPrimitive.Content asChild forceMount {...contentProps}>
            <motion.div {...panelAnim} className={cn(panelClass(side), className)}>
              {/*
                Radix's <Dialog.Description> registers itself with the
                surrounding <Dialog.Content> through context — rendering
                it anywhere under Content is enough; the parent picks up
                the generated id and points its `aria-describedby` at it
                automatically. No manual wiring needed.
              */}
              {description !== undefined && description !== '' && (
                <DialogPrimitive.Description className={SR_ONLY}>
                  {description}
                </DialogPrimitive.Description>
              )}
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

function SheetBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex-1 overflow-y-auto px-3 py-5', className)}
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
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
};
