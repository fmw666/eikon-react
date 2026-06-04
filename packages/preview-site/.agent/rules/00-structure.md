---
id: structure
title: preview-site structure & boundaries
description: Top-level module boundaries (shell / landing / server / lib), per-file size budget, and the dynamic-import rule that keeps route loaders off the static Nav edge.
applies_to: ["src/**", "server/**"]
severity: must
---

# Structure

`@eikon/preview` (the playground) is **not** shipped to end users — it is a UX
layer over `template-react` and the strip engine. It splits into four
top-level modules, each with a distinct cost profile and lifecycle:

```
packages/preview-site/
├── server/        # Node side: strip engine, Vite builder, watcher, metrics.
│                  #   Runs in Node only. NEVER imported by browser code.
├── src/
│   ├── shell/     # The playground app itself: <iframe> preview, file tree,
│   │              #   code view, params panel, device shells. Entry: main.tsx.
│   ├── landing/   # Marketing site: hero, sections, nav, changelog, footer.
│   │              #   The page a visitor lands on; embeds the playground.
│   ├── lib/       # Shell-agnostic helpers shared by shell + landing
│   │              #   (params schema/store/url, cli-command, github).
│   └── styles/    # Tailwind v4 entry + global CSS. Side-effect import only.
```

## Module boundaries

`shell`, `landing`, and `server` are peers; `lib` is the only leaf both UI
modules may freely share. The directions that matter:

1. **`server/` is Node-only.** Browser code under `src/**` must never import
   from `server/`. The strip/build engine touches `fs`, `chokidar`, and the
   live `template-react/` tree — none of which exist in the iframe bundle.
2. **`src/lib/` is leaf-level.** It must not import from `shell/` or
   `landing/`. If a `lib` helper "needs" a shell/landing symbol, the helper is
   miscategorised — move it up into the consumer, or push the shared piece
   down into `lib`.
3. **`landing/` embeds the playground; `shell/` does not reach back into
   `landing/`.** The playground shell stands alone (it can mount inside the
   landing page or in isolation), so it must not import landing sections,
   nav, or changelog.

When a boundary feels wrong, the fix is almost always to **demote** the shared
logic into `src/lib/` rather than to cross a peer boundary.

## Per-file size budget

Components stay small enough that an agent can hold a whole file in context
and a human can review it in one pass:

- A component file (`*.tsx`) should stay **under ~500 LOC / ~2000 tokens**.
- When a section/shell outgrows the budget, split it into a sibling folder
  (`<feature>/` with internal parts + a thin parent), the way
  `landing/sections/footer/`, `landing/sections/platform-picker/`, and
  `shell/device-shell/` already do. Keep the extracted parts **internal** —
  re-export only the public component from the folder `index.ts`.

## Route loaders must be dynamic

`landing/LandingPage.tsx` imports `nav/Nav.tsx`. The lazy route bundles
(`PlaygroundPage`, `changelog/ChangelogPage`) are reached **both** by
`LandingPage` (via `React.lazy`) **and** by `Nav` (via `ROUTE_PREFETCH` on
hover). To keep the same chunk-promise identity *and* to avoid a static
import edge that loops back through Nav → LandingPage, the loaders in
`landing/nav/route-loaders.ts` use `() => import('…')` exclusively. A static
`import` of a route page from `route-loaders.ts` (or from `Nav`) would pull
the entire LandingPage tree into the initial bundle and create a cycle.

## Prohibitions (grep-verifiable)

Concrete `❌` rules, each with a backticked pattern you can `rg` over
`packages/preview-site/`. Use `-P` for the look-ahead patterns.

- ❌ PR-PV-001: `from '../../server/...'` / `from '@server/...'` in any
  `src/**` file — browser code must not import the Node strip/build engine.
  rg (inside `src/`): `from ['"](?:\.\./)*server/`
- ❌ PR-PV-002: `from '../shell/...'` or `from '../landing/...'` inside
  `src/lib/**` — `lib` is leaf-level and must not depend on a UI module.
  rg (inside `src/lib/`): `from ['"]\.\./(?:shell|landing)/`
- ❌ PR-PV-003: `from '...landing/...'` inside `src/shell/**` — the playground
  shell must not reach back into the landing site. rg (inside `src/shell/`):
  `from ['"][^'"]*landing/`
- ❌ PR-PV-004: a **static** `import … from '../PlaygroundPage'` /
  `'../changelog/ChangelogPage'` in `route-loaders.ts` — route bundles are
  loaded only through `() => import(...)`. rg (in `landing/nav/route-loaders.ts`):
  `^\s*import\s.*(?:PlaygroundPage|ChangelogPage)`
- ❌ PR-PV-005: a route page imported statically by the Nav — `Nav.tsx` may
  reference loaders only through `ROUTE_PREFETCH`, never the page modules
  directly. rg (in `landing/nav/Nav.tsx`):
  `^\s*import\s.*(?:PlaygroundPage|ChangelogPage)`
