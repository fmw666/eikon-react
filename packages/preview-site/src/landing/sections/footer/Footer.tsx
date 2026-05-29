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
  // `meadowActivated` and `lightActive` were previously toggled via
  // `el.classList.add/remove(...)` directly on the footer DOM. That was a
  // bug: every time React re-rendered the footer (e.g. when `footerLit`
  // flipped on flower click), it rewrote the `class` attribute from the
  // JSX className string, wiping out the JS-managed classes — meadow lost
  // its `eikon-footer-gyro` activation, the mobile CSS rule made it
  // `display:none`, and grass+flower vanished. Lifting both flags to
  // React state ensures the JSX className is the single source of truth.
  const [meadowActivated, setMeadowActivated] = useState(false);
  const [lightActive, setLightActive] = useState(false);
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

  // Touch + optional gyroscope spotlight for mobile (touch) devices.
  //
  // The touch path is gated on a long-press: the user has to hold a
  // finger still for ~280ms before the spotlight activates. Once active,
  // we suppress page scroll, text selection and the iOS callout menu so
  // the gesture is a *pure* light-control affordance — dragging never
  // accidentally selects copy or scrolls the page out from under the
  // light. A normal short tap or a tap-then-scroll never triggers the
  // gesture, so taps on links / buttons inside the footer still work.
  //
  // Gyroscope is an enhancement on top: once permission is granted (iOS)
  // or events fire spontaneously (Android), tilt drives the spotlight
  // when the user isn't actively touching. A 1.5s holdoff after touchend
  // keeps gyro from yanking the spotlight away the instant the user
  // lifts their finger. On insecure-context iOS Safari (HTTP / Lockdown)
  // the `DeviceOrientationEvent` global is undefined; we probe it with
  // `typeof` so the touch path keeps working even when gyro is missing.
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

    // Smaller spotlight on touch — desktop's 360px radius is sized for
    // a 1280+ canvas; on a phone footer it would near-fill the surface
    // and lose its "this is a finger-sized light" affordance.
    const SPOT_HALF = 180;
    const TOUCH_GYRO_HOLDOFF_MS = 1500;
    const LONG_PRESS_MS = 280;
    const MOVE_CANCEL_PX = 10;

    // Resize the spotlight DOM to match the mobile radius (the JSX
    // baseline below is desktop-sized).
    spot.style.width = `${SPOT_HALF * 2}px`;
    spot.style.height = `${SPOT_HALF * 2}px`;
    spot.style.background = `radial-gradient(circle ${SPOT_HALF}px, var(--accent-glow), transparent 70%)`;

    let rafId = 0;
    let smoothX = 0.5;
    let smoothY = 0.5;
    let targetX = 0.5;
    let targetY = 0.5;
    let touchActive = false;
    let touchEndedAt = 0;
    let inViewport = true;
    let ticking = false;
    let pressTimer: number | null = null;
    let pressStartX = 0;
    let pressStartY = 0;

    const clamp = (v: number, min: number, max: number) =>
      Math.max(min, Math.min(max, v));

    const tickStep = () => {
      smoothX += (targetX - smoothX) * 0.18;
      smoothY += (targetY - smoothY) * 0.18;

      const footerRect = el.getBoundingClientRect();
      const localX = smoothX * footerRect.width;
      const localY = smoothY * footerRect.height;
      // Spot center tracks the full footer range [0, width] / [0, height].
      // The spot DOM (2 * SPOT_HALF wide) extends past the footer edges
      // when the center is near them; the footer's `overflow:hidden`
      // clips the bleed. Don't pre-clamp the center — that would
      // shrink the reachable range to a tiny window in the middle on
      // narrow viewports (footer width ~ 2 * SPOT_HALF on phones).
      spot.style.transform = `translate3d(${localX - SPOT_HALF}px,${localY - SPOT_HALF}px,0)`;

      const meadowEl = meadowRef.current;
      if (meadowEl) {
        const meadowRect = meadowEl.getBoundingClientRect();
        // Convert footer-normalized smooth coords back into client
        // space, then into meadow-local. The meadow is a small strip
        // anchored mid-footer; multiplying the footer-normalized coord
        // by meadow size (the previous bug) re-stretched the *entire*
        // footer onto the meadow rect, so a touch at the top of the
        // footer would land at the top of the grass, lighting it where
        // the spotlight clearly isn't. Doing the round-trip via client
        // coords matches the desktop pointer path (`Footer.tsx` line
        // ~155) and keeps spotlight + meadow in lockstep.
        const clientX = footerRect.left + localX;
        const clientY = footerRect.top + localY;
        meadowEl.style.setProperty(
          '--eikon-meadow-mx',
          `${clientX - meadowRect.left}px`,
        );
        meadowEl.style.setProperty(
          '--eikon-meadow-my',
          `${clientY - meadowRect.top}px`,
        );
      }
    };

    const tick = () => {
      rafId = requestAnimationFrame(() => {
        if (ticking && inViewport) {
          tickStep();
          tick();
        } else {
          ticking = false;
        }
      });
    };

    let activated = false;

    const startTick = () => {
      if (ticking || !inViewport) return;
      ticking = true;
      // Activation gates the meadow visibility (`.eikon-footer-gyro` is
      // historical naming — touch input now activates it too). The class
      // is owned by React state so this useEffect's class adds survive
      // any re-render of the footer (e.g. when `footerLit` flips on
      // flower click).
      if (!activated) {
        activated = true;
        setMeadowActivated(true);
      }
      tick();
    };

    const setTargetFromClient = (clientX: number, clientY: number) => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      targetX = clamp((clientX - rect.left) / rect.width, 0, 1);
      targetY = clamp((clientY - rect.top) / rect.height, 0, 1);
    };

    const cancelPressTimer = () => {
      if (pressTimer !== null) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    };

    const beginGesture = (clientX: number, clientY: number) => {
      setTargetFromClient(clientX, clientY);
      // Snap the smoothed position to the touch on activation so the
      // spotlight appears under the finger instead of drifting in from
      // wherever it was last parked.
      smoothX = targetX;
      smoothY = targetY;
      touchActive = true;
      // `eikon-footer-light-active` flips touch-action / user-select /
      // -webkit-touch-callout off on the footer (see footer.css) — turns
      // the gesture into a pure light-control surface. Owned by React
      // state for the same reason as `eikon-footer-gyro` above.
      setLightActive(true);
      startTick();
    };

    const endGesture = () => {
      cancelPressTimer();
      if (touchActive) {
        touchActive = false;
        touchEndedAt = performance.now();
        setLightActive(false);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        // Multi-touch (pinch zoom etc.): cancel any pending press, let
        // the browser handle its native gesture.
        cancelPressTimer();
        return;
      }
      const t = e.touches[0];
      pressStartX = t.clientX;
      pressStartY = t.clientY;
      cancelPressTimer();
      pressTimer = window.setTimeout(() => {
        pressTimer = null;
        beginGesture(pressStartX, pressStartY);
      }, LONG_PRESS_MS);
    };

    const handleTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      if (touchActive) {
        // Active gesture — block scroll, drive spotlight.
        e.preventDefault();
        setTargetFromClient(t.clientX, t.clientY);
      } else if (pressTimer !== null) {
        // Pre-gesture: if the finger moves enough before the long-press
        // timer fires, treat it as a scroll attempt and abandon.
        const dx = t.clientX - pressStartX;
        const dy = t.clientY - pressStartY;
        if (dx * dx + dy * dy > MOVE_CANCEL_PX * MOVE_CANCEL_PX) {
          cancelPressTimer();
        }
      }
    };

    const handleTouchEnd = () => {
      endGesture();
    };

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (touchActive) return;
      if (performance.now() - touchEndedAt < TOUCH_GYRO_HOLDOFF_MS) return;
      const gamma = e.gamma ?? 0;
      const beta = e.beta ?? 55;
      targetX = clamp((gamma + 25) / 50, 0, 1);
      targetY = clamp((beta - 40) / 30, 0, 1);
      startTick();
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    // touchmove is non-passive: we need preventDefault during active
    // long-press to suppress the page's native scroll.
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    el.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    // iOS 13+ requires permission from a user gesture. Some iOS contexts
    // (insecure HTTP origin, Lockdown mode, certain in-app browsers) drop
    // the `DeviceOrientationEvent` global entirely — accessing it directly
    // there throws a ReferenceError, which previously crashed the whole
    // useEffect and unmounted the page (black screen). `typeof` is the
    // only safe way to probe for an undeclared global. If gyro is
    // unavailable, touch input alone drives the spotlight.
    type DOEStatic = { requestPermission?: () => Promise<string> } | null;
    const DOE: DOEStatic =
      typeof DeviceOrientationEvent !== 'undefined'
        ? (DeviceOrientationEvent as unknown as DOEStatic)
        : null;

    let gyroSubscribed = false;
    const subscribeGyro = () => {
      if (gyroSubscribed) return;
      gyroSubscribed = true;
      window.addEventListener('deviceorientation', handleOrientation);
    };

    if (DOE === null) {
      // Skip gyro entirely — touch handlers above already handle input.
    } else if (typeof DOE.requestPermission === 'function') {
      const handleTapForPermission = () => {
        DOE
          .requestPermission!()
          .then((state: string) => {
            if (state === 'granted') subscribeGyro();
          })
          .catch(() => {});
      };
      el.addEventListener('touchstart', handleTapForPermission, { once: true });
    } else {
      // Android / other — check if events actually fire
      const probe = (e: DeviceOrientationEvent) => {
        if (e.gamma !== null) {
          window.removeEventListener('deviceorientation', probe);
          subscribeGyro();
        }
      };
      window.addEventListener('deviceorientation', probe);
    }

    // Pause the rAF loop when the footer is off-screen (battery).
    const observer = new IntersectionObserver(
      ([entry]) => {
        inViewport = entry.isIntersecting;
        if (inViewport && activated) {
          startTick();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchEnd);
      window.removeEventListener('deviceorientation', handleOrientation);
      cancelPressTimer();
      if (rafId) cancelAnimationFrame(rafId);
      observer.disconnect();
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
      className={`group/footer relative isolate mt-16 overflow-hidden bg-[var(--surface-1)]${footerLit ? ' eikon-footer-lit' : ''}${meadowActivated ? ' eikon-footer-gyro' : ''}${lightActive ? ' eikon-footer-light-active' : ''}`}
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
