import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';

/** Keys the magic indicator is allowed to land on. */
export type TrackedKey = 'home' | 'changelog';

/**
 * The dark pill container that houses route navigation. Carries the
 * indicator span and one delegated pointerover handler that watches
 * `data-nav-key` to publish hover state — no per-link wiring needed.
 * Anything inside without a `data-nav-key` (e.g. a future utility
 * icon) reads as "no link hovered" and the indicator retreats to
 * the active link.
 *
 * Background / shadow / border are driven by `scrolled`: at the top
 * of the page the pill sits flat against the hero; once the user
 * scrolls past 8px we glass it (backdrop-blur + deeper shadow + a
 * slightly tighter outline) so it reads as floating chrome over
 * the scrolling content. The companion `LangOrb` mirrors this exact
 * surface so the two islands inhale and exhale on scroll together.
 */
export function NavPill({
  children,
  activeKey,
  scrolled,
  measureSignal,
}: {
  children: ReactNode;
  activeKey: TrackedKey | null;
  scrolled: boolean;
  /** Re-measure trigger — pass anything that changes link widths
   *  (e.g. current language). */
  measureSignal: unknown;
}) {
  const rowRef = useRef<HTMLElement>(null);
  const [hovered, setHovered] = useState<TrackedKey | null>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  // The indicator must not animate on its very first paint (it would
  // visibly slide in from `left: 0`). We flip this on after the first
  // measurement so subsequent moves get the spring transition.
  const [primed, setPrimed] = useState(false);

  const targetKey: TrackedKey | null = hovered ?? activeKey;

  const measure = useCallback(() => {
    const row = rowRef.current;
    if (!row || !targetKey) return;
    const el = row.querySelector(
      `[data-nav-key="${targetKey}"]`
    ) as HTMLElement | null;
    if (!el) return;
    const rowRect = row.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    setIndicator({
      left: elRect.left - rowRect.left,
      width: elRect.width,
    });
  }, [targetKey]);

  // First/sync measurement: runs synchronously after layout so the
  // indicator lands in the correct spot before the browser paints
  // (no flash from the previous position).
  useLayoutEffect(() => {
    measure();
    // Enable transitions starting on the *next* frame so the first
    // paint at the measured position is instant, not animated.
    const id =
      typeof window !== 'undefined'
        ? window.requestAnimationFrame(() => setPrimed(true))
        : 0;
    return () => {
      if (typeof window !== 'undefined' && id) window.cancelAnimationFrame(id);
    };
  }, [measure, measureSignal]);

  // Re-measure on resize — covers viewport resizes AND content
  // changes inside the links (e.g. a language switch changing
  // "更新日志" to "Changelog" which has a different width).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const row = rowRef.current;
    if (!row) return;
    const ro = new ResizeObserver(measure);
    ro.observe(row);
    row.querySelectorAll('[data-nav-key]').forEach((el) => ro.observe(el));
    return () => ro.disconnect();
  }, [measure]);

  // Pointer delegation: read `data-nav-key` from the closest ancestor
  // and publish it. Anything inside the rail without a key (the
  // divider, the language switcher) reads as "no link hovered" and
  // the indicator retreats to the active key.
  const onPointerOver = (e: ReactPointerEvent<HTMLElement>) => {
    const target = e.target as HTMLElement | null;
    const el = target?.closest?.('[data-nav-key]') as HTMLElement | null;
    const raw = el?.dataset.navKey;
    const next: TrackedKey | null =
      raw === 'home' || raw === 'changelog' ? raw : null;
    setHovered((prev) => (prev === next ? prev : next));
  };

  const isGhost = hovered !== null && hovered !== activeKey;
  const showIndicator = targetKey !== null && indicator.width > 0;

  const railClass =
    'eikon-nav-glass relative isolate inline-flex items-center gap-0 rounded-full border p-0.5 transition-[background-color,box-shadow,border-color] duration-300 ease-out sm:gap-0.5 sm:p-1 ' +
    (scrolled
      ? 'border-[var(--border-2)]/80 bg-[var(--surface-2)]/80 shadow-[inset_0_1px_0_rgb(255_255_255/0.06),0_8px_24px_rgb(0_0_0/0.28)]'
      : 'border-[var(--border-1)] bg-[var(--surface-2)] shadow-[inset_0_1px_0_rgb(255_255_255/0.04),0_2px_8px_rgb(0_0_0/0.08)]');

  return (
    <nav
      ref={rowRef}
      aria-label="Primary"
      className={railClass}
      onPointerOver={onPointerOver}
      onPointerLeave={() => setHovered(null)}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1 bottom-1 rounded-full"
        style={{
          left: 0,
          width: `${indicator.width}px`,
          transform: `translate3d(${indicator.left}px, 0, 0)`,
          opacity: showIndicator ? 1 : 0,
          background: isGhost
            ? 'hsla(0, 0%, 100%, 0.05)'
            : 'hsla(0, 0%, 100%, 0.085)',
          boxShadow: isGhost
            ? 'none'
            : 'inset 0 1px 0 hsla(0, 0%, 100%, 0.08)',
          // Spring-ish "macOS snap" curve for `transform` + `width`
          // (fast start, slow settle). Colour + opacity get a shorter
          // linear-ish ramp so the active/ghost crossfade reads as
          // crisp, not laggy.
          transition: primed
            ? 'transform 520ms cubic-bezier(0.32, 0.72, 0, 1), width 520ms cubic-bezier(0.32, 0.72, 0, 1), opacity 220ms ease-out, background-color 220ms ease-out, box-shadow 220ms ease-out'
            : 'opacity 220ms ease-out',
          willChange: 'transform, width',
        }}
      />
      {children}
    </nav>
  );
}
