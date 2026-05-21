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
  useEffect,
  useRef,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type Ref,
} from 'react';

import { navigate } from '../nav/route';
import { isGithubConfigured, SITE } from '../site-config';
import { useI18n } from '../theme/i18n';

const HERO_TOP_ID = 'top';

// Anchor on the wordmark wrapper. The HuntCard scrolls here so a
// visitor who clicks the prompt is brought face-to-face with the
// meadow they're being invited to explore.
const MEADOW_ANCHOR_ID = 'eikon-footer-meadow-anchor';

export function Footer() {
  const { t } = useI18n();
  const containerRef = useRef<HTMLElement | null>(null);
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

  // Mouse-follow spotlight — write cursor coordinates into CSS custom
  // properties on the host so the radial-gradient background tracks
  // the pointer without React re-renders. Cheap (composite-only).
  //
  // Gated on `pointer: fine` because the spotlight is a hover-only
  // affordance: on a touch device the only way to fire `pointermove`
  // is to drag a finger across the footer, which leaves the glow
  // stuck wherever the finger left off — a stale "hot spot" that
  // visitors read as a render bug.
  //
  // The same handler doubles as the driver for the meadow easter egg:
  // the grass / flower layer reveals only inside the spotlight's
  // radius, so we feed it meadow-local pixel coordinates here. On
  // pointerleave we shove the meadow's mask centre far off-canvas
  // so the grass collapses back to fully hidden — otherwise the
  // last cursor position would linger as a stale patch of grass.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function' ||
      !window.matchMedia('(pointer: fine)').matches
    ) {
      return;
    }
    const handleMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      el.style.setProperty('--eikon-footer-mx', `${x}%`);
      el.style.setProperty('--eikon-footer-my', `${y}%`);

      const meadowEl = meadowRef.current;
      if (meadowEl) {
        const mr = meadowEl.getBoundingClientRect();
        meadowEl.style.setProperty(
          '--eikon-meadow-mx',
          `${e.clientX - mr.left}px`,
        );
        meadowEl.style.setProperty(
          '--eikon-meadow-my',
          `${e.clientY - mr.top}px`,
        );
      }
    };
    const handleLeave = () => {
      el.style.setProperty('--eikon-footer-mx', '50%');
      el.style.setProperty('--eikon-footer-my', '50%');
      const meadowEl = meadowRef.current;
      if (meadowEl) {
        meadowEl.style.setProperty('--eikon-meadow-mx', '-9999px');
        meadowEl.style.setProperty('--eikon-meadow-my', '-9999px');
      }
    };
    el.addEventListener('pointermove', handleMove);
    el.addEventListener('pointerleave', handleLeave);
    return () => {
      el.removeEventListener('pointermove', handleMove);
      el.removeEventListener('pointerleave', handleLeave);
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
      className="group/footer relative isolate mt-16 overflow-hidden bg-[var(--surface-1)]"
      style={
        {
          '--eikon-footer-mx': '50%',
          '--eikon-footer-my': '50%',
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
        className="pointer-events-none absolute inset-0 -z-10"
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
        {/* Cursor-follow spotlight. Pure background-image, no extra
            paint cost — the radial-gradient origin is driven by CSS
            custom properties updated in the pointermove handler. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle 360px at var(--eikon-footer-mx) var(--eikon-footer-my), var(--accent-glow), transparent 70%)',
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
        <div className="grid gap-12 gap-y-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
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
            className="relative mt-20 flex justify-center sm:mt-24"
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
              <Meadow ref={meadowRef} />
            </div>
          </div>
        )}

        {/* Bottom microcopy row */}
        <div className="mt-12 flex flex-col gap-4 border-t border-[var(--border-1)] pt-6 sm:flex-row sm:items-center sm:justify-between">
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

// =============================================================================
// Hunt card — minimal easter-egg prompt
//
// A small ceramic-surface pill: just a swaying flower icon + the
// single line "Find the hidden flower". The icon is the same bloom
// the visitor will eventually find at the end of the meadow below,
// so once they discover it they instantly recognise the rhyme.
//
// Two quiet animations carry the "go look for it" intent:
//   - the card's accent-glow aura breathes slowly behind it
//   - the flower icon sways gently like grass in wind, then
//     pauses + stands upright on hover ("you've caught it")
//
// Clicking the card smooth-scrolls the wordmark into the centre
// of the viewport so the meadow is right there to be explored.
// =============================================================================

function HuntCard() {
  const { t } = useI18n();

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
    if (typeof document !== 'undefined') {
      const el = document.getElementById(MEADOW_ANCHOR_ID);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  return (
    <a
      href={`#${MEADOW_ANCHOR_ID}`}
      onClick={onClick}
      className="
        group/hunt relative isolate inline-flex w-fit items-center gap-3
        rounded-full border border-[var(--border-1)]
        bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface-1)]
        py-2 pl-2 pr-5
        no-underline
        shadow-[inset_0_1px_0_rgb(255_255_255/0.05),0_1px_2px_rgb(0_0_0/0.3)]
        transition-all duration-300 ease-out
        hover:-translate-y-0.5
        hover:border-[var(--border-2)]
        hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_2px_6px_rgb(0_0_0/0.4),0_18px_42px_-14px_var(--accent-glow)]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/40
      "
    >
      {/* Slow radial breath behind the card — accent-glow tinted,
          uses the same token as the meadow spotlight so the visual
          language between prompt and target stays connected. */}
      <span
        aria-hidden="true"
        className="eikon-hunt-aura pointer-events-none absolute inset-0 -z-10 rounded-full"
      />

      {/* Flower icon well — same ceramic well treatment as the
          ChannelPill arrow caps so the card reads as part of the
          footer's button family. */}
      <span
        aria-hidden="true"
        className="eikon-hunt-icon-well inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-0)] ring-1 ring-[var(--border-1)] shadow-[inset_0_1px_0_rgb(255_255_255/0.05),inset_0_-1px_0_rgb(0_0_0/0.35)]"
      >
        <span className="eikon-hunt-icon inline-block">
          <FlowerIcon />
        </span>
      </span>

      <span className="text-[14px] font-semibold tracking-tight text-[var(--fg-1)] transition-colors group-hover/hunt:text-[var(--fg-1)]">
        {t('footer.huntTitle')}
      </span>
    </a>
  );
}

/**
 * Compact flower icon — visual rhyme with the larger end-of-meadow
 * Flower component, so once the visitor finds the real bloom they
 * recognise it as the same object the card invited them to look for.
 */
function FlowerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <g transform="translate(12 12)">
        <ellipse
          cx="0"
          cy="-4.6"
          rx="2.4"
          ry="3.4"
          fill="hsl(338 62% 68%)"
        />
        <ellipse
          cx="4.2"
          cy="-1.4"
          rx="2.4"
          ry="3.4"
          fill="hsl(338 62% 68%)"
          transform="rotate(72 4.2 -1.4)"
        />
        <ellipse
          cx="2.6"
          cy="3.6"
          rx="2.4"
          ry="3.4"
          fill="hsl(338 62% 68%)"
          transform="rotate(144 2.6 3.6)"
        />
        <ellipse
          cx="-2.6"
          cy="3.6"
          rx="2.4"
          ry="3.4"
          fill="hsl(338 62% 68%)"
          transform="rotate(216 -2.6 3.6)"
        />
        <ellipse
          cx="-4.2"
          cy="-1.4"
          rx="2.4"
          ry="3.4"
          fill="hsl(338 62% 68%)"
          transform="rotate(288 -4.2 -1.4)"
        />
        <circle cx="0" cy="0" r="1.9" fill="hsl(48 82% 62%)" />
      </g>
    </svg>
  );
}

// =============================================================================
// Meadow easter egg
//
// A hidden strip of grass that grows out from underneath the giant
// EIKON · REACT wordmark — but ONLY where the visitor's mouse-follow
// spotlight passes over it. The whole layer is masked by the same
// circular gradient that drives the spotlight, so the grass is
// completely invisible until someone slides their cursor down to the
// wordmark and discovers it.
//
// A single tiny flower lives at the far right end of the meadow as
// a second-order easter egg: if the visitor keeps dragging the
// spotlight all the way to the end of "REACT", a single pink bloom
// reveals itself. Reward for curiosity.
// =============================================================================

/**
 * Deterministic "random" grass blade descriptors.
 *
 * We can't use Math.random() here — the meadow renders on first paint
 * and the layout needs to be stable across re-renders, hot reloads
 * and SSR/CSR (so blades don't visibly jitter when React hydrates).
 * Instead each blade derives its position / height / sway / colour
 * from its index via cheap prime-mod arithmetic. 70 blades is dense
 * enough to read as a continuous meadow at the wordmark's width
 * without overpaying for paths the visitor will mostly never see.
 *
 * - `x`         horizontal position in viewBox units (0–100)
 * - `height`    blade height in viewBox units (taller = peeks higher
 *               into the wordmark letters)
 * - `sway`     lateral tip offset, mimics gentle wind direction
 * - `hue/sat/light` HSL components — varied per blade so the meadow
 *               reads as natural mixed tones rather than astroturf
 */
/**
 * Per-blade descriptors with paired dim/bright lightness values
 * and a depth `row` (0 = back, 1 = mid, 2 = front).
 *
 * The meadow renders the same 390 blades twice: once as a dim
 * "shadow" copy under a wide soft mask, once as a brighter
 * "highlight" copy under a tight mask centred on the cursor.
 * Stacking the bright copy over the dim copy through different
 * mask radii produces real-feeling light falloff — same blade,
 * green-grey at the rim of the spotlight, fresh green at the
 * centre — without needing a real light shader.
 *
 * The 3-row depth split is what turns a flat strip of lines into
 * something that reads as actual ground texture:
 *
 *   - back row    short, hairline-thin, desaturated, ~65% opacity
 *                 → grass receding into haze behind the wordmark
 *   - mid row     medium height + weight, ~85% opacity
 *   - front row   tallest, thickest, fully opaque, brightest greens
 *                 → grass directly under the visitor's spotlight
 *
 * Painter's algorithm order (back → front via `SORTED_BLADES`
 * below) means tall front-row blades occlude the shorter back/mid
 * blades, producing visible parallax through the canopy. The 390-
 * blade count puts a fresh blade roughly every 2.5–4px of footer
 * width, dense enough to read as continuous lawn rather than
 * discernible individual stems.
 *
 * Front-row max height is intentionally tuned so the tallest tips
 * crest near 70% of the wordmark's cap height when the meadow
 * sits at its CSS `bottom` offset — i.e. the wordmark's lower
 * half is buried in grass and the brand name reads as *growing
 * out of the lawn*.
 *
 * - `x`            horizontal position in viewBox units (0–100)
 * - `height`       blade height in viewBox units (back: 14–22,
 *                  mid: 22–30, front: 30–38)
 * - `sway`         tip offset, small (±1.5) so blades stay
 *                  neatly upright like trimmed lawn grass
 * - `hue/sat`      shared HSL chroma — hue varies blade to blade
 *                  so the meadow reads as mixed tones, not astroturf
 * - `row`          depth bucket (0–2), drives width / opacity /
 *                  lightness scaling
 * - `strokeWidth`  blade weight in viewBox units; non-scaling-
 *                  stroke maps this to literal device pixels
 * - `rowOpacity`   atmospheric haze on far rows
 * - `shadeLight`   HSL lightness for the dim layer
 * - `lightLight`   HSL lightness for the bright layer
 */
const GRASS_BLADES = Array.from({ length: 390 }, (_, i) => {
  const x = (i / 389) * 100;
  const row = i % 3;
  const baseHeight = row === 0 ? 14 : row === 1 ? 22 : 30;
  const height = baseHeight + ((i * 17) % 10);
  const sway = (((i * 13) % 13) - 6) * 0.25;
  const hue = 88 + ((i * 23) % 42);
  const sat = 26 + ((i * 17) % 24);
  const strokeWidth =
    row === 0 ? 0.65 : row === 1 ? 0.9 : 1.2;
  const rowOpacity = row === 0 ? 0.65 : row === 1 ? 0.85 : 1;
  const shadeLight =
    row === 0
      ? 8 + ((i * 5) % 6)
      : row === 1
        ? 14 + ((i * 5) % 7)
        : 22 + ((i * 5) % 10);
  const lightLight =
    row === 0
      ? 26 + ((i * 5) % 8)
      : row === 1
        ? 38 + ((i * 5) % 11)
        : 50 + ((i * 5) % 14);
  return {
    x,
    height,
    sway,
    hue,
    sat,
    row,
    strokeWidth,
    rowOpacity,
    shadeLight,
    lightLight,
  };
});

// Painter's algorithm: render back rows first so taller front-row
// blades naturally occlude shorter ones behind them. Sorted once
// at module load so the meadow doesn't re-sort on every render.
const SORTED_BLADES = [...GRASS_BLADES].sort((a, b) => a.row - b.row);

/**
 * Render one full grass SVG using a chooser function to pick the
 * HSL lightness per blade. Extracted so the dim "shade" layer and
 * the bright "light" layer share blade geometry exactly (essential
 * — if their paths drifted by even half a pixel the stacked illusion
 * of a single blade lit unevenly would break into a visible
 * doubled silhouette).
 *
 * The `mode` prop only affects the soil band tint underneath the
 * grass (deeper / damper in the highlight pass, almost-black in
 * the shadow pass). Without the soil band the meadow looks like
 * grass floating over the page background; with it, the blades
 * have somewhere to be rooted.
 */
function GrassBlades({
  pickLightness,
  mode,
}: {
  pickLightness: (g: (typeof GRASS_BLADES)[number]) => number;
  mode: 'shade' | 'light';
}) {
  const soilId = `eikon-meadow-soil-${mode}`;
  const soilTopAlpha = mode === 'shade' ? 0 : 0;
  const soilBottomAlpha = mode === 'shade' ? 0.55 : 0.9;
  const soilBottomColor =
    mode === 'shade'
      ? `hsl(28 28% 6% / ${soilBottomAlpha})`
      : `hsl(28 32% 13% / ${soilBottomAlpha})`;
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 100 60"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient
          id={soilId}
          x1="0"
          y1="48"
          x2="0"
          y2="60"
          gradientUnits="userSpaceOnUse"
        >
          <stop
            offset="0%"
            stopColor={`hsl(28 28% 6% / ${soilTopAlpha})`}
          />
          <stop offset="100%" stopColor={soilBottomColor} />
        </linearGradient>
      </defs>
      {/* Soil band — sits behind the blades, fades upward into the
          page so the meadow blends instead of butting against a
          hard line. Slightly oversized x so the band reaches the
          mask's feathered edge. */}
      <rect
        x="-2"
        y="48"
        width="104"
        height="14"
        fill={`url(#${soilId})`}
      />
      {SORTED_BLADES.map((g, i) => {
        const tipX = g.x + g.sway;
        const tipY = 60 - g.height;
        const ctrlX = g.x + g.sway * 0.5;
        const ctrlY = 60 - g.height * 0.55;
        return (
          <path
            key={i}
            d={`M ${g.x} 60 Q ${ctrlX} ${ctrlY} ${tipX} ${tipY}`}
            stroke={`hsl(${g.hue} ${g.sat}% ${pickLightness(g)}%)`}
            strokeWidth={g.strokeWidth}
            strokeLinecap="round"
            fill="none"
            vectorEffect="non-scaling-stroke"
            opacity={g.rowOpacity}
          />
        );
      })}
    </svg>
  );
}

function Meadow({ ref }: { ref: Ref<HTMLDivElement> }) {
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="eikon-footer-meadow"
      style={
        {
          '--eikon-meadow-mx': '-9999px',
          '--eikon-meadow-my': '-9999px',
        } as CSSProperties
      }
    >
      {/* Dim outer layer — visible across the wide soft halo of the
          spotlight, simulating the grass that's *almost* in shadow. */}
      <div className="eikon-footer-meadow__shade">
        <GrassBlades
          mode="shade"
          pickLightness={(g) => g.shadeLight}
        />
      </div>

      {/* Bright inner layer — the hot spot. Tight mask + brighter
          greens, stacked over the shade layer so the cursor's centre
          reads as actually lit. */}
      <div className="eikon-footer-meadow__light">
        <GrassBlades
          mode="light"
          pickLightness={(g) => g.lightLight}
        />
      </div>

      {/* Flower layer — covers the whole meadow so its mask shares
          the same coordinate origin as the grass layers above. Only
          paints one tiny flower at the right end of the meadow. */}
      <div className="eikon-footer-meadow__flower">
        <Flower />
      </div>
    </div>
  );
}

/**
 * The end-of-meadow flower. Rendered as its own SVG in an HTML layer
 * (rather than inside the stretched meadow SVG) so it keeps its
 * proportions — otherwise `preserveAspectRatio="none"` would squash
 * the petals into ovals as the footer gets wider.
 */
function Flower() {
  return (
    <svg
      aria-hidden="true"
      className="eikon-footer-flower"
      viewBox="0 0 24 48"
    >
      <path
        d="M12 48 Q10.5 32 12 16"
        stroke="hsl(110 38% 30%)"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M12 32 Q5 30 3.5 26 Q9 26.5 12 30 Z"
        fill="hsl(108 38% 32%)"
      />
      <path
        d="M12 40 Q19 38 20.5 34 Q15 34.5 12 38 Z"
        fill="hsl(108 38% 32%)"
      />
      <g transform="translate(12 11)">
        <ellipse
          cx="0"
          cy="-5"
          rx="3"
          ry="4.2"
          fill="hsl(338 62% 68%)"
        />
        <ellipse
          cx="4.6"
          cy="-1.5"
          rx="3"
          ry="4.2"
          fill="hsl(338 62% 68%)"
          transform="rotate(72 4.6 -1.5)"
        />
        <ellipse
          cx="2.9"
          cy="4"
          rx="3"
          ry="4.2"
          fill="hsl(338 62% 68%)"
          transform="rotate(144 2.9 4)"
        />
        <ellipse
          cx="-2.9"
          cy="4"
          rx="3"
          ry="4.2"
          fill="hsl(338 62% 68%)"
          transform="rotate(216 -2.9 4)"
        />
        <ellipse
          cx="-4.6"
          cy="-1.5"
          rx="3"
          ry="4.2"
          fill="hsl(338 62% 68%)"
          transform="rotate(288 -4.6 -1.5)"
        />
        <circle cx="0" cy="0" r="2.2" fill="hsl(48 82% 62%)" />
      </g>
    </svg>
  );
}

// =============================================================================
// Icons
// =============================================================================

function MailIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2.16c-3.2.69-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.71 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.18.92-.26 1.91-.39 2.9-.39.99 0 1.98.13 2.9.39 2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.77.11 3.06.74.8 1.19 1.83 1.19 3.09 0 4.43-2.7 5.41-5.27 5.7.41.36.78 1.06.78 2.14v3.18c0 .31.21.67.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3 w-3"
      aria-hidden="true"
    >
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

function ArrowUp() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3 w-3"
      aria-hidden="true"
    >
      <path d="M8 13V3M4 7l4-4 4 4" />
    </svg>
  );
}

