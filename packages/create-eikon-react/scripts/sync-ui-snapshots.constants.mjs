/**
 * @file sync-ui-snapshots.constants.mjs
 * @description Internal constant/data tables for `sync-ui-snapshots.mjs`.
 *   Not a public entry point — imported only by the sibling sync script
 *   and its co-located helper modules. The seven+ canonical primitives
 *   here must stay in lock-step with
 *   `apply-ui-snapshot.ts:REPLACEABLE_UI_FILES`.
 *
 *   NOTE: `COMPONENTS` and `ANIMATE_UI_REGISTRY_MAP` intentionally stay
 *   inline in `sync-ui-snapshots.mjs` (not here) — the parity test in
 *   `ui-snapshot-parity.test.ts` reads them by source-text search from
 *   that file.
 */

// Map upstream basename → our canonical basename. shadcn ships sonner.tsx,
// animate-ui ships sonner.tsx — we normalise to toaster.tsx because the
// rest of the template imports `@/shared/ui/toaster`.
export const FILENAME_REWRITE = {
  'sonner.tsx': 'toaster.tsx',
};

// Minimal components.json each temp project needs so the registry CLI
// knows where to write files. We use the same alias shape as the real
// scaffolded project so the harvested files don't need rewriting.
export const COMPONENTS_JSON = {
  $schema: 'https://ui.shadcn.com/schema.json',
  style: 'new-york',
  rsc: false,
  tsx: true,
  tailwind: {
    config: '',
    css: 'src/styles/index.css',
    baseColor: 'neutral',
    cssVariables: true,
    prefix: '',
  },
  aliases: {
    components: '@/shared/ui',
    utils: '@/shared/lib/cn',
    ui: '@/shared/ui',
    lib: '@/shared/lib',
    hooks: '@/shared/hooks',
  },
};

// Animate-UI native components live under src/components/animate-ui/...
// rather than src/shared/ui/. To keep the template's `@/shared/ui/<name>`
// imports working, we generate a thin re-export shim per native component
// at src/shared/ui/<name>.tsx that just `export * from` the nested file.
// This is option A from the design discussion — keeps animate-ui's
// internal layering intact (it imports primitives via
// `@/components/animate-ui/primitives/...` and we don't fight that),
// while still letting the rest of the template say `import { Button }
// from '@/shared/ui/button'`. Components animate-ui doesn't ship
// (card/command/toaster) come from the shadcn fallback and land at
// src/shared/ui/ directly — no shim needed there.
export const ANIMATE_UI_NATIVE_TARGETS = {
  'button.tsx': 'components/animate-ui/components/buttons/button',
  'dialog.tsx': 'components/animate-ui/components/radix/dialog',
  'tabs.tsx': 'components/animate-ui/components/radix/tabs',
  'sheet.tsx': 'components/animate-ui/components/radix/sheet',
};

// Mark known type-only re-exports as `type`-imports — needed under
// `verbatimModuleSyntax: true` (TS1484). The list is hard-coded
// rather than inferred because regex-level type-vs-value detection
// is unreliable; if upstream adds a new type-only name, the e2e
// typecheck will flag it and we extend this list.
export const TYPE_ONLY_IMPORT_NAMES = ['WithAsChild'];
