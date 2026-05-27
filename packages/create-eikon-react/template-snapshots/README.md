# template-snapshots/

Pre-baked upstream UI library component sets, used by `--ui shadcn` and
`--ui animate-ui` at scaffold time.

## Layout

```
template-snapshots/
├── shadcn/
│   ├── src/shared/ui/      ← .tsx files copied from the shadcn registry
│   ├── components.json     ← placed at scaffolded project root
│   └── package-deps.json   ← merged into scaffolded project's package.json
└── animate-ui/
    ├── src/shared/ui/
    ├── components.json
    └── package-deps.json
```

## Populating / refreshing

The committed contents of this directory are produced by
`scripts/sync-ui-snapshots.mjs`, which drives the upstream `shadcn` /
`animate-ui` registries against a temp project and harvests the
results.

```bash
pnpm sync-ui-snapshots
```

Requires:
- Internet access (registry endpoints)
- `npx` (bundled with Node)

After running, review the diff with `git diff template-snapshots/` and
commit if the upstream changes look intentional. Snapshots ship to npm
as part of the `create-eikon-react` package — never auto-sync as part
of CI / publish, so changes get a human review pass.

## Why pre-baked vs fetch-at-scaffold

- **Offline scaffolds keep working** (pnpm dlx, air-gapped CI).
- **Reproducibility**: `npx create-eikon-react@1.4.2 ...` always lays
  down the same files, regardless of what the registry serves today.
- **Review surface**: upstream churn is reviewed by maintainers via PR,
  not encountered by random users at scaffold time.

## What lives where

- The seven primitives the snapshot OWNS (declared in
  `src/apply-ui-snapshot.ts:REPLACEABLE_UI_FILES`):
  `button.tsx`, `dialog.tsx`, `tabs.tsx`, `sheet.tsx`, `command.tsx`,
  `card.tsx`, `toaster.tsx`.
- Anything else under `src/shared/ui/` (e.g. `theme-toggle.tsx`,
  `language-switcher.tsx`) is project-authored and survives untouched
  across all `--ui` choices.
