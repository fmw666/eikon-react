/**
 * @file index.ts
 * @description Public API barrel for the Examples feature.
 *
 * Examples is a DEV-ONLY feature. Two orthogonal gates keep it out of
 * end-user bundles:
 *
 *   1. The barrel still exports `examplesRoutes` unconditionally, but
 *      the consumer in `app/router.tsx` wraps it in
 *      `import.meta.env.DEV ? examplesRoutes : null`. Vite's `define`
 *      inlines DEV as `false` for production builds (`pnpm build`), so
 *      the conditional collapses to `null` and the routes never match.
 *   2. The CLI strips the entire `src/features/examples/` directory and
 *      its consumers from scaffolded projects via the
 *      `@eikon:feature(examples)` markers, so end users never see this
 *      code at all.
 *
 * The preview playground keeps the directory (`keepExamples: true`) and
 * builds the template with `mode: 'development'`, which keeps both gates
 * open inside its iframe.
 */

// =================================================================================================
// Exports
// =================================================================================================

export { examplesRoutes } from './routes';
