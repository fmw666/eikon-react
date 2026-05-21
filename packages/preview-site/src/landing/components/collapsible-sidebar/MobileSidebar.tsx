import { useState } from 'react';

import type { SidebarSectionSpec } from './types';
import { ChevronRightIcon } from './icons';

/* ============================================================
 * MOBILE ACCORDION — disclosure-style list shown below `lg`.
 *
 * Implementation notes
 *
 *   We use `<details>` for free a11y semantics (Tab focus,
 *   Enter/Space toggle, `open` attribute reflected to AT, no JS
 *   required to navigate). The chevron and "currently open"
 *   styling are then driven by `[open]` CSS selectors.
 *
 *   We control `open` via React state instead of leaving the
 *   `<details>` element to manage its own — this lets us animate
 *   the chevron and surface the open/closed state in the parent
 *   if we ever add an "expand all / collapse all" affordance.
 *   It also means we can default-open exactly the sections we
 *   want without depending on attribute order shenanigans.
 * ============================================================ */

export function MobileSidebarAccordion({
  ariaLabel,
  sections,
}: {
  ariaLabel: string;
  sections: SidebarSectionSpec[];
}) {
  // Default-open: callers pick via `mobileDefaultOpen`. If a
  // section omits the field we fall back to "open iff `fill`",
  // because `fill` already encodes "this is the section that
  // wants vertical breathing room" and we should match that with
  // visibility. This avoids the surprising case where, say, the
  // heavy Params section opens by default just because it
  // happens to be at index 0 in the home-page workbench.
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(() => {
    const initial = new Set<string>();
    sections.forEach((section) => {
      const open =
        section.mobileDefaultOpen ?? Boolean(section.fill);
      if (open) initial.add(section.id);
    });
    return initial;
  });

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <nav
      aria-label={ariaLabel}
      className="flex w-full min-w-0 flex-col gap-3"
    >
      {sections.map((section) => (
        <MobileAccordionSection
          key={section.id}
          section={section}
          open={openIds.has(section.id)}
          onToggle={() => toggle(section.id)}
        />
      ))}
    </nav>
  );
}

function MobileAccordionSection({
  section,
  open,
  onToggle,
}: {
  section: SidebarSectionSpec;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <section
      id={section.anchorId ?? section.id}
      aria-label={section.title}
      className="rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)]/60"
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`${section.id}-mobile-body`}
        // 48px tall hit target so each section header satisfies
        // WCAG 2.2 AA's 24px floor with margin to spare and feels
        // tappable in landscape one-handed use.
        className="flex w-full min-h-[48px] items-center justify-between gap-2 rounded-xl px-4 py-3 text-left transition-colors active:bg-[var(--surface-2)]/60"
      >
        <span className="flex min-w-0 items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--fg-2)]">
          <span className="text-[var(--fg-4)]">{section.icon}</span>
          <span className="truncate">{section.title}</span>
        </span>
        <ChevronRightIcon
          className={
            'h-4 w-4 shrink-0 text-[var(--fg-4)] transition-transform duration-200 ease-out ' +
            (open ? 'rotate-90' : 'rotate-0')
          }
        />
      </button>
      {open && (
        <div
          id={`${section.id}-mobile-body`}
          // Body sits inside the same rounded card. Top border
          // gives a visual seam between header and body without
          // adding chrome that competes with the workbench card
          // that contains us.
          className="border-t border-[var(--border-1)]/60 px-4 py-4"
        >
          {section.children}
        </div>
      )}
    </section>
  );
}

export function SidebarSection({ section }: { section: SidebarSectionSpec }) {
  return (
    <section
      id={section.anchorId ?? section.id}
      className={'flex min-h-0 flex-col gap-2 ' + (section.fill ? 'flex-1' : '')}
      aria-label={section.title}
    >
      <h3 className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--fg-3)]">
        <span className="text-[var(--fg-4)]">{section.icon}</span>
        <span>{section.title}</span>
      </h3>
      <div className={'min-h-0 ' + (section.fill ? 'flex flex-1 flex-col' : '')}>
        {section.children}
      </div>
    </section>
  );
}
