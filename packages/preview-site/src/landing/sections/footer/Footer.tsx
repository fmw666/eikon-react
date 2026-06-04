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
 *
 * Internal pieces live in sibling files to keep this file focused on
 * layout: the presentational sub-components in `FooterParts.tsx`, and
 * the cursor / touch / gyroscope spotlight wiring in
 * `useFooterSpotlight.ts`.
 */

import {
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from 'react';

import { isGithubConfigured, SITE } from '../../site-config';
import { useI18n } from '../../theme/i18n';

import { HERO_TOP_ID, MEADOW_ANCHOR_ID } from './constants';
import {
  BackToTopButton,
  ChannelPill,
  ColumnLabel,
  FooterNavLink,
  Separator,
} from './FooterParts';
import { HuntCard } from './HuntCard';
import { GithubIcon, MailIcon } from './icons';
import { Meadow } from './Meadow';
import { useFooterSpotlight } from './useFooterSpotlight';

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

  // Cursor / touch / gyroscope spotlight — all the imperative DOM
  // plumbing (rAF loops, long-press gating, gyro permission, meadow
  // mask CSS vars) lives in the hook so this stays a layout component.
  useFooterSpotlight({
    containerRef,
    spotlightRef,
    meadowRef,
    setMeadowActivated,
    setLightActive,
  });

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
