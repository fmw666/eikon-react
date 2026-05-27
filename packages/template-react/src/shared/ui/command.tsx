/**
 * @file command.tsx
 * @description Command-palette primitive built on top of `cmdk`.
 *
 * The only consumer in the unstripped template is the examples
 * showcase, which ships unconditionally in scaffolded projects (the
 * runtime `import.meta.env.DEV` gate in `app/router.tsx` keeps it out
 * of production bundles). End users that want a command palette in
 * their own pages can re-use this primitive; see
 * `.agent/skills/add-modal/SKILL.md` for the patterns.
 *
 * Public surface mirrors the shadcn/ui shape so existing patterns
 * carry over:
 *
 *   - `<Command>`              — root (filterable list, keyboard nav)
 *   - `<CommandDialog>`        — root wrapped in our animated Dialog
 *   - `<CommandInput>`         — search input bound to the root
 *   - `<CommandList>`          — scrollable result region
 *   - `<CommandEmpty>`         — empty-state when nothing matches
 *   - `<CommandGroup>`         — labelled group of items
 *   - `<CommandItem>`          — single selectable row
 *   - `<CommandSeparator>`     — visual divider between groups
 *   - `<CommandShortcut>`      — small right-aligned hint pill
 *
 * Theming uses the same `--color-*` CSS vars as the rest of the kit
 * so the palette inherits the active scheme automatically.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import * as React from 'react';

// --- Third-party Libraries ---
import { Command as CommandPrimitive } from 'cmdk';
import { Search } from 'lucide-react';

// --- Absolute Imports ---
import { cn } from '@/shared/lib/cn';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/shared/ui/dialog';

// =================================================================================================
// Root
// =================================================================================================

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      'flex h-full w-full flex-col overflow-hidden rounded-md',
      'bg-[var(--color-popover,var(--color-card))] text-[var(--color-popover-foreground,var(--color-card-foreground))]',
      className
    )}
    {...props}
  />
));
Command.displayName = 'Command';

// =================================================================================================
// Dialog wrapper
// =================================================================================================

interface CommandDialogProps
  extends React.ComponentPropsWithoutRef<typeof Dialog> {
  /**
   * Accessible label for the palette dialog. Defaults to "Command
   * Palette" — override per-feature so screen readers announce the
   * specific surface (e.g. "Quick switcher", "Action menu").
   */
  readonly title?: string;
  /** Short hint surfaced as the dialog's accessible description. */
  readonly description?: string;
  readonly children?: React.ReactNode;
}

/**
 * Common shorthand: a palette mounted inside our shared animated
 * Dialog. The visible title/description are hidden but kept in the
 * a11y tree because Radix Dialog requires them for the dialog role
 * semantics (warns in dev when missing).
 */
function CommandDialog({
  title = 'Command Palette',
  description = 'Search for a command to run',
  children,
  ...props
}: CommandDialogProps) {
  return (
    <Dialog {...props}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-lg">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">{description}</DialogDescription>
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-[var(--color-muted-foreground)] [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-item]]:px-2 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  );
}

// =================================================================================================
// Subcomponents
// =================================================================================================

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <div
    className="flex items-center border-b border-[var(--color-border)] px-3"
    // eslint-disable-next-line react/no-unknown-property
    cmdk-input-wrapper=""
  >
    <Search
      aria-hidden="true"
      className="mr-2 h-4 w-4 shrink-0 text-[var(--color-muted-foreground)] opacity-70"
    />
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none',
        'placeholder:text-[var(--color-muted-foreground)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  </div>
));
CommandInput.displayName = 'CommandInput';

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn(
      'max-h-[320px] overflow-y-auto overflow-x-hidden',
      className
    )}
    {...props}
  />
));
CommandList.displayName = 'CommandList';

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className={cn(
      'py-6 text-center text-sm text-[var(--color-muted-foreground)]',
      className
    )}
    {...props}
  />
));
CommandEmpty.displayName = 'CommandEmpty';

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      'overflow-hidden p-1 text-[var(--color-foreground)]',
      '[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-[var(--color-muted-foreground)]',
      className
    )}
    {...props}
  />
));
CommandGroup.displayName = 'CommandGroup';

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none',
      'data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50',
      'data-[selected=true]:bg-[var(--color-accent)] data-[selected=true]:text-[var(--color-accent-foreground)]',
      '[&_svg]:size-4 [&_svg]:shrink-0',
      className
    )}
    {...props}
  />
));
CommandItem.displayName = 'CommandItem';

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={cn(
      '-mx-1 my-1 h-px bg-[var(--color-border)]',
      className
    )}
    {...props}
  />
));
CommandSeparator.displayName = 'CommandSeparator';

/**
 * Right-aligned shortcut pill. Pure decoration — does NOT register a
 * keybinding by itself; the consumer is responsible for wiring the
 * matching `keydown` handler.
 */
function CommandShortcut({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'ml-auto inline-flex items-center gap-1 rounded border border-[var(--color-border)] bg-[var(--color-muted)]/40 px-1.5 py-0.5',
        'text-[10px] font-medium tracking-wide text-[var(--color-muted-foreground)]',
        className
      )}
      {...props}
    />
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
};
export type { CommandDialogProps };
