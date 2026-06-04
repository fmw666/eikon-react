/**
 * @file variant-types.ts
 * @description Shared type/value contracts for the strip pipeline. Kept in a
 * leaf module (no fs, no imports) so `strip-features.ts`, `prune.ts`, and the
 * preview simulator can all depend on them without an import cycle.
 * `strip-features.ts` re-exports every name here so existing
 * `from './strip-features'` imports keep working unchanged.
 */

/**
 * Variant selections — one value per axis (design / layout / ui). The schema
 * is intentionally open (`Record<string, string>`) so new axes can be added
 * here without touching strip-features beyond the marker grammar.
 */
export type VariantSelections = Record<string, string>;

export const DEFAULT_VARIANTS: VariantSelections = {
  platform: 'web',
  design: 'default',
  layout: 'stacked',
  ui: 'animate-ui',
  toastPosition: 'top-right',
};

/**
 * Optional knobs that bypass the default strip behaviour.
 *
 * All of these knobs exist for the in-repo preview playground; every other
 * caller (the CLI, the e2e suite) leaves them at their defaults so
 * end-user projects get the fully-stripped tree.
 *
 *   - `keepAllVariantFiles`: skip the `@eikon:variant(<axis>=<value>) file`
 *     first-line strip so every variant sibling stays on disk (all 4
 *     `*RootLayout.tsx`, …). Block-level variant markers still apply,
 *     so dispatchers like `app/layouts/RootLayout.tsx` continue to
 *     narrow to the user's chosen value — variant selection in the
 *     playground still drives the rendered global UI.
 *
 *   - `keepShells`: keep the `apps/desktop/` (Tauri) and `apps/mobile/`
 *     (Capacitor) directories regardless of the chosen platform, and
 *     skip the `prunePackageScripts` pass that drops the `tauri:*` /
 *     `cap:*` scripts from `package.json`. The preview playground never
 *     runs Tauri/Capacitor itself (it only does a Vite web build), so
 *     the shell directories are inert — we keep them so the same cache
 *     entry can serve every platform without rebuilding the directory
 *     tree, and so the playground's "View source" panel can show users
 *     what the shells look like.
 *
 *   - `keepAllVariants`: a list of axis names whose block-level AND
 *     file-level variant markers should be skipped. Used by the preview
 *     playground for axes the template handles at *runtime* —
 *     `design` / `ui` (CSS class), `layout` (React Context),
 *     `toastPosition` (component state). For those axes the playground
 *     wants every value's source to coexist in the build so the iframe
 *     can switch with no rebuild; the template's own runtime dispatch
 *     picks one. CLI users pass nothing → every axis is stripped to
 *     the chosen value, exactly as before.
 *
 *     `platform` is intentionally NOT runtime-switchable — its blocks
 *     gate things like the `apple-mobile-web-app-capable` meta tag
 *     and `--touch-target-min` token that aren't safe to coexist —
 *     so callers pass `['design','ui','layout','toastPosition']`
 *     rather than a blanket boolean.
 */
export interface StripOptions {
  keepAllVariantFiles?: boolean;
  keepShells?: boolean;
  keepAllVariants?: ReadonlyArray<string>;
}
