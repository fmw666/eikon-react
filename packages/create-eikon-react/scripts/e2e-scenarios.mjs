// Scenario table for the create-eikon-react e2e harness (scripts/e2e.mjs).
//
// Each entry describes one CLI invocation (flags / package manager) plus
// an `expect` block of post-scaffold assertions consumed by
// verifyScenario() in ./e2e-verify.mjs. This is plain data — kept in its
// own module so e2e.mjs stays focused on orchestration. The inline
// comments documenting WHY each scenario asserts what it does are the
// load-bearing part; preserve them when editing.

export const SCENARIOS = [
  {
    // Default scaffold (platform=web, supabase off). TanStack Query is
    // baseline infrastructure now — every scaffold ships with it — so
    // this scenario doubles as the canonical "web minimal" smoke test:
    // it covers the web-specific stripping (no PWA meta, no capacitor
    // mode, no mobile safe-area utilities) alongside the dependency
    // assertions.
    id: 'default',
    projectName: 'eikon-e2e-default',
    flags: ['--no-supabase'],
    expect: {
      filesPresent: [
        'src/features/counter/index.ts',
        '.agent/README.md',
        // The `examples` feature is a DEV-only template showcase that
        // ships with EVERY scaffold. Production bundles stay clean via
        // the runtime `import.meta.env.DEV` gate in `app/router.tsx`,
        // not via scaffold-time stripping. Its two showcase deps
        // (web-vitals, @tanstack/react-virtual) ride along.
        'src/features/examples',
      ],
      // platform=web (default) drops the mobile-drawer Sheet primitive
      // and the `apps/*` workspace declaration.
      filesAbsent: [
        'src/shared/supabase',
        'src/shared/ui/sheet.tsx',
        'pnpm-workspace.yaml',
      ],
      depsPresent: [
        'react',
        'tailwindcss',
        'motion',
        '@tanstack/react-query',
        // showcase deps — kept in lock-step with src/features/examples
        '@tanstack/react-virtual',
        'web-vitals',
      ],
      depsAbsent: ['@supabase/supabase-js'],
      providersContains: [
        'BrowserRouter',
        '<Toaster',
        'QueryClientProvider',
        '@tanstack/react-query',
      ],
      providersAbsent: [],
      // Platform=web must not carry mobile-only PWA meta tags, CSS
      // tokens / utilities, or the capacitor mode branch in vite.
      htmlAbsent: [
        'apple-mobile-web-app-capable',
        'apple-mobile-web-app-status-bar-style',
        'mobile-web-app-capable',
      ],
      htmlContains: ['viewport-fit=cover'],
      stylesAbsent: ['--touch-target-min', '@utility safe-pt', '@utility safe-pb'],
      viteContains: ['_mode'],
      viteAbsent: ["'capacitor'", "mode === 'capacitor'"],
    },
  },
  {
    id: 'full',
    projectName: 'eikon-e2e-full',
    flags: ['--supabase'],
    expect: {
      filesPresent: [
        'src/features/counter/index.ts',
        'src/shared/supabase/client.ts',
        'src/features/examples',
      ],
      filesAbsent: [],
      depsPresent: [
        '@supabase/supabase-js',
        '@tanstack/react-query',
        '@tanstack/react-virtual',
        'web-vitals',
      ],
      depsAbsent: [],
      providersContains: ['QueryClientProvider'],
      providersAbsent: [],
    },
  },
  {
    // Platform=desktop scenario. Asserts the Tauri 2 shell survives, the
    // Capacitor shell is gone, package.json's tauri:* scripts are kept,
    // cap:* scripts are dropped, and __PROJECT_NAME__ is substituted.
    id: 'desktop',
    projectName: 'eikon-e2e-desktop',
    flags: ['--platform', 'desktop'],
    expect: {
      filesPresent: [
        'apps/desktop/src-tauri/Cargo.toml',
        'apps/desktop/src-tauri/tauri.conf.json',
        'apps/desktop/src-tauri/src/main.rs',
        'apps/desktop/package.json',
        // pnpm-workspace.yaml MUST survive on desktop — `tauri:dev` /
        // `tauri:build` rely on `pnpm --filter "./apps/desktop"`.
        'pnpm-workspace.yaml',
      ],
      // Desktop is still a "no mobile-drawer" scaffold (default layout
      // is sidebar), so sheet.tsx is gone. Mobile-only PWA / safe-area
      // / capacitor content is also dropped.
      filesAbsent: [
        'apps/mobile',
        'src/shared/supabase',
        'src/shared/ui/sheet.tsx',
      ],
      depsPresent: ['react'],
      depsAbsent: ['@supabase/supabase-js'],
      providersContains: [],
      providersAbsent: [],
      scriptsPresent: ['tauri', 'tauri:dev', 'tauri:build'],
      scriptsAbsent: ['cap', 'cap:sync', 'cap:add:ios', 'cap:add:android'],
      htmlAbsent: ['apple-mobile-web-app-capable', 'mobile-web-app-capable'],
      stylesAbsent: ['--touch-target-min', '@utility safe-pt'],
      viteAbsent: ["'capacitor'"],
      // Tauri config files use __PROJECT_NAME__ as a placeholder that
      // copyTemplate() rewrites to the chosen project name. Verify both
      // the substitution AND that the literal placeholder is gone.
      tauriConfContains: ['"productName": "eikon-e2e-desktop"'],
      tauriConfAbsent: ['__PROJECT_NAME__'],
      // Cargo.toml's `[package].name` is now the bare project name (no
      // `_app` suffix). The cdylib's `[lib].name` stays at `app_lib` so
      // main.rs's `app_lib::run()` continues to compile post-strip.
      cargoTomlContains: [
        'name = "eikon-e2e-desktop"',
        'name = "app_lib"',
      ],
      cargoTomlAbsent: ['__PROJECT_NAME__', 'eikon-e2e-desktop_app'],
    },
  },
  {
    // Platform=mobile scenario. Asserts the Capacitor shell survives,
    // the Tauri shell is gone, cap:* scripts kept, tauri:* dropped, and
    // __PROJECT_NAME__ substituted in capacitor.config.ts.
    id: 'mobile',
    projectName: 'eikon-e2e-mobile',
    flags: ['--platform', 'mobile'],
    expect: {
      filesPresent: [
        'apps/mobile/capacitor.config.ts',
        'apps/mobile/package.json',
        // Mobile defaults to layout=mobile-drawer, which IS the only
        // layout that uses src/shared/ui/sheet.tsx — so the file
        // must survive the strip pass on this scenario.
        'src/shared/ui/sheet.tsx',
        // Mobile uses pnpm --filter "./apps/mobile" for cap:* scripts.
        'pnpm-workspace.yaml',
      ],
      filesAbsent: ['apps/desktop', 'src/shared/supabase'],
      depsPresent: ['react'],
      depsAbsent: ['@supabase/supabase-js'],
      providersContains: [],
      providersAbsent: [],
      scriptsPresent: ['cap', 'cap:sync', 'cap:add:ios', 'cap:add:android'],
      scriptsAbsent: ['tauri', 'tauri:dev', 'tauri:build'],
      capacitorConfContains: ["appId: 'app.eikon.eikon-e2e-mobile'"],
      capacitorConfAbsent: ['__PROJECT_NAME__'],
      // Mobile keeps every mobile-only adaptation: PWA meta, safe-area
      // utilities, touch-target token, capacitor base branch.
      htmlContains: [
        'apple-mobile-web-app-capable',
        'mobile-web-app-capable',
        'viewport-fit=cover',
      ],
      stylesContains: ['--touch-target-min', '@utility safe-pt', '@utility safe-pb'],
      viteContains: ["_mode === 'capacitor'"],
      // Mobile platform also forces a mobile-default layout (`mobile-drawer`)
      // when the user doesn't specify one. The dispatcher should keep
      // only that variant block.
      rootLayoutContains: [
        'MobileDrawerRootLayout',
        '@eikon:variant(layout=mobile-drawer)',
      ],
      rootLayoutAbsent: [
        '@eikon:variant(layout=stacked)',
        '@eikon:variant(layout=sidebar)',
        'StackedRootLayout',
        'SidebarRootLayout',
      ],
    },
  },
  {
    // Same baseline as default but exercises every variant axis so the new
    // @eikon:variant(name=value) marker grammar is verified end-to-end.
    id: 'variants',
    projectName: 'eikon-e2e-variants',
    flags: [
      '--no-supabase',
      '--design',
      'linear',
      '--layout',
      'sidebar',
      '--ui',
      'custom',
      '--toast-position',
      'bottom-center',
    ],
    expect: {
      filesPresent: [
        'src/features/counter/index.ts',
        'src/shared/ui/toaster.tsx',
      ],
      filesAbsent: [
        'src/shared/supabase',
        // The toaster/ directory no longer exists — toast is a single file.
        'src/shared/ui/toaster',
        // layout=sidebar means the mobile-drawer Sheet primitive is dead.
        'src/shared/ui/sheet.tsx',
        // platform defaults to web here, so the workspace yaml is dropped.
        'pnpm-workspace.yaml',
      ],
      depsPresent: ['@tanstack/react-query'],
      depsAbsent: ['@supabase/supabase-js'],
      providersContains: [
        'QueryClientProvider',
        // Toast position lives in providers.tsx (not toaster.tsx) so the
        // shadcn/animate-ui registry snapshots can stay 1:1 with upstream
        // — strip-features must keep ONLY the chosen position's variant
        // block here and drop the others.
        '@eikon:variant(toastPosition=bottom-center)',
        "'bottom-center'",
      ],
      providersAbsent: [
        '@eikon:variant(toastPosition=top-right)',
        '@eikon:variant(toastPosition=top-center)',
        '@eikon:variant(toastPosition=bottom-right)',
      ],
      // Strip-features must keep ONLY the chosen variant block in
      // RootLayout.tsx. The dispatcher imports each sibling layout by
      // PascalCase name (SidebarRootLayout / StackedRootLayout / …), so
      // the surviving import is the most precise post-strip witness.
      rootLayoutContains: [
        'SidebarRootLayout',
        '@eikon:variant(layout=sidebar)',
      ],
      rootLayoutAbsent: [
        'StackedRootLayout',
        'TopbarSidebarRootLayout',
        'CenteredRootLayout',
        '@eikon:variant(layout=stacked)',
        '@eikon:variant(layout=topbar-sidebar)',
        '@eikon:variant(layout=centered)',
      ],
      // The CSS file should keep the chosen design block and drop the
      // non-chosen design palettes. The `ui` axis no longer emits CSS
      // markers — it's a scaffold-time file swap, asserted under the
      // `variants-shadcn` / `variants-animate-ui` scenarios via the
      // `src/shared/ui/*` layout itself.
      stylesContains: ['design=linear'],
      stylesAbsent: [
        'design=default',
        'design=apple',
        'design=anthropic',
        'design=vercel',
        'design=notion',
        'ui=animate-ui',
        'ui=shadcn',
        'ui=custom',
      ],
      // --ui custom keeps the project-authored Radix wrappers — the
      // template's own button.tsx ships unchanged. `sheet.tsx` is
      // omitted here because layout=sidebar strips it (already covered
      // in `filesAbsent` above).
      uiFilesPresent: [
        'src/shared/ui/button.tsx',
        'src/shared/ui/dialog.tsx',
        'src/shared/ui/tabs.tsx',
        'src/shared/ui/command.tsx',
        'src/shared/ui/card.tsx',
        'src/shared/ui/toaster.tsx',
        'src/shared/ui/theme-toggle.tsx',
        'src/shared/ui/language-switcher.tsx',
      ],
      // No components.json on --ui custom (it's a shadcn/animate-ui artefact).
      filesAbsentExtra: ['components.json'],
    },
  },
  {
    // --ui shadcn lays down the official shadcn registry components from
    // template-snapshots/shadcn/. The seven project-authored primitives
    // are deleted then refilled from the snapshot; theme-toggle /
    // language-switcher survive untouched because they live outside
    // `REPLACEABLE_UI_FILES`.
    id: 'variants-shadcn',
    projectName: 'eikon-e2e-variants-shadcn',
    flags: ['--no-supabase', '--ui', 'shadcn'],
    expect: {
      filesPresent: [
        'src/features/counter/index.ts',
        // components.json is shipped alongside the snapshot so future
        // `shadcn add` runs in the user's project Just Work.
        'components.json',
      ],
      filesAbsent: [
        'src/shared/supabase',
        'pnpm-workspace.yaml',
        // sheet.tsx carries `@eikon:variant(layout=mobile-drawer) file`,
        // so on the default desktop-app-shell layout the strip pass
        // removes it BEFORE applyUiSnapshot runs. Survivor-gating
        // (apply-ui-snapshot.ts) refuses to resurrect a primitive whose
        // template counterpart didn't survive — the snapshot's
        // `sheet.tsx` would import dead code, so it stays absent.
        'src/shared/ui/sheet.tsx',
      ],
      // shadcn pulls in `radix-ui` (the unified package) + `cmdk` +
      // `next-themes` + `sonner` via the registry. These come from the
      // snapshot's package-deps.json — assert at least the most
      // distinctive ones.
      depsPresent: [
        '@tanstack/react-query',
        'radix-ui',
        'sonner',
        'next-themes',
        'cmdk',
      ],
      depsAbsent: ['@supabase/supabase-js'],
      providersContains: ['QueryClientProvider'],
      providersAbsent: [],
      uiFilesPresent: [
        // Replaceable seven — refilled from snapshot. (sheet.tsx is in
        // `filesAbsent` because the default layout strips it before
        // the snapshot pass even sees it; see comment above.)
        'src/shared/ui/button.tsx',
        'src/shared/ui/dialog.tsx',
        'src/shared/ui/tabs.tsx',
        'src/shared/ui/command.tsx',
        'src/shared/ui/card.tsx',
        'src/shared/ui/toaster.tsx',
        // Non-replaceable — owned by the template across all `ui` choices.
        'src/shared/ui/theme-toggle.tsx',
        'src/shared/ui/language-switcher.tsx',
      ],
    },
  },
  {
    // --ui animate-ui lays down animate-ui's native components plus
    // shadcn fallbacks for primitives animate-ui doesn't ship
    // (card/command/toaster). Native components live under
    // `src/components/animate-ui/...` with thin re-export shims at
    // `src/shared/ui/<name>.tsx`.
    id: 'variants-animate-ui',
    projectName: 'eikon-e2e-variants-animate-ui',
    flags: ['--no-supabase', '--ui', 'animate-ui'],
    expect: {
      filesPresent: [
        'src/features/counter/index.ts',
        'components.json',
        // Native animate-ui directory — only present when ui=animate-ui.
        'src/components/animate-ui/components/buttons/button.tsx',
        'src/components/animate-ui/components/radix/dialog.tsx',
      ],
      filesAbsent: [
        'src/shared/supabase',
        'pnpm-workspace.yaml',
        // Layout-gated, see comment in variants-shadcn above.
        'src/shared/ui/sheet.tsx',
      ],
      depsPresent: [
        '@tanstack/react-query',
        'motion',
        'radix-ui',
        'sonner',
        'next-themes',
      ],
      depsAbsent: ['@supabase/supabase-js'],
      providersContains: ['QueryClientProvider'],
      providersAbsent: [],
      uiFilesPresent: [
        // Re-export shims at src/shared/ui — these point at the
        // native animate-ui components.
        'src/shared/ui/button.tsx',
        'src/shared/ui/dialog.tsx',
        'src/shared/ui/tabs.tsx',
        // Shadcn-fallback primitives (animate-ui doesn't ship these).
        'src/shared/ui/command.tsx',
        'src/shared/ui/card.tsx',
        'src/shared/ui/toaster.tsx',
        // Non-replaceable.
        'src/shared/ui/theme-toggle.tsx',
        'src/shared/ui/language-switcher.tsx',
      ],
    },
  },
  {
    // `--pm npm` rewrite: assert that the scaffolded package.json no longer
    // depends on pnpm anywhere — engines pin npm, packageManager declares
    // npm, and the aggregate scripts shell out via `npm run`. Workspace-
    // filter scripts are pnpm-only but they're already pruned on web
    // (this is a web scaffold), so there's nothing left to corrupt.
    id: 'pm-npm',
    projectName: 'eikon-e2e-pm-npm',
    pm: 'npm',
    flags: ['--no-supabase'],
    expect: {
      filesPresent: ['src/features/counter/index.ts'],
      filesAbsent: ['pnpm-workspace.yaml'],
      depsPresent: ['react', '@tanstack/react-query'],
      depsAbsent: ['@supabase/supabase-js'],
      providersContains: ['QueryClientProvider'],
      providersAbsent: [],
      enginesEquals: { node: '>=20.10.0', npm: '>=10.0.0' },
      packageManagerEquals: 'npm@10.9.0',
      // Aggregate scripts must use `npm run`, not `pnpm run`. Non-aggregate
      // scripts (`dev`, `build`, `typecheck`) stay byte-identical because
      // the rewriter only touches `\bpnpm run\b`.
      scriptsContaining: {
        check: 'npm run typecheck',
        ci: 'npm run build',
      },
      scriptsNotContaining: {
        check: 'pnpm run',
        ci: 'pnpm run',
      },
    },
  },
  {
    // `--pm bun` rewrite: same shape as pm-npm but with bun's spec.
    id: 'pm-bun',
    projectName: 'eikon-e2e-pm-bun',
    pm: 'bun',
    flags: ['--no-supabase'],
    expect: {
      filesPresent: ['src/features/counter/index.ts'],
      filesAbsent: ['pnpm-workspace.yaml'],
      depsPresent: ['react', '@tanstack/react-query'],
      depsAbsent: ['@supabase/supabase-js'],
      providersContains: ['QueryClientProvider'],
      providersAbsent: [],
      enginesEquals: { node: '>=20.10.0', bun: '>=1.1.0' },
      packageManagerEquals: 'bun@1.1.30',
      scriptsContaining: {
        check: 'bun run typecheck',
        ci: 'bun run build',
      },
      scriptsNotContaining: {
        check: 'pnpm run',
        ci: 'pnpm run',
      },
    },
  },
];
