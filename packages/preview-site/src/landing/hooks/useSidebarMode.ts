/**
 * @file useSidebarMode.ts
 * @description Three-state controller for the collapsible playground
 * sidebar.
 *
 * State machine
 * -------------
 *
 *   collapsed ──┐                          ┌── pinned
 *               │  (pointer enter trigger) │  ▲
 *               │     200ms grace          │  │ pin button / [
 *               ▼                          │  │
 *            peeking ──── 300ms grace ─────┘  │
 *               │  (pointer leaves)            │
 *               ▲                              │
 *               └──────── unpin ───────────────┘
 *
 *   - `collapsed`: only the slim 12px rail is shown.
 *   - `peeking`:   transient overlay panel (does NOT consume layout
 *                  width — floats above the playground). Goes back
 *                  to `collapsed` 300ms after the cursor leaves the
 *                  rail/panel hit-area. Wikipedia-style "hover
 *                  preview".
 *   - `pinned`:    sidebar is part of the layout (playground shrinks).
 *                  Persisted across reloads.
 *
 * Persistence
 * -----------
 * The `pinned` boolean is stored in `localStorage` under
 * `evomap-sidebar-pinned:<storageKey>`, so the dedicated `/playground`
 * page and the home-page workbench can keep separate pins (a user who
 * pins on `/playground` doesn't necessarily want the marketing-page
 * workbench to open by default).
 *
 * Peek state is intentionally NOT persisted — it's a transient hover
 * affordance, never a saved choice.
 *
 * Keyboard
 * --------
 * The hook also installs a window keydown listener:
 *
 *   - `[`       → toggle pinned (the Linear-style "fold sidebar" hotkey,
 *                 widely recognised across IDE-ish surfaces).
 *   - `Escape`  → if peeking, drop the peek (return to collapsed); if
 *                 pinned, do nothing (Esc is reserved for actual
 *                 modal dismissals elsewhere on the page).
 *
 * Reduced motion
 * --------------
 * Timing (200/300ms grace) is unchanged — the grace exists for
 * intent disambiguation, not for animation. The component renders
 * with instant transitions under `prefers-reduced-motion: reduce`.
 *
 * The hook itself is fully SSR-safe: it reads `localStorage` lazily
 * inside `useState`'s initialiser only when `window` exists, and the
 * keyboard listener is mounted inside `useEffect` (browser-only).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type SidebarState = 'collapsed' | 'peeking' | 'pinned';

/** Grace before a hover *enter* commits to peek — long enough that
 *  brushing past the rail on the way to the playground doesn't spawn
 *  a panel, short enough that a deliberate approach feels immediate. */
const PEEK_ENTER_DELAY_MS = 140;

/** Grace before a hover *leave* dismisses the peek — long enough that
 *  crossing the small gap between rail and panel (or wiggling slightly
 *  over a control) doesn't dismiss; short enough that walking away
 *  collapses promptly. */
const PEEK_LEAVE_DELAY_MS = 280;

interface UseSidebarModeOptions {
  /**
   * Unique key for localStorage persistence. Pass something stable like
   * `playground-page` or `home-workbench`. Two sidebars with different
   * keys keep independent pin state.
   */
  storageKey: string;
  /**
   * Default pin state for first-ever visit (before any localStorage
   * value exists). Defaults to `true` because the user's prior
   * decision was to err on "show by default so visitors see what's
   * configurable, then trust their muscle memory after they collapse".
   */
  defaultPinned?: boolean;
  /**
   * Whether the hook is active. The folding interaction is only
   * useful on `lg+`; on small viewports we render the static stacked
   * layout and skip both the keyboard listener and the peek timers
   * (otherwise tapping the trigger on mobile would still produce a
   * peek panel that has nowhere to float to).
   */
  enabled?: boolean;
}

export interface SidebarController {
  state: SidebarState;
  /** Convenience: `state === 'pinned'`. */
  isPinned: boolean;
  /** Convenience: `state === 'peeking'`. */
  isPeeking: boolean;
  /** Convenience: `state === 'collapsed'`. */
  isCollapsed: boolean;
  /** True when the panel is visible to the user (`peeking || pinned`). */
  isOpen: boolean;
  pin: () => void;
  unpin: () => void;
  togglePin: () => void;
  /**
   * Imperatively start a peek (used by click-to-open on the rail
   * itself, where the user has clearly opted in and shouldn't have
   * to wait for the 140ms hover grace).
   */
  openPeekNow: () => void;
  /** Imperatively close any active peek (e.g. on click-away). */
  closePeekNow: () => void;
  /** Spread on the rail wrapper and on the rail's trigger hit-zone. */
  triggerProps: {
    onPointerEnter: () => void;
    onPointerLeave: () => void;
  };
  /**
   * Spread on the peek panel root. Keeps the panel alive while the
   * cursor is over it (so the user can reach controls without the
   * leave-grace racing the cursor).
   */
  panelProps: {
    onPointerEnter: () => void;
    onPointerLeave: () => void;
  };
}

function readPin(storageKey: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(persistenceKey(storageKey));
    if (raw === '1') return true;
    if (raw === '0') return false;
    return fallback;
  } catch {
    return fallback;
  }
}

function writePin(storageKey: string, pinned: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(persistenceKey(storageKey), pinned ? '1' : '0');
  } catch {
    // Quota / private mode — silently degrade; we keep the in-memory
    // state correct, just lose persistence for this session.
  }
}

function persistenceKey(storageKey: string): string {
  return `evomap-sidebar-pinned:${storageKey}`;
}

export function useSidebarMode({
  storageKey,
  defaultPinned = true,
  enabled = true,
}: UseSidebarModeOptions): SidebarController {
  const [pinned, setPinned] = useState<boolean>(() =>
    readPin(storageKey, defaultPinned)
  );
  const [peeking, setPeeking] = useState(false);

  // Timers for the enter/leave grace. We keep them in refs so multiple
  // pointer events can cancel/replace pending transitions cleanly.
  const enterTimer = useRef<number | null>(null);
  const leaveTimer = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (enterTimer.current !== null) {
      window.clearTimeout(enterTimer.current);
      enterTimer.current = null;
    }
    if (leaveTimer.current !== null) {
      window.clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const pin = useCallback(() => {
    clearTimers();
    setPinned(true);
    setPeeking(false);
    writePin(storageKey, true);
  }, [clearTimers, storageKey]);

  const unpin = useCallback(() => {
    clearTimers();
    setPinned(false);
    setPeeking(true);
    writePin(storageKey, false);
  }, [clearTimers, storageKey]);

  const togglePin = useCallback(() => {
    if (pinned) unpin();
    else pin();
  }, [pinned, pin, unpin]);

  const openPeekNow = useCallback(() => {
    if (pinned) return;
    clearTimers();
    setPeeking(true);
  }, [clearTimers, pinned]);

  const closePeekNow = useCallback(() => {
    clearTimers();
    setPeeking(false);
  }, [clearTimers]);

  const onPointerEnter = useCallback(() => {
    if (!enabled || pinned) return;
    if (leaveTimer.current !== null) {
      window.clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
    if (peeking) return;
    if (enterTimer.current !== null) return;
    enterTimer.current = window.setTimeout(() => {
      enterTimer.current = null;
      setPeeking(true);
    }, PEEK_ENTER_DELAY_MS);
  }, [enabled, pinned, peeking]);

  const onPointerLeave = useCallback(() => {
    if (!enabled || pinned) return;
    if (enterTimer.current !== null) {
      window.clearTimeout(enterTimer.current);
      enterTimer.current = null;
    }
    if (leaveTimer.current !== null) return;
    leaveTimer.current = window.setTimeout(() => {
      leaveTimer.current = null;
      setPeeking(false);
    }, PEEK_LEAVE_DELAY_MS);
  }, [enabled, pinned]);

  useEffect(() => {
    if (!enabled) return;
    const handler = (event: KeyboardEvent) => {
      // Ignore when typing in an editable element — we don't want to
      // hijack `[` while the user is writing a prompt.
      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        const editable =
          target.isContentEditable ||
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT';
        if (editable) return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === '[') {
        event.preventDefault();
        togglePin();
      } else if (event.key === 'Escape') {
        if (peeking) {
          event.preventDefault();
          closePeekNow();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled, togglePin, peeking, closePeekNow]);

  const state: SidebarState = pinned
    ? 'pinned'
    : peeking
      ? 'peeking'
      : 'collapsed';

  const triggerProps = useMemo(
    () => ({ onPointerEnter, onPointerLeave }),
    [onPointerEnter, onPointerLeave]
  );
  const panelProps = useMemo(
    () => ({ onPointerEnter, onPointerLeave }),
    [onPointerEnter, onPointerLeave]
  );

  return {
    state,
    isPinned: pinned,
    isPeeking: peeking && !pinned,
    isCollapsed: !pinned && !peeking,
    isOpen: pinned || peeking,
    pin,
    unpin,
    togglePin,
    openPeekNow,
    closePeekNow,
    triggerProps,
    panelProps,
  };
}
