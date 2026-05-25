/**
 * @file Footer.tsx
 * @description Editorial-grade closing strip for the landing page.
 *
 * Layout (sm+):
 *
 *   ┌──────────────────────────────────────────────────────────────────┐
 *   │ ── animated shine hairline ────────────────────────────────────  │
 *   │                                                                  │
 *   │   ┌── Brand ──────────┐  ┌── Explore ──┐  ┌── Connect ────────┐  │
 *   │   │ [avatar] fmw      │  │ → Home      │  │ → email           │  │
 *   │   │ tagline           │  │ → Playground│  │ → github          │  │
 *   │   │ hint message      │  │ → Changelog │  │                   │  │
 *   │   └───────────────────┘  └─────────────┘  └───────────────────┘  │
 *   │                                                                  │
 *   │           E I K O N · R E A C T          ← decorative wordmark   │
 *   │                                                                  │
 *   │   ──────────────────────────────────────────────────────────     │
 *   │   ● Online · © 2026 Eikon-React · v0.1.0           ↑ Back to top │
 *   └──────────────────────────────────────────────────────────────────┘
 *
 * Design pass — what makes this feel crafted, not stock:
 *
 *   1. Animated shine hairline at the top — a brand-coloured highlight
 *      sweeps left-to-right every ~7s. The footer never reads as a
 *      "dead bar" pinned to the bottom; it has a soft pulse.
 *
 *   2. Mouse-follow spotlight — a radial accent-glow halo tracks the
 *      cursor across the footer surface. Subtle (uses `--accent-glow`
 *      so it scales with theme alpha), but rewards a visitor who
 *      pauses to read the last block.
 *
 *   3. Faint grid backdrop — the same 48px line grid pattern used in
 *      the Hero, masked with a bottom-anchored radial so it only
 *      registers around the wordmark. Anchors the footer to the
 *      broader site visual language without painting it any colour.
 *
 *   4. Oversized decorative wordmark — the brand name printed huge,
 *      vertically masked into transparency at its lower edge so it
 *      bleeds off the page. Acts as a "stamp" — gives the footer
 *      typographic weight. Hover over the footer lifts its opacity
 *      from 0.10 to 0.18 (a quiet reward for lingering).
 *
 *   5. Channel pills — same ceramic surface treatment as the QA
 *      section's Contact button (gradient body + inset highlight +
 *      tight shadow + arrow well). Hover lifts the pill 1px and
 *      slides the arrow 2px right.
 *
 *   6. Pulsing live dot — a 6px brand-coloured dot with an outer
 *      ring that scales + fades every 2.4s. Reads as "site is
 *      humming" without resorting to a hospital-green status pixel.
 *
 *   7. Back-to-top control — a small pill with an up-arrow that
 *      lifts on hover; click smooth-scrolls the document to the top.
 *      Bottom-right anchor balances the live-status row on the left.
 *
 * The footer holds the same "tool half / story half" rhythm as the
 * rest of the page: the brand + nav + contacts are utilitarian, the
 * giant wordmark + shine is the editorial close.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';

import { navigate } from '../../nav/route';
import { isGithubConfigured, SITE } from '../../site-config';
import { useI18n } from '../../theme/i18n';

import { HERO_TOP_ID, MEADOW_ANCHOR_ID } from './constants';
import { HuntCard } from './HuntCard';
import { ArrowRight, ArrowUp, GithubIcon, MailIcon } from './icons';
import { Meadow } from './Meadow';

export function Footer() {
  const { t } = useI18n();
  const containerRef = useRef<HTMLElement | null>(null);
  const spotlightRef = useRef<HTMLDivElement | null>(null);
  const [footerLit, setFooterLit] = useState(false);
  const [gyroActive, setGyroActive] = useState(false);
  const handleLitChange = useCallback((lit: boolean) => setFooterLit(lit), []);
  // Brand wordmark derived from site config: split on the hyphen so
  // forks that rename the project (e.g. "Acme · Stack") still get
  // a clean two-token mark with a centred dot separator.
  const brandTokens = SITE.brandName
    .split(/[-·]/g)
    .map((token) => token.trim().toUpperCase())
    .filter(Boolean);

  // Meadow ref — the hidden grass strip that grows under the wordmark
  // wherever the spotlight passes over it. We need its own ref because
  // the meadow is much smaller than the footer, so a footer-relative
  // percentage cannot drive its mask correctly. Instead we write
  // meadow-local pixel coordinates into a second pair of CSS vars.
  const meadowRef = useRef<HTMLDivElement | null>(null);

  // Mouse-follow spotlight — GPU composite-only via transform.
  //
  // The spotlight is a fixed-size div with a static radial gradient
  // centred on itself. We move it with translate3d so the browser
  // only composites (no gradient recalculation, no repaint).
  //
  // Gated on `pointer: fine` — touch devices skip the effect entirely.
  //
  // The same handler drives the meadow easter-egg masks via CSS vars
  // on the meadow element (small area, acceptable repaint cost).
  useEffect(() => {
    const el = containerRef.current;
    const spot = spotlightRef.current;
    if (!el || !spot) return;
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function' ||
      !window.matchMedia('(pointer: fine)').matches
    ) {
      return;
    }
    let rect: DOMRect | null = null;
    let meadowRect: DOMRect | null = null;
    let rafId = 0;
    let scrollRafId = 0;
    let lastX = 0;
    let lastY = 0;

    const SPOT_HALF = 360;

    const updateRects = () => {
      rect = el.getBoundingClientRect();
      const meadowEl = meadowRef.current;
      if (meadowEl) meadowRect = meadowEl.getBoundingClientRect();
    };
    updateRects();
    spot.style.transform = `translate3d(${(rect!.width / 2) - SPOT_HALF}px,${(rect!.height / 2) - SPOT_HALF}px,0)`;

    const handleMove = (e: PointerEvent) => {
      lastX = e.clientX;
      lastY = e.clientY;
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        if (!rect) return;
        const localX = lastX - rect.left;
        const localY = lastY - rect.top;
        spot.style.transform = `translate3d(${localX - SPOT_HALF}px,${localY - SPOT_HALF}px,0)`;

        if (meadowRect) {
          const meadowEl = meadowRef.current;
          if (meadowEl) {
            meadowEl.style.setProperty(
              '--eikon-meadow-mx',
              `${lastX - meadowRect.left}px`,
            );
            meadowEl.style.setProperty(
              '--eikon-meadow-my',
              `${lastY - meadowRect.top}px`,
            );
          }
        }
      });
    };
    const handleLeave = () => {
      if (!rect) return;
      spot.style.transform = `translate3d(${rect.width / 2 - SPOT_HALF}px,${rect.height / 2 - SPOT_HALF}px,0)`;
      const meadowEl = meadowRef.current;
      if (meadowEl) {
        meadowEl.style.setProperty('--eikon-meadow-mx', '-9999px');
        meadowEl.style.setProperty('--eikon-meadow-my', '-9999px');
      }
    };

    const handleEnter = () => {
      updateRects();
    };

    const handleScroll = () => {
      if (scrollRafId) return;
      scrollRafId = requestAnimationFrame(() => {
        scrollRafId = 0;
        updateRects();
      });
    };

    el.addEventListener('pointermove', handleMove);
    el.addEventListener('pointerenter', handleEnter);
    el.addEventListener('pointerleave', handleLeave);
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', updateRects);
    return () => {
      el.removeEventListener('pointermove', handleMove);
      el.removeEventListener('pointerenter', handleEnter);
      el.removeEventListener('pointerleave', handleLeave);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateRects);
      if (rafId) cancelAnimationFrame(rafId);
      if (scrollRafId) cancelAnimationFrame(scrollRafId);
    };
  }, []);

  // Gyroscope-driven spotlight for mobile (touch) devices.
  // Maps device tilt to spotlight position, giving the same flashlight
  // reveal as the desktop pointer-follow but driven by physical motion.
  useEffect(() => {
    const el = containerRef.current;
    const spot = spotlightRef.current;
    if (!el || !spot) return;
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function' ||
      window.matchMedia('(pointer: fine)').matches
    ) {
      return;
    }

    const SPOT_HALF = 360;
    let rafId = 0;
    let smoothX = 0.5;
    let smoothY = 0.5;
    let targetX = 0.5;
    let targetY = 0.5;
    let listening = false;
    let animating = false;

    const clamp = (v: number, min: number, max: number) =>
      Math.max(min, Math.min(max, v));

    const startListening = () => {
      if (listening) return;
      listening = true;
      el.classList.add('eikon-footer-gyro');
      setGyroActive(true);
      window.addEventListener('deviceorientation', handleOrientation);
      tick();
    };

    const handleOrientation = (e: DeviceOrientationEvent) => {
      const gamma = e.gamma ?? 0;
      const beta = e.beta ?? 55;
      targetX = clamp((gamma + 25) / 50, 0, 1);
      targetY = clamp((beta - 40) / 30, 0, 1);
    };

    const tick = () => {
      if (!listening) return;
      animating = true;
      rafId = requestAnimationFrame(() => {
        smoothX += (targetX - smoothX) * 0.12;
        smoothY += (targetY - smoothY) * 0.12;

        const rect = el.getBoundingClientRect();
        const localX = smoothX * rect.width;
        const localY = smoothY * rect.height;
        spot.style.transform = `translate3d(${localX - SPOT_HALF}px,${localY - SPOT_HALF}px,0)`;

        const meadowEl = meadowRef.current;
        if (meadowEl) {
          const meadowRect = meadowEl.getBoundingClientRect();
          const mx = smoothX * meadowRect.width;
          const my = smoothY * meadowRect.height;
          meadowEl.style.setProperty('--eikon-meadow-mx', `${mx}px`);
          meadowEl.style.setProperty('--eikon-meadow-my', `${my}px`);
        }

        tick();
      });
    };

    // iOS 13+ requires permission from a user gesture
    const needsPermission =
      typeof (DeviceOrientationEvent as any).requestPermission === 'function';

    if (needsPermission) {
      const handleTap = () => {
        (DeviceOrientationEvent as any)
          .requestPermission()
          .then((state: string) => {
            if (state === 'granted') startListening();
          })
          .catch(() => {});
        el.removeEventListener('touchstart', handleTap);
      };
      el.addEventListener('touchstart', handleTap, { once: true });
    } else {
      // Android / other — check if events actually fire
      const probe = (e: DeviceOrientationEvent) => {
        if (e.gamma !== null) {
          window.removeEventListener('deviceorientation', probe);
          startListening();
        }
      };
      window.addEventListener('deviceorientation', probe);
    }

    // Only activate animation when footer is in viewport (battery)
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting && listening) {
          listening = false;
          window.removeEventListener('deviceorientation', handleOrientation);
        } else if (entry.isIntersecting && !listening && animating) {
          listening = true;
          window.addEventListener('deviceorientation', handleOrientation);
          tick();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);

    return () => {
      listening = false;
      window.removeEventListener('deviceorientation', handleOrientation);
      if (rafId) cancelAnimationFrame(rafId);
      observer.disconnect();
      el.classList.remove('eikon-footer-gyro');
    };
  }, []);

  function handleBackToTop(e: ReactMouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    if (typeof document !== 'undefined') {
      // Prefer the hero anchor if it's present (covers most cases); a
      // smooth window-scroll is the universal fallback otherwise.
      const heroEl = document.getElementById(HERO_TOP_ID);
      if (heroEl) {
        heroEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  return (
    <footer
      ref={containerRef}
      className={`group/footer relative isolate mt-16 overflow-hidden bg-[var(--surface-1)]${footerLit ? ' eikon-footer-lit' : ''}`}
      style={
        {
          contentVisibility: 'auto',
          containIntrinsicSize: 'auto 500px',
        } as CSSProperties
      }
    >
      {/* Animated shine hairline. Sits inside an overflow-hidden
          wrapper so the gradient sweep can translate beyond the
          viewport edges without painting outside the footer. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px overflow-hidden bg-[var(--border-1)]"
      >
        <span className="eikon-footer-shine block h-full w-full" />
      </span>

      {/* Background decoration layer — grid + cursor spotlight. */}
      <div
        aria-hidden="true"
        className="eikon-footer-backdrop pointer-events-none absolute inset-0 -z-10"
      >
        {/* Faint line-grid, masked to the lower-centre so it backs
            the wordmark rather than the readable content. */}
        <div
          className="absolute inset-0 opacity-[0.55] dark:opacity-[0.32]"
          style={{
            backgroundImage:
              'linear-gradient(to right, var(--border-1) 1px, transparent 1px), linear-gradient(to bottom, var(--border-1) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage:
              'radial-gradient(ellipse 55% 70% at 50% 85%, black 25%, transparent 80%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 55% 70% at 50% 85%, black 25%, transparent 80%)',
          }}
        />
        {/* Cursor-follow spotlight — a fixed-size element moved with
            transform (GPU composite-only, zero repaint). */}
        <div
          ref={spotlightRef}
          className="eikon-footer-spotlight"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 720,
            height: 720,
            borderRadius: '50%',
            background:
              'radial-gradient(circle 360px, var(--accent-glow), transparent 70%)',
            willChange: 'transform',
            pointerEvents: 'none',
          }}
        />
      </div>

      <div
        className="relative mx-auto max-w-7xl px-4 pt-16 sm:px-6 sm:pt-20 lg:pt-24"
        style={{
          // iOS home-indicator inset so the back-to-top pill / live
          // status row never sit underneath the gesture bar.
          //
          // `max()` is the floor: on browsers without `env()`
          // support the function resolves to its first arg
          // (3rem), keeping the footer at LEAST the design's
          // original `pb-12` rhythm. With `env()` support, the
          // inset is added on top of a 2.5rem visual base.
          paddingBottom:
            'max(3rem, calc(2.5rem + env(safe-area-inset-bottom, 0px)))',
        }}
      >
        {/* Top: easter-egg invitation + Explore + Connect */}
        <div className="grid gap-10 gap-y-10 sm:grid-cols-2 sm:gap-12 sm:gap-y-14 lg:grid-cols-[1.4fr_1fr_1fr]">
          {/* HuntCard — the interactive prompt that replaced the
              former plain brand block. It nudges visitors toward
              the wordmark meadow easter egg without ever spelling
              out where exactly the flower hides. */}
          <HuntCard />

          {/* Explore */}
          <div>
            <ColumnLabel>{t('footer.explore')}</ColumnLabel>
            <ul className="mt-5 flex flex-col gap-3">
              <FooterNavLink href="/">{t('nav.home')}</FooterNavLink>
              <FooterNavLink href="/playground">
                {t('nav.playground')}
              </FooterNavLink>
              <FooterNavLink href="/changelog">
                {t('nav.changelog')}
              </FooterNavLink>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <ColumnLabel>{t('footer.connect')}</ColumnLabel>
            <div className="mt-5 flex flex-col items-start gap-3">
              <ChannelPill
                href={`mailto:${SITE.author.email}`}
                icon={<MailIcon />}
                label={SITE.author.email}
              />
              {/* Hide the GitHub pill entirely when site-config has
                  no real repo behind it — better to drop the link than
                  send the visitor to a 404 / GitHub home page. */}
              {isGithubConfigured() && (
                <ChannelPill
                  href={SITE.github.url}
                  icon={<GithubIcon />}
                  label={`${SITE.github.owner}/${SITE.github.repo}`}
                  external
                />
              )}
            </div>
          </div>
        </div>

        {/* Decorative big brand wordmark — visual anchor of the close.
            The wordmark sits inside a `relative` wrapper so the meadow
            easter egg can absolute-position itself flush against the
            wordmark's lower edge and "grow" the brand name out of the
            grass when the visitor's spotlight passes over it. */}
        {brandTokens.length > 0 && (
          <div
            aria-hidden="true"
            className="relative mt-14 flex justify-center sm:mt-20 lg:mt-24"
          >
            <div className="relative" id={MEADOW_ANCHOR_ID}>
              <div className="eikon-footer-wordmark">
                {brandTokens.map((token, idx) => (
                  <span key={token}>
                    {token}
                    {idx < brandTokens.length - 1 && (
                      <span
                        aria-hidden="true"
                        className="mx-[0.2em] font-light opacity-50"
                      >
                        ·
                      </span>
                    )}
                  </span>
                ))}
              </div>
              <Meadow ref={meadowRef} onLitChange={handleLitChange} />
            </div>
            {/* Mobile tilt hint — shown only on touch, fades out once gyro activates */}
            {!gyroActive && (
              <p className="eikon-footer-tilt-hint">
                {t('footer.tiltHint')}
              </p>
            )}
          </div>
        )}

        {/* Bottom microcopy row */}
        <div className="mt-10 flex flex-col gap-4 border-t border-[var(--border-1)] pt-5 sm:mt-12 sm:flex-row sm:items-center sm:justify-between sm:pt-6">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-[var(--fg-4)]">
            <span className="inline-flex items-center gap-2">
              <span
                aria-hidden="true"
                className="eikon-footer-status-dot"
              />
              <span className="font-mono uppercase tracking-[0.18em]">
                {t('footer.live')}
              </span>
            </span>
            <Separator />
            <span>{t('footer.copyright')}</span>
            <Separator />
            <span className="font-mono">{SITE.version}</span>
            <Separator />
            <span className="hidden text-[var(--fg-4)]/70 sm:inline">
              {t('footer.madeWith')}
            </span>
          </div>

          <BackToTopButton
            label={t('footer.backToTop')}
            onClick={handleBackToTop}
          />
        </div>
      </div>
    </footer>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

/**
 * Section label used above each column. Same eyebrow treatment as the
 * QA section's "SUPPORT" mark — small accent dot + uppercase tracked
 * text — so the two sections feel cut from the same cloth.
 */
function ColumnLabel({ children }: { children: ReactNode }) {
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
function FooterNavLink({
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
function ChannelPill({
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
function BackToTopButton({
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

function Separator() {
  return (
    <span aria-hidden="true" className="text-[var(--border-2)]">
      /
    </span>
  );
}
