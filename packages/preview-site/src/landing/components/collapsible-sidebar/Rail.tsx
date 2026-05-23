import type { SidebarController } from '../../hooks/useSidebarMode';
import { ChevronRightIcon } from './icons';

/* ============================================================
 * RAIL — slim 32px collapsed indicator with a single expand
 * affordance. Hover anywhere opens peek; click pins.
 * ============================================================ */

interface RailProps {
  controller: SidebarController;
  railClassName: string;
}

export function Rail({ controller, railClassName }: RailProps) {
  const { triggerProps, openPeekNow, isPeeking } = controller;

  return (
    <div
      {...triggerProps}
      data-active={isPeeking || undefined}
      onClick={openPeekNow}
      className={`eikon-rail-slim relative flex h-full w-full cursor-pointer flex-col items-center justify-center ${railClassName}`}
    >
      {/* Centered expand chevron */}
      <span className="eikon-rail-chevron flex h-7 w-7 items-center justify-center rounded-md text-[var(--fg-3)]">
        <ChevronRightIcon className="h-4 w-4" />
      </span>

      {/* Right-edge accent line */}
      <span
        aria-hidden="true"
        className="eikon-rail-edge absolute right-0 top-[20%] bottom-[20%] w-[1.5px]"
      />
    </div>
  );
}
