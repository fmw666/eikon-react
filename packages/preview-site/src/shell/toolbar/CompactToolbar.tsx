// Internal to the shell Toolbar — not part of the feature index barrel.

import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import type { FrameSize } from '../store';
import { FRAME_SIZES, FRAME_SIZE_LABELS } from './frame-sizes';
import { ReloadIcon } from './icons';
import { QUICK_LINKS } from './quick-links';
import type { MobileView } from './types';

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
export function CompactToolbar({
  mobileView,
  onChangeMobileView,
  frameSize,
  setFrameSize,
  platform,
  navigateInPreview,
  reloadPreview,
}: CompactToolbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Fixed-position anchor for the portalled popover, in viewport
  // coordinates. `right` is the distance from the viewport's right edge
  // so the menu stays flush with the trigger's right side.
  const [anchor, setAnchor] = useState<{ top: number; right: number }>({
    top: 0,
    right: 0,
  });

  // The toolbar uses `backdrop-filter`, which makes it its own stacking
  // context. An absolutely-positioned popover nested inside is therefore
  // trapped *behind* the sibling <main>/preview iframe no matter how high
  // its z-index. We portal the menu to <body> to escape that context, and
  // anchor it to the trigger's viewport rect with `position: fixed`.
  useLayoutEffect(() => {
    if (!menuOpen) return;
    const place = () => {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setAnchor({
        top: rect.bottom + 6,
        right: Math.max(12, window.innerWidth - rect.right),
      });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [menuOpen]);

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
        ref={triggerRef}
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

      {menuOpen && createPortal(
        <>
          {/* Backdrop swallows the next pointer down so a tap on
              page background closes the menu without firing on
              whatever was underneath. Portalled to <body> alongside the
              menu so both escape the toolbar's backdrop-filter stacking
              context (otherwise the menu paints behind the preview
              iframe and the trigger looks dead). */}
          <div
            aria-hidden="true"
            onClick={() => setMenuOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              background: 'transparent',
            }}
          />
          <div
            role="menu"
            aria-label="Toolbar overflow"
            className="eikon-scroll-dropdown"
            style={{
              position: 'fixed',
              top: anchor.top,
              right: anchor.right,
              zIndex: 1001,
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
        </>,
        document.body
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
