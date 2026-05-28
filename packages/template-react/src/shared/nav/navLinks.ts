/**
 * @file navLinks.ts
 * @description Single source of truth for the global nav menu shape and
 * entries. Consumed by the **five full-nav layouts** in
 * `src/app/layouts/*RootLayout.tsx`:
 *
 *   - StackedRootLayout
 *   - SidebarRootLayout
 *   - TopbarSidebarRootLayout
 *   - CenteredRootLayout
 *   - MobileDrawerRootLayout
 *
 * Adding or renaming an item here updates all five simultaneously,
 * with no hand-mirrored arrays. The two BottomTabs layouts
 * (`BottomTabsRootLayout`, `BottomTabsFabRootLayout`) use their own
 * curated `tabs[]` arrays inline — bottom-tab UIs deliberately show a
 * smaller, hand-picked subset of routes, so they're intentionally not
 * driven by this file. If a route should appear in BottomTabs too,
 * also add it to those layouts' inline arrays.
 *
 * The icons are rendered only by `MobileDrawerRootLayout`; the other
 * four full-nav layouts read `to`, `key`, `fallback`, `end` and ignore
 * the icon field.
 *
 * Adding a feature with a top-level route: append one entry here, add
 * the matching `nav.<key>` translation in `shared/i18n/locales/{en,zh}/common.json`,
 * and that's the whole layout-side wire-up for the full-nav layouts.
 */

import {
  CheckSquare,
  Home,
  Plus,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

export interface NavLinkSpec {
  /** Router path the entry navigates to. */
  to: string;
  /** i18n key for the label (under the `nav.*` namespace). */
  key: string;
  /** Fallback label when the i18n key is missing. */
  fallback: string;
  /**
   * NavLink `end` prop — true for the root path so it doesn't stay
   * highlighted on every nested route. Optional; absent for non-root
   * entries.
   */
  end?: boolean;
  /**
   * Icon, rendered only by `MobileDrawerRootLayout`. The other four
   * layouts ignore this field (they're text-only nav rows). Required
   * so the mobile drawer's `<Icon … />` JSX never resolves to
   * undefined; tree-shaking still drops the icon from non-mobile
   * scaffolds when their layout file is the only consumer.
   */
  icon: LucideIcon;
}

/**
 * The full nav menu. Order is the rendered order. The `examples` entry
 * is gated on `import.meta.env.DEV` so production scaffolds drop it
 * automatically — matches the corresponding gate in `app/router.tsx`.
 */
export const navLinks: NavLinkSpec[] = [
  { to: '/', key: 'nav.home', fallback: 'Home', icon: Home, end: true },
  { to: '/counter', key: 'nav.counter', fallback: 'Counter', icon: Plus },
  { to: '/tasks', key: 'nav.tasks', fallback: 'Tasks', icon: CheckSquare },
  ...(import.meta.env.DEV
    ? [
        {
          to: '/examples',
          key: 'nav.examples',
          fallback: 'Examples',
          icon: Sparkles,
        },
      ]
    : []),
];
