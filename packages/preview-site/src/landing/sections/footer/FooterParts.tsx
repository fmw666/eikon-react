/**
 * @file FooterParts.tsx
 * @description Internal presentational sub-components for {@link Footer}.
 *
 * These are the small, stateless building blocks of the footer's
 * "tool half": column labels, nav links, contact pills, the back-to-top
 * control, and the microcopy separator. They are split out of Footer.tsx
 * purely to keep the main file focused on layout + the spotlight wiring.
 *
 * INTERNAL: not re-exported from the footer index barrel. Only Footer.tsx
 * consumes these.
 */

import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react';

import { navigate } from '../../nav/route';

import { HERO_TOP_ID } from './constants';
import { ArrowRight, ArrowUp } from './icons';

/**
 * Section label used above each column. Same eyebrow treatment as the
 * QA section's "SUPPORT" mark — small accent dot + uppercase tracked
 * text — so the two sections feel cut from the same cloth.
 */
export function ColumnLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className="inline-block h-1 w-1 rounded-full bg-brand-500 shadow-[0_0_8px_var(--accent-glow)]"
      />
      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--fg-3)]">
        {children}
      </p>
    </div>
  );
}

/**
 * In-page nav link with a sliding arrow indicator. The arrow lives
 * inline at the right of the label, fades + slides in by 4px when the
 * link is hovered/focused — gives the row a clear "this is clickable"
 * affordance without a heavy chrome.
 *
 * We render real `<a href>` anchors and only intercept *plain*
 * left-clicks (no modifiers) so cmd / ctrl / middle-click open in a
 * new tab via the browser's native handler. SEO + right-click copy-
 * link also still work.
 */
export function FooterNavLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  function onClick(e: ReactMouseEvent<HTMLAnchorElement>) {
    if (
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey
    ) {
      return;
    }
    e.preventDefault();
    navigate(href);
  }
  return (
    <li>
      <a
        href={href}
        onClick={onClick}
        className="group/lk inline-flex items-center gap-2 text-sm text-[var(--fg-3)] no-underline transition-colors duration-200 hover:text-[var(--fg-1)] focus-visible:text-[var(--fg-1)] focus-visible:outline-none"
      >
        <span>{children}</span>
        <span
          aria-hidden="true"
          className="inline-block translate-x-0 text-[var(--fg-4)] opacity-0 transition-all duration-200 ease-out group-hover/lk:translate-x-1 group-hover/lk:opacity-100 group-focus-visible/lk:translate-x-1 group-focus-visible/lk:opacity-100"
        >
          →
        </span>
      </a>
    </li>
  );
}

/**
 * Contact pill — same ceramic-surface treatment as QASection's
 * ContactPanel button (gradient body + inset top highlight + tight
 * close shadow + arrow well). Compact size so the column doesn't
 * overpower the brand block on the left.
 *
 * The arrow well slides 2px right and the whole pill lifts 1px on
 * hover. Mirrors the QASection's contact CTA so the two surfaces
 * read as the same control type at different scales.
 */
export function ChannelPill({
  href,
  icon,
  label,
  external,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  external?: boolean;
}) {
  const externalProps = external
    ? { target: '_blank' as const, rel: 'noreferrer' }
    : {};
  return (
    <a
      href={href}
      {...externalProps}
      className="
        group/pill inline-flex max-w-full items-center gap-2.5
        rounded-full border border-[var(--border-1)]
        bg-gradient-to-b from-[var(--surface-2)] to-[var(--surface-1)]
        py-1 pl-3 pr-1
        shadow-[inset_0_1px_0_rgb(255_255_255/0.06),0_1px_2px_rgb(0_0_0/0.35),0_4px_10px_rgb(0_0_0/0.06)]
        transition-all duration-200 ease-out
        hover:-translate-y-px
        hover:border-[var(--border-2)]
        hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_2px_4px_rgb(0_0_0/0.4),0_8px_18px_rgb(0_0_0/0.12)]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/40
      "
    >
      <span className="text-[var(--fg-2)] transition-colors group-hover/pill:text-[var(--fg-1)]">
        {icon}
      </span>
      <span className="truncate font-mono text-[12px] text-[var(--fg-2)] transition-colors group-hover/pill:text-[var(--fg-1)]">
        {label}
      </span>
      <span
        aria-hidden="true"
        className="
          inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full
          bg-[var(--surface-0)] text-[var(--fg-2)]
          shadow-[inset_0_1px_0_rgb(255_255_255/0.04),inset_0_-1px_0_rgb(0_0_0/0.35)]
          transition-transform duration-200 ease-out
          group-hover/pill:translate-x-0.5 group-hover/pill:text-[var(--fg-1)]
        "
      >
        <ArrowRight />
      </span>
    </a>
  );
}

/**
 * Back-to-top control. Compact pill on the right side of the
 * microcopy row. The arrow lifts 2px on hover; the pill itself
 * lifts 1px and gains a tighter shadow. Click smooth-scrolls the
 * document to the top.
 */
export function BackToTopButton({
  label,
  onClick,
}: {
  label: string;
  onClick: (e: ReactMouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <a
      href={`#${HERO_TOP_ID}`}
      onClick={onClick}
      className="
        group/top inline-flex w-fit items-center gap-2
        rounded-full border border-[var(--border-1)]
        bg-gradient-to-b from-[var(--surface-2)] to-[var(--surface-1)]
        py-1 pl-1 pr-3.5
        shadow-[inset_0_1px_0_rgb(255_255_255/0.06),0_1px_2px_rgb(0_0_0/0.35)]
        transition-all duration-200 ease-out
        hover:-translate-y-px
        hover:border-[var(--border-2)]
        hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_2px_4px_rgb(0_0_0/0.4),0_8px_18px_rgb(0_0_0/0.12)]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/40
      "
    >
      <span
        aria-hidden="true"
        className="
          inline-flex h-6 w-6 items-center justify-center rounded-full
          bg-[var(--surface-0)] text-[var(--fg-1)]
          shadow-[inset_0_1px_0_rgb(255_255_255/0.04),inset_0_-1px_0_rgb(0_0_0/0.35)]
          transition-transform duration-200 ease-out
          group-hover/top:-translate-y-0.5
        "
      >
        <ArrowUp />
      </span>
      <span className="text-[12px] font-medium tracking-tight text-[var(--fg-2)] transition-colors group-hover/top:text-[var(--fg-1)]">
        {label}
      </span>
    </a>
  );
}

export function Separator() {
  return (
    <span aria-hidden="true" className="text-[var(--border-2)]">
      /
    </span>
  );
}
