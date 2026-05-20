/**
 * @file LangSwitcher.tsx
 * @description Tiny custom dropdown for the landing language switch.
 *
 * Two presentation modes, picked via the `compact` prop:
 *
 *   - default (`compact={false}`)  : pill-style "🌐 中文 ▾" trigger
 *                                    showing the active language name.
 *                                    Used when the switcher is on its
 *                                    own in a utility cluster.
 *   - compact (`compact={true}`)   : 28×28 icon-only globe button.
 *                                    Used inside the centred Nav pill
 *                                    so the language switch reads as
 *                                    one of the navigation chips.
 *
 * Both modes share the same dropdown menu — only the trigger changes,
 * so a future redesign of either form is a one-line switch.
 *
 * Implemented from scratch rather than pulling Radix + Popper because
 * the menu has only ~2 items, no submenu / search / typeahead, and no
 * complex positioning needs. The interaction surface is:
 *
 *   - Click trigger          → open / close.
 *   - Click outside          → close.
 *   - Escape                 → close (and refocus trigger).
 *
 * That covers WAI-ARIA's "menu button" pattern at <100 LOC of vanilla
 * React, without adding ~15 KB of dependency. If the menu ever grows
 * beyond ~5 items or needs nested groups, swap in Radix DropdownMenu.
 */

import { useEffect, useId, useRef, useState } from 'react';

import {
  LANG_LABELS,
  SUPPORTED_LANGS,
  type Lang,
  useI18n,
} from '../theme/i18n';
import { useThemeStore } from '../theme/theme-store';

/**
 * Visual offset between the trigger button and the dropdown menu,
 * in pixels. Kept as a named constant because the same number gates
 * the menu's transform-origin (anchored at `top` of the menu) and
 * the gap below the trigger — keep them in lockstep.
 */
const MENU_OFFSET_PX = 8;

export function LangSwitcher({ compact = false }: { compact?: boolean } = {}) {
  const lang = useThemeStore((s) => s.lang);
  const setLang = useThemeStore((s) => s.setLang);
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const id = useId();

  // Close on outside click + Escape. Adding the listener only while open
  // keeps the cold path cost at zero — most users never open this menu.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function choose(next: Lang) {
    setLang(next);
    setOpen(false);
    triggerRef.current?.focus();
  }

  // Compact: small icon-only globe trigger. Used inside the Nav pill.
  // Mirrors NavLink's pure-opacity colour scheme so links and the
  // language icon read as one consistent palette inside the island:
  //   - idle / closed : white @ 42%
  //   - hover / open  : white @ 90%
  // The globe also performs a tiny 0.85→1 scale when the menu opens
  // so the icon registers as "armed" — telegraphs that the trigger
  // is actively producing a UI surface, not just changing colour.
  if (compact) {
    return (
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={`${id}-menu`}
          aria-label={t('nav.language')}
          title={t('nav.language')}
          onClick={() => setOpen((v) => !v)}
          className={
            'group inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-200 ease-out ' +
            (open
              ? 'text-[hsla(0,0%,100%,0.9)]'
              : 'text-[hsla(0,0%,100%,0.42)] hover:text-[hsla(0,0%,100%,0.9)]')
          }
        >
          <GlobeIcon
            className={
              'h-3.5 w-3.5 transition-transform duration-200 ease-out ' +
              (open ? 'scale-110' : 'scale-100 group-hover:scale-110')
            }
          />
        </button>

        {open && (
          <Menu
            menuRef={menuRef}
            id={`${id}-menu`}
            label={t('nav.language')}
            lang={lang}
            onChoose={choose}
          />
        )}
      </div>
    );
  }

  // Default: pill trigger showing the active language name.
  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={`${id}-menu`}
        aria-label={t('nav.language')}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--border-1)] bg-[var(--surface-1)] px-2.5 text-sm text-[var(--fg-2)] transition hover:border-[var(--border-2)] hover:text-[var(--fg-1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
      >
        <GlobeIcon className="h-4 w-4" />
        <span>{LANG_LABELS[lang]}</span>
        <ChevronIcon
          className={
            'h-3 w-3 transition-transform duration-200 ' +
            (open ? 'rotate-180' : 'rotate-0')
          }
        />
      </button>

      {open && (
        <Menu
          menuRef={menuRef}
          id={`${id}-menu`}
          label={t('nav.language')}
          lang={lang}
          onChoose={choose}
        />
      )}
    </div>
  );
}

/**
 * Shared dropdown body. Both compact and pill triggers anchor it at
 * the same relative offset; the menu width is tuned so language names
 * with diacritics still fit on one line.
 *
 * Enter animation is the `eikon-menu-pop` keyframe — short fade +
 * 6px settle anchored at top-right so the menu reads as "unfolded
 * from the trigger". Honours `prefers-reduced-motion` via CSS.
 *
 * Border is bumped to `border-2` (a slightly stronger line than
 * the rest of the dark UI) so the menu visually detaches from the
 * pill behind it even when the page background also happens to be
 * dark.
 */
function Menu({
  menuRef,
  id,
  label,
  lang,
  onChoose,
}: {
  menuRef: React.RefObject<HTMLUListElement | null>;
  id: string;
  label: string;
  lang: Lang;
  onChoose: (next: Lang) => void;
}) {
  return (
    <ul
      ref={menuRef}
      id={id}
      role="menu"
      aria-label={label}
      style={{ top: `calc(100% + ${MENU_OFFSET_PX}px)` }}
      className="eikon-menu-pop absolute right-0 z-50 min-w-[160px] overflow-hidden rounded-xl border border-[var(--border-2)] bg-[var(--surface-1)]/95 py-1 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.45),0_2px_6px_rgba(0,0,0,0.15)] backdrop-blur-xl"
    >
      {SUPPORTED_LANGS.map((l) => {
        const active = l === lang;
        return (
          <li key={l}>
            <button
              type="button"
              role="menuitemradio"
              aria-checked={active}
              onClick={() => onChoose(l)}
              className={
                'flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-sm transition-colors duration-150 ease-out ' +
                (active
                  ? 'bg-brand-500/10 text-brand-400'
                  : 'text-[var(--fg-2)] hover:bg-[var(--surface-2)] hover:text-[var(--fg-1)]')
              }
            >
              <span>{LANG_LABELS[l]}</span>
              {active && <CheckIcon className="h-3.5 w-3.5" />}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function GlobeIcon({ className }: { className: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20" />
      <path d="M12 2a14.5 14.5 0 0 1 0 20" />
      <path d="M2 12h20" />
    </svg>
  );
}

function ChevronIcon({ className }: { className: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CheckIcon({ className }: { className: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
