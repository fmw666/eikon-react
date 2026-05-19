/**
 * @file theme-toggle.tsx
 * @description Icon-only button that cycles light → dark → system.
 *
 * The visible icon reflects the *preference* (not the resolved scheme),
 * so a user who selected "system" sees the Monitor glyph even though the
 * page is actually rendered dark or light. That's intentional — the
 * toggle is a control over a tri-state setting, not a status indicator
 * of the current scheme.
 *
 * Accessibility:
 *   - `aria-label` exposes the action ("Toggle theme") so screen readers
 *     announce intent regardless of the icon.
 *   - `title` doubles up the action with the currently-selected mode for
 *     sighted-but-cautious users hovering to confirm.
 *   - The cycle order is deterministic and announced via aria-label
 *     suffix, so successive clicks remain predictable.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Third-party Libraries ---
// @eikon:feature(i18n) begin
import { useTranslation } from 'react-i18next';
// @eikon:feature(i18n) end
import { Monitor, Moon, Sun } from 'lucide-react';

// --- Absolute Imports ---
import { useThemeStore, type Theme } from '@/shared/theme';
import { Button } from '@/shared/ui/button';

// =================================================================================================
// Helpers
// =================================================================================================

const ICONS: Record<Theme, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

// =================================================================================================
// Component
// =================================================================================================

function ThemeToggle() {
  // @eikon:feature(i18n) begin
  const { t } = useTranslation();
  // @eikon:feature(i18n) end

  // @eikon:feature(i18n:fallback) begin
  // const t = (_k: string, opts?: { defaultValue?: string }) =>
  //   opts?.defaultValue ?? _k;
  // @eikon:feature(i18n:fallback) end

  const theme = useThemeStore((s) => s.theme);
  const cycleTheme = useThemeStore((s) => s.cycleTheme);

  const Icon = ICONS[theme];
  const action = t('actions.toggleTheme', { defaultValue: 'Toggle theme' });
  const modeLabel = t(`theme.${theme}`, {
    defaultValue:
      theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'System',
  });

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={cycleTheme}
      aria-label={`${action} (${modeLabel})`}
      title={`${action} — ${modeLabel}`}
      // Shrink the stock icon button (h-9 w-9) one notch so it lines up
      // visually with the h-8 LanguageSwitcher next to it in the header.
      className="h-8 w-8"
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
    </Button>
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export { ThemeToggle };
