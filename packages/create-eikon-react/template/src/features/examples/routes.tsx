/**
 * @file routes.tsx
 * @description Route declarations for the Examples feature.
 *
 * Every page is lazy-loaded so each showcase lands in its own chunk;
 * the router's shared <Suspense> boundary (see RootLayout) provides
 * the fallback.
 *
 * The page chunk and the `examples` i18n namespace are fetched IN
 * PARALLEL inside each `lazy()` — by the time a showcase page mounts,
 * both its JS and its translations are resident, so the user never
 * sees a flash of fallback keys.
 *
 * Note: this feature is mounted only in dev (see `app/router.tsx`).
 * The lazy chunks still exist in production builds (Rollup statically
 * analyses `import()` calls), but they're unreachable — no route ever
 * resolves to them.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import { lazy } from 'react';

// --- Core-related Libraries ---
import { Route } from 'react-router-dom';

// --- Absolute Imports ---
import { loadNamespace } from '@/shared/i18n';

// =================================================================================================
// Lazy pages
// =================================================================================================

const ExamplesIndexPage = lazy(async () => {
  const [mod] = await Promise.all([
    import('./pages/ExamplesIndexPage'),
    loadNamespace('examples'),
  ]);
  return { default: mod.ExamplesIndexPage };
});

const ToasterShowcasePage = lazy(async () => {
  const [mod] = await Promise.all([
    import('./pages/ToasterShowcasePage'),
    loadNamespace('examples'),
  ]);
  return { default: mod.ToasterShowcasePage };
});

const DialogShowcasePage = lazy(async () => {
  const [mod] = await Promise.all([
    import('./pages/DialogShowcasePage'),
    loadNamespace('examples'),
  ]);
  return { default: mod.DialogShowcasePage };
});

// @eikon:variant(layout=mobile-drawer) begin
const SheetShowcasePage = lazy(async () => {
  const [mod] = await Promise.all([
    import('./pages/SheetShowcasePage'),
    loadNamespace('examples'),
  ]);
  return { default: mod.SheetShowcasePage };
});
// @eikon:variant(layout=mobile-drawer) end

const CommandShowcasePage = lazy(async () => {
  const [mod] = await Promise.all([
    import('./pages/CommandShowcasePage'),
    loadNamespace('examples'),
  ]);
  return { default: mod.CommandShowcasePage };
});

const SignInModalShowcasePage = lazy(async () => {
  const [mod] = await Promise.all([
    import('./pages/SignInModalShowcasePage'),
    loadNamespace('examples'),
  ]);
  return { default: mod.SignInModalShowcasePage };
});

const MotionShowcasePage = lazy(async () => {
  const [mod] = await Promise.all([
    import('./pages/MotionShowcasePage'),
    loadNamespace('examples'),
  ]);
  return { default: mod.MotionShowcasePage };
});

const PerformanceShowcasePage = lazy(async () => {
  const [mod] = await Promise.all([
    import('./pages/PerformanceShowcasePage'),
    loadNamespace('examples'),
  ]);
  return { default: mod.PerformanceShowcasePage };
});

// =================================================================================================
// Exports
// =================================================================================================

export const examplesRoutes = (
  <>
    <Route path="/examples" element={<ExamplesIndexPage />} />
    <Route path="/examples/toaster" element={<ToasterShowcasePage />} />
    <Route path="/examples/dialog" element={<DialogShowcasePage />} />
    {/* @eikon:variant(layout=mobile-drawer) begin */}
    <Route path="/examples/sheet" element={<SheetShowcasePage />} />
    {/* @eikon:variant(layout=mobile-drawer) end */}
    <Route path="/examples/command" element={<CommandShowcasePage />} />
    <Route
      path="/examples/sign-in-modal"
      element={<SignInModalShowcasePage />}
    />
    <Route path="/examples/motion" element={<MotionShowcasePage />} />
    <Route
      path="/examples/performance"
      element={<PerformanceShowcasePage />}
    />
  </>
);
