/**
 * @file index.ts
 * @description Public API barrel for the Examples feature.
 *
 * Examples is a DEV-ONLY feature, but the source ships with every
 * scaffold so users can explore the showcase locally with `npm run dev`.
 * What keeps it out of production bundles is the runtime gate at the
 * consumer site: `app/router.tsx` wraps the routes in
 * `import.meta.env.DEV ? examplesRoutes : null`. Vite's `define` inlines
 * DEV as `false` for production builds (`pnpm build`), so the
 * conditional collapses to `null` and the routes never match.
 *
 * The preview playground builds the template with `mode: 'development'`,
 * which keeps that gate open inside its iframe and renders the
 * showcase routes for in-browser preview.
 *
 * The `@eikon:feature(examples)` markers across the tree are now inert
 * (no consumer adds 'examples' to strip-features' disabled set), but
 * they're left in place as documentation and as a ready hook should
 * the strip ever need to come back.
 */

// =================================================================================================
// Exports
// =================================================================================================

export { examplesRoutes } from './routes';
