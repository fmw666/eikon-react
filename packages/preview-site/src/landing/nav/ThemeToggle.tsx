/**
 * @file ThemeToggle.tsx
 * @description Icon button that flips between light and dark.
 *
 * The two icons (sun + moon) live stacked in the same square and trade
 * opacity / rotation so the swap reads as a single morph rather than
 * a disappear/appear. No external icon library — inline SVG keeps the
 * Nav bundle below 1 KB and avoids a layout-shift on first paint.
 */

import { useI18n } from '../theme/i18n';
import { useThemeStore } from '../theme/theme-store';

export function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme);
  const toggle = useThemeStore((s) => s.toggleTheme);
  const { t } = useI18n();
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t('nav.toggleTheme')}
      title={t('nav.toggleTheme')}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-1)] bg-[var(--surface-1)] text-[var(--fg-2)] transition hover:border-[var(--border-2)] hover:text-[var(--fg-1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
    >
      <SunIcon
        className={
          'absolute h-4 w-4 transition-all duration-300 ' +
          (isDark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100')
        }
      />
      <MoonIcon
        className={
          'absolute h-4 w-4 transition-all duration-300 ' +
          (isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0')
        }
      />
    </button>
  );
}

function SunIcon({ className }: { className: string }) {
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
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

function MoonIcon({ className }: { className: string }) {
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
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
