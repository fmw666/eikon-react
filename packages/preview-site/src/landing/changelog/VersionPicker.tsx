/**
 * @file VersionPicker.tsx
 * @description Two-up version selector that drives the compare pair.
 *
 * VISUAL MODEL
 *
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │  Base ▼ v0.1.0  ⇄  Head ▼ v0.2.0     [↻ Refresh]            │
 *   └─────────────────────────────────────────────────────────────┘
 *
 * The two dropdowns are siblings, separated by a swap button that
 * flips them. We deliberately render the dropdowns as a native
 * `<details>`/`<summary>` pair instead of pulling in a headless
 * combobox library — this surface has at most ~50 items, no search,
 * no async loading per row, no keyboard-shortcut requirements beyond
 * native browser focus + arrow-on-detail. Native chrome wins here.
 *
 * RELATIVE-DATE LABELS
 *
 *   The dropdown row shows "v0.1.0  · 3 days ago". The relative
 *   formatting is computed lazily inside the row so we don't pay for
 *   every release's relative time on a closed dropdown — only the
 *   currently-rendered ones.
 */

import { useEffect, useMemo, useRef } from 'react';

import type { GitHubRelease } from '@/lib/github';

import { useI18n } from '../theme/i18n';

interface VersionPickerProps {
  releases: GitHubRelease[];
  baseTag: string | null;
  headTag: string | null;
  onChangeBase: (tag: string) => void;
  onChangeHead: (tag: string) => void;
  onSwap: () => void;
  onRefresh: () => void;
  refreshing?: boolean;
  /**
   * Hide the "Refresh" pill. Demo mode passes `false` because the
   * static dataset has nothing to re-fetch — leaving a no-op button
   * in the UI would confuse visitors who clicked it expecting feedback.
   * Defaults to `true` so the live-API call site keeps the previous
   * always-visible behaviour.
   */
  showRefresh?: boolean;
}

export function VersionPicker({
  releases,
  baseTag,
  headTag,
  onChangeBase,
  onChangeHead,
  onSwap,
  onRefresh,
  refreshing,
  showRefresh = true,
}: VersionPickerProps) {
  const { t, lang } = useI18n();

  // The default lookup falls back to "(version)" placeholder text when
  // the parent hasn't picked yet — happens between mount and the
  // bootstrap effect that auto-selects the latest two releases.
  const baseRelease = useMemo(
    () => releases.find((r) => r.tagName === baseTag) ?? null,
    [releases, baseTag]
  );
  const headRelease = useMemo(
    () => releases.find((r) => r.tagName === headTag) ?? null,
    [releases, headTag]
  );

  // Disable swap when either side hasn't resolved to a real release.
  const canSwap = baseRelease !== null && headRelease !== null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Dropdown
        label={t('changelog.picker.base')}
        selected={baseRelease}
        releases={releases}
        onSelect={onChangeBase}
        excludeTag={headTag}
        lang={lang}
      />

      <button
        type="button"
        onClick={onSwap}
        disabled={!canSwap}
        title={t('changelog.picker.swap')}
        aria-label={t('changelog.picker.swap')}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--border-1)] bg-[var(--surface-2)] text-[var(--fg-3)] transition-colors hover:text-[var(--fg-1)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <SwapIcon />
      </button>

      <Dropdown
        label={t('changelog.picker.head')}
        selected={headRelease}
        releases={releases}
        onSelect={onChangeHead}
        excludeTag={baseTag}
        lang={lang}
      />

      {showRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--border-1)] bg-[var(--surface-2)] px-3 text-xs text-[var(--fg-2)] transition-colors hover:text-[var(--fg-1)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshIcon spinning={!!refreshing} />
          {t('changelog.picker.refresh')}
        </button>
      )}
    </div>
  );
}

// ===========================================================================
// Single dropdown
// ===========================================================================

interface DropdownProps {
  label: string;
  selected: GitHubRelease | null;
  releases: GitHubRelease[];
  onSelect: (tag: string) => void;
  /** Tag to dim out (already used on the other side of the compare). */
  excludeTag: string | null;
  lang: string;
}

function Dropdown({
  label,
  selected,
  releases,
  onSelect,
  excludeTag,
  lang,
}: DropdownProps) {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);

  // Close the dropdown on outside click — the native `<details>` widget
  // doesn't auto-close, which feels broken when the user clicks "the
  // body" expecting it to dismiss like every other menu.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onDocClick = (e: MouseEvent) => {
      const el = detailsRef.current;
      if (!el || !el.open) return;
      if (e.target instanceof Node && el.contains(e.target)) return;
      el.open = false;
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  return (
    <details
      ref={detailsRef}
      className="relative"
    >
      <summary
        className="flex h-8 cursor-pointer list-none items-center gap-1.5 rounded-md border border-[var(--border-1)] bg-[var(--surface-2)] px-3 text-xs font-medium text-[var(--fg-1)] hover:border-[var(--border-2)] [&::-webkit-details-marker]:hidden"
      >
        <span className="text-[var(--fg-3)]">{label}</span>
        <span className="font-mono">
          {selected?.tagName ?? '—'}
        </span>
        {selected?.prerelease && <PreBadge />}
        <ChevronDown />
      </summary>

      <div className="absolute left-0 top-9 z-30 max-h-72 w-64 overflow-auto rounded-md border border-[var(--border-1)] bg-[var(--surface-2)] py-1 shadow-lg">
        {releases.length === 0 ? (
          <div className="px-3 py-2 text-xs text-[var(--fg-3)]">
            No releases
          </div>
        ) : (
          releases.map((r) => (
            <DropdownRow
              key={r.tagName}
              release={r}
              isSelected={selected?.tagName === r.tagName}
              isExcluded={excludeTag === r.tagName}
              onClick={() => {
                onSelect(r.tagName);
                if (detailsRef.current) detailsRef.current.open = false;
              }}
              lang={lang}
            />
          ))
        )}
      </div>
    </details>
  );
}

function DropdownRow({
  release,
  isSelected,
  isExcluded,
  onClick,
  lang,
}: {
  release: GitHubRelease;
  isSelected: boolean;
  isExcluded: boolean;
  onClick: () => void;
  lang: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isExcluded}
      className={
        'flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs transition-colors ' +
        (isSelected
          ? 'bg-[var(--surface-3)] text-[var(--fg-1)]'
          : 'text-[var(--fg-2)] hover:bg-[var(--surface-3)]') +
        ' disabled:cursor-not-allowed disabled:opacity-40'
      }
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="truncate font-mono">{release.tagName}</span>
        {release.prerelease && <PreBadge />}
      </div>
      <span className="shrink-0 text-[10px] text-[var(--fg-3)]">
        {formatRelativeDate(release.publishedAt, lang)}
      </span>
    </button>
  );
}

// ===========================================================================
// Helpers
// ===========================================================================

/**
 * Lightweight i18n-aware "X days ago" formatter. Uses
 * `Intl.RelativeTimeFormat` which is in every modern browser; falls
 * back to ISO date when the input is empty / unparseable.
 *
 * We pick the LARGEST applicable unit so the label reads as
 * "3 months ago" rather than "92 days ago" — matches the GitHub
 * release card convention.
 */
function formatRelativeDate(iso: string, lang: string): string {
  if (!iso) return '';
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return '';
  const diffSec = (ts - Date.now()) / 1000;
  const abs = Math.abs(diffSec);
  // [unit-name, seconds-per-unit]
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 365 * 24 * 60 * 60],
    ['month', 30 * 24 * 60 * 60],
    ['week', 7 * 24 * 60 * 60],
    ['day', 24 * 60 * 60],
    ['hour', 60 * 60],
    ['minute', 60],
    ['second', 1],
  ];
  let chosen: [Intl.RelativeTimeFormatUnit, number] = ['second', 1];
  for (const [u, s] of units) {
    if (abs >= s) {
      chosen = [u, s];
      break;
    }
  }
  try {
    const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
    return rtf.format(Math.round(diffSec / chosen[1]), chosen[0]);
  } catch {
    return new Date(ts).toISOString().slice(0, 10);
  }
}

// ===========================================================================
// Tiny visual atoms
// ===========================================================================

function PreBadge() {
  return (
    <span className="rounded-sm bg-[var(--surface-3)] px-1 py-px font-mono text-[9px] uppercase tracking-wider text-[var(--fg-3)]">
      pre
    </span>
  );
}

function ChevronDown() {
  return (
    <svg
      width={10}
      height={10}
      viewBox="0 0 10 10"
      aria-hidden="true"
      className="ml-0.5 text-[var(--fg-3)]"
    >
      <path
        d="M2 4 L5 7 L8 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SwapIcon() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 14 14"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 5h7m0 0L7.5 2.5M10 5L7.5 7.5" />
      <path d="M11 9H4m0 0l2.5-2.5M4 9l2.5 2.5" />
    </svg>
  );
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{
        animation: spinning
          ? 'eikon-preview-spin 0.8s linear infinite'
          : undefined,
      }}
    >
      <path d="M10.5 3.5A4.5 4.5 0 1 0 11 7" />
      <path d="M10.5 1.5v2.5h-2.5" />
    </svg>
  );
}
