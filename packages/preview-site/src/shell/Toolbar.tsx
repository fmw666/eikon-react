import { useState } from 'react';

import { useShellStore } from './store';
import { type FrameSize, useUiStore } from './store';

/**
 * Slim toolbar that sits between the params header and the resizable body.
 *
 * RESPONSIVE BEHAVIOUR
 * --------------------
 *
 * The toolbar has three responsibilities:
 *
 *   1. Parent-side panel toggle (Files)            — left.
 *   2. Iframe presentation (device-frame Size)    — middle.
 *   3. Iframe navigation (Go to + Reload)          — right.
 *
 *   Desktop / tablet (`md+`, `compact === false`)
 *
 *     [Files]            [Size: S M L | Go to: Home Counter … | Reload]
 *
 *   Mobile (`<md`, `compact === true`)
 *
 *     [Preview ▎ Files ▎ Code]                           [⋯ menu] [↻]
 *
 *     The three-pane resizable layout is unusable below ~720px (12% +
 *     20% + 25% panel minimums squash everything into unreadable
 *     strips), so the parent `PlaygroundShell` swaps to a single-pane
 *     view and we render a tab strip here in the toolbar to switch
 *     between Preview / Files / Code. Size + Go to are folded into
 *     a hover/tap popover keyed by a "⋯" button so the toolbar fits
 *     on a 360px viewport without horizontal scroll.
 *
 * The desktop branch is intentionally `flex-wrap`-friendly so even
 * on the desktop layout, an unusually small workbench card (e.g. a
 * pinned sidebar leaves only ~520px for the right pane) doesn't
 * clip the Go-to row — the row wraps to a second line instead.
 */

interface QuickLink {
  /** Sub-route inside the previewed app (no `/preview/<hash>` prefix). */
  target: string;
  label: string;
  /** Optional supplementary tooltip; falls back to "Navigate to <label>". */
  title?: string;
}

const QUICK_LINKS: ReadonlyArray<QuickLink> = [
  { target: '/', label: 'Home' },
  { target: '/counter', label: 'Counter' },
  { target: '/tasks', label: 'Tasks' },
  {
    target: '/examples',
    label: 'Examples',
    title: 'Component showcase (dev-only feature, stripped from scaffolded projects)',
  },
  {
    target: '/examples/performance',
    label: 'Performance',
    title: 'Web Vitals + virtual list + lazy-load demos',
  },
  // Intentionally unmatched path. The template router has a `*` catch-all
  // wired to `<NotFoundPage />`, so any URL that no feature claims falls
  // through to the 404 view — this button is the easiest way to preview
  // that state without typing into the iframe's address bar.
  {
    target: '/404',
    label: 'Not Found',
    title: 'Preview the 404 catch-all page (any unmatched route works)',
  },
];

const FRAME_SIZE_LABELS: Record<FrameSize, { label: string; mobile: string; desktop: string }> = {
  small: { label: 'S', mobile: 'iPhone SE — 375 × 667', desktop: 'Laptop — 1024 × 640' },
  standard: {
    label: 'M',
    mobile: 'iPhone 14 Pro — 390 × 844',
    desktop: 'Desktop — 1280 × 800',
  },
  large: {
    label: 'L',
    mobile: 'iPhone Pro Max — 430 × 932',
    desktop: 'Monitor — 1440 × 900',
  },
};

const FRAME_SIZES: readonly FrameSize[] = ['small', 'standard', 'large'];

type MobileView = 'preview' | 'files' | 'code';

export interface ToolbarProps {
  /**
   * `true` on `<md` viewports. Switches the toolbar to the mobile tab
   * strip + overflow menu. Forwarded by `PlaygroundShell` from its
   * `useIsCompactShell()` hook.
   */
  compact?: boolean;
  /** Active mobile tab. Ignored when `compact === false`. */
  mobileView?: MobileView;
  /** Setter for the mobile tab. Ignored when `compact === false`. */
  onChangeMobileView?: (next: MobileView) => void;
}

export function Toolbar({
  compact = false,
  mobileView = 'preview',
  onChangeMobileView,
}: ToolbarProps = {}) {
  const showFiles = useUiStore((s) => s.showFiles);
  const toggleFiles = useUiStore((s) => s.toggleFiles);
  const reloadPreview = useUiStore((s) => s.reloadPreview);
  const navigateInPreview = useUiStore((s) => s.navigateInPreview);
  const frameSize = useUiStore((s) => s.frameSize);
  const setFrameSize = useUiStore((s) => s.setFrameSize);
  // Every platform now renders a DeviceShell (Chrome for web, macOS
  // Sequoia for desktop, iPhone for mobile), so the size segmented
  // control is always meaningful — it picks the simulated reference
  // device.  We still read the platform so the tooltip text can
  // describe the right physical reference (Pro Max vs Monitor 24").
  const platform = useShellStore((s) => String(s.state.platform));

  if (compact) {
    return (
      <CompactToolbar
        mobileView={mobileView}
        onChangeMobileView={onChangeMobileView ?? (() => {})}
        frameSize={frameSize}
        setFrameSize={setFrameSize}
        platform={platform}
        navigateInPreview={navigateInPreview}
        reloadPreview={reloadPreview}
      />
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
        rowGap: 6,
        padding: '6px 12px',
        background: 'color-mix(in srgb, var(--surface-2) 72%, transparent)',
        backdropFilter: 'blur(12px) saturate(140%)',
        WebkitBackdropFilter: 'blur(12px) saturate(140%)',
        color: 'var(--fg-2)',
        borderBottom: '1px solid transparent',
        borderImage: 'linear-gradient(to right, transparent, var(--border-2), transparent) 1',
        fontFamily: 'var(--font-sans, system-ui, sans-serif)',
        fontSize: 12,
      }}
    >
      {/*
        Only "Files" gets a toolbar toggle — Editor is a child of Files in
        the UX model (you pick a file in the tree, the editor opens). To
        close just the Editor while keeping Files open, use the × on the
        editor's title bar.
      */}
      <ToggleButton
        active={showFiles}
        onClick={toggleFiles}
        label="Files"
        title={`${showFiles ? 'Hide' : 'Show'} file explorer`}
      />

      {/* Push the quick-jump cluster + Reload to the right edge. Files
        sits alone on the left because it controls a *parent-side* panel
        (the file explorer pane), while everything to the right of the
        spacer acts on the previewed iframe — grouping by target keeps
        the related controls visually adjacent. */}
      <span style={{ flex: 1 }} />

      {/* Frame-size segmented control. Sits LEFT of the quick-jump
        cluster because changing the frame size is much closer to the
        Files-side concern (presentation of the iframe) than to the
        in-iframe navigation controls on the far right. */}
      <span
        style={{
          color: 'var(--fg-3)',
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: 0.4,
          marginRight: 2,
        }}
      >
        Size
      </span>
      <div
        role="group"
        aria-label="Device frame size"
        style={{
          display: 'inline-flex',
          border: '1px solid var(--border-1)',
          borderRadius: 4,
          overflow: 'hidden',
          marginRight: 6,
        }}
      >
        {FRAME_SIZES.map((size, idx) => {
          const meta = FRAME_SIZE_LABELS[size];
          const active = frameSize === size;
          // Web uses the desktop reference dimensions (Safari frames a
          // browser window, which is just a desktop window with chrome),
          // so the desktop tooltip applies to both web and desktop here.
          const tooltip =
            platform === 'mobile' ? meta.mobile : meta.desktop;
          return (
            <button
              key={size}
              type="button"
              onClick={() => setFrameSize(size)}
              title={tooltip}
              aria-pressed={active}
              style={{
                background: active
                  ? 'rgb(148 163 184 / 0.15)'
                  : 'transparent',
                color: active ? 'var(--color-brand-300, #cbd5e1)' : 'var(--fg-2)',
                border: 'none',
                borderLeft: idx === 0 ? 'none' : '1px solid var(--border-1)',
                padding: '3px 10px',
                fontSize: 12,
                fontWeight: active ? 600 : 400,
                cursor: 'pointer',
                minWidth: 26,
              }}
            >
              {meta.label}
            </button>
          );
        })}
      </div>
      <span
        aria-hidden="true"
        style={{
          width: 1,
          height: 16,
          background: 'var(--border-1)',
          margin: '0 4px',
        }}
      />


      <span
        style={{
          color: 'var(--fg-3)',
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: 0.4,
          marginRight: 2,
        }}
      >
        Go to
      </span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {QUICK_LINKS.map((link) => (
          <QuickJumpButton
            key={link.target}
            label={link.label}
            title={link.title ?? `Navigate to ${link.label}`}
            onClick={() => navigateInPreview(link.target)}
            highlight={link.target.startsWith('/examples')}
          />
        ))}
      </div>

      {/* Thin vertical divider separating "navigate inside preview"
        (quick-jump cluster) from "rebuild preview" (Reload). Both
        operate on the iframe but at different layers. */}
      <span
        aria-hidden="true"
        style={{
          width: 1,
          height: 16,
          background: 'var(--border-1)',
          margin: '0 4px',
        }}
      />

      <button
        type="button"
        onClick={reloadPreview}
        title="Reload preview"
        aria-label="Reload preview"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          background: 'transparent',
          color: 'var(--fg-2)',
          border: '1px solid var(--border-1)',
          borderRadius: 4,
          padding: '3px 10px',
          fontSize: 12,
          cursor: 'pointer',
        }}
      >
        <ReloadIcon />
        <span>Reload</span>
      </button>
    </div>
  );
}

// =============================================================================
// Compact (mobile) toolbar
// =============================================================================

interface CompactToolbarProps {
  mobileView: MobileView;
  onChangeMobileView: (next: MobileView) => void;
  frameSize: FrameSize;
  setFrameSize: (next: FrameSize) => void;
  platform: string;
  navigateInPreview: (target: string) => void;
  reloadPreview: () => void;
}

/**
 * Mobile toolbar layout:
 *
 *   ┌─ Preview │ Files │ Code ─┐   ┌─ ⋯ ─┐ ┌─ ↻ ─┐
 *   └ tab strip ───────────────┘   └ more┘ └reload┘
 *
 * The "⋯" button opens a popover stacked vertically with two sections:
 *
 *   1. SIZE — segmented S / M / L.
 *   2. GO TO — vertical list of every quick-jump target.
 *
 * Popover is dismissed by tapping the trigger again, tapping any of
 * its rows, or tapping outside (handled by a transparent backdrop).
 */
function CompactToolbar({
  mobileView,
  onChangeMobileView,
  frameSize,
  setFrameSize,
  platform,
  navigateInPreview,
  reloadPreview,
}: CompactToolbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  function jump(target: string) {
    navigateInPreview(target);
    setMenuOpen(false);
  }

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 8px',
        background: 'color-mix(in srgb, var(--surface-2) 72%, transparent)',
        backdropFilter: 'blur(12px) saturate(140%)',
        WebkitBackdropFilter: 'blur(12px) saturate(140%)',
        color: 'var(--fg-2)',
        borderBottom: '1px solid transparent',
        borderImage: 'linear-gradient(to right, transparent, var(--border-2), transparent) 1',
        fontFamily: 'var(--font-sans, system-ui, sans-serif)',
        fontSize: 12,
      }}
    >
      {/* Tab strip — primary action on mobile. */}
      <div
        role="tablist"
        aria-label="Playground view"
        style={{
          display: 'inline-flex',
          flex: 1,
          minWidth: 0,
          background: 'var(--surface-1)',
          border: '1px solid var(--border-1)',
          borderRadius: 8,
          padding: 2,
          overflow: 'hidden',
        }}
      >
        <TabButton
          label="Preview"
          active={mobileView === 'preview'}
          onClick={() => onChangeMobileView('preview')}
        />
        <TabButton
          label="Files"
          active={mobileView === 'files'}
          onClick={() => onChangeMobileView('files')}
        />
        <TabButton
          label="Code"
          active={mobileView === 'code'}
          onClick={() => onChangeMobileView('code')}
        />
      </div>

      {/* Overflow menu — Size + Go to. 40×40 hit area so the
          three control clusters (tab strip / overflow / reload)
          all read as one consistent 40px-tall row. */}
      <button
        type="button"
        aria-label="More tools"
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        onClick={() => setMenuOpen((v) => !v)}
        title="Size · Go to"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          height: 40,
          width: 40,
          background: menuOpen ? 'rgb(148 163 184 / 0.15)' : 'transparent',
          color: menuOpen ? 'var(--color-brand-300, #cbd5e1)' : 'var(--fg-2)',
          border: '1px solid var(--border-1)',
          borderRadius: 8,
          cursor: 'pointer',
        }}
      >
        <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1 }}>
          ⋯
        </span>
      </button>

      {/* Reload — kept as a top-level action because it's the most
          common "I'm done editing params, force fresh build" gesture. */}
      <button
        type="button"
        onClick={reloadPreview}
        title="Reload preview"
        aria-label="Reload preview"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          height: 40,
          width: 40,
          background: 'transparent',
          color: 'var(--fg-2)',
          border: '1px solid var(--border-1)',
          borderRadius: 8,
          cursor: 'pointer',
        }}
      >
        <ReloadIcon />
      </button>

      {menuOpen && (
        <>
          {/* Backdrop swallows the next pointer down so a tap on
              page background closes the menu without firing on
              whatever was underneath. */}
          <div
            aria-hidden="true"
            onClick={() => setMenuOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 30,
              background: 'transparent',
            }}
          />
          <div
            role="menu"
            aria-label="Toolbar overflow"
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 8,
              zIndex: 40,
              width: 'min(260px, calc(100vw - 24px))',
              maxHeight: 'min(70dvh, 360px)',
              overflowY: 'auto',
              background: 'var(--surface-1)',
              border: '1px solid var(--border-1)',
              borderRadius: 10,
              boxShadow:
                '0 18px 40px -12px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.15)',
              padding: 10,
            }}
          >
            <MenuSection title="Device frame size">
              <div
                role="group"
                aria-label="Device frame size"
                style={{
                  display: 'flex',
                  border: '1px solid var(--border-1)',
                  borderRadius: 6,
                  overflow: 'hidden',
                }}
              >
                {FRAME_SIZES.map((size, idx) => {
                  const meta = FRAME_SIZE_LABELS[size];
                  const active = frameSize === size;
                  const tooltip =
                    platform === 'mobile' ? meta.mobile : meta.desktop;
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setFrameSize(size)}
                      title={tooltip}
                      aria-pressed={active}
                      style={{
                        flex: 1,
                        background: active
                          ? 'rgb(148 163 184 / 0.15)'
                          : 'transparent',
                        color: active
                          ? 'var(--color-brand-300, #cbd5e1)'
                          : 'var(--fg-2)',
                        border: 'none',
                        borderLeft:
                          idx === 0 ? 'none' : '1px solid var(--border-1)',
                        padding: '8px 10px',
                        fontSize: 13,
                        fontWeight: active ? 600 : 400,
                        cursor: 'pointer',
                      }}
                    >
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </MenuSection>

            <MenuSection title="Go to">
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                {QUICK_LINKS.map((link) => (
                  <li key={link.target}>
                    <button
                      type="button"
                      onClick={() => jump(link.target)}
                      title={link.title ?? `Navigate to ${link.label}`}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: 'transparent',
                        color: link.target.startsWith('/examples')
                          ? '#f59e0b'
                          : 'var(--fg-2)',
                        border: '1px solid transparent',
                        borderRadius: 6,
                        padding: '8px 10px',
                        fontSize: 13,
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ flex: 1 }}>{link.label}</span>
                      <span
                        aria-hidden="true"
                        style={{
                          fontSize: 11,
                          color: 'var(--fg-4)',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {link.target}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </MenuSection>
          </div>
        </>
      )}
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      style={{
        flex: 1,
        minWidth: 0,
        background: active
          ? 'rgb(148 163 184 / 0.15)'
          : 'transparent',
        color: active ? 'var(--color-brand-300, #cbd5e1)' : 'var(--fg-3)',
        border: 'none',
        borderRadius: 6,
        padding: '8px 8px',
        fontSize: 13,
        fontWeight: active ? 600 : 500,
        cursor: 'pointer',
        // 36px hit-area inside the 40px-tall tab strip (4px outer
        // padding eats the rest). WCAG 2.2 AA's 24px floor is
        // comfortably cleared, and the 40px outer height matches
        // the overflow `⋯` button and Reload button next to it so
        // the row reads as one cohesive control strip.
        minHeight: 36,
      }}
    >
      {label}
    </button>
  );
}

function MenuSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--fg-3)',
          padding: '4px 4px 6px',
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function ReloadIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M13.5 8a5.5 5.5 0 1 1-1.61-3.89" />
      <path d="M13.5 2.5v3h-3" />
    </svg>
  );
}

function ToggleButton({
  active,
  onClick,
  label,
  title,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        background: active ? 'rgb(148 163 184 / 0.15)' : 'transparent',
        color: active ? 'var(--color-brand-300, #cbd5e1)' : 'var(--fg-2)',
        border:
          '1px solid ' +
          (active ? 'rgb(148 163 184 / 0.40)' : 'var(--border-1)'),
        borderRadius: 4,
        padding: '3px 10px',
        fontSize: 12,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

/**
 * Quick-jump button for the in-iframe nav row. `highlight` flags the
 * showcase routes (Examples / Performance) so they read as the toolbar's
 * value-add rather than just generic navigation — those are the routes
 * the user can't easily discover from inside the preview itself.
 */
function QuickJumpButton({
  label,
  title,
  onClick,
  highlight,
}: {
  label: string;
  title: string;
  onClick: () => void;
  highlight?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        background: 'transparent',
        color: highlight ? '#f59e0b' : 'var(--fg-2)',
        border:
          '1px solid ' + (highlight ? 'rgba(245, 158, 11, 0.45)' : 'var(--border-1)'),
        borderRadius: 4,
        padding: '3px 10px',
        fontSize: 12,
        cursor: 'pointer',
        fontWeight: highlight ? 500 : 400,
      }}
    >
      {label}
    </button>
  );
}
