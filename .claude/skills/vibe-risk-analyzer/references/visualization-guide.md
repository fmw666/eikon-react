# Dependency Visualization Guide (Phase 6)

A text report tells you *what* is wrong. A dependency graph shows you *where* the
structural problems live and how they connect — making refactoring decisions visceral
instead of abstract.

> **v3 change:** The default output mode is now **static SVG/PNG** saved to a
> project-relative `.vibe-risk/` directory (cross-platform: works on Windows,
> macOS, Linux, and cloud), so cloud agents, CI pipelines, and PR attachments
> can consume the graph without an interactive localhost server. Interactive
> mode is opt-in via `--interactive`.
>
> **Output path convention:** default to `.vibe-risk/dependency-graph.svg`
> (relative to the project root — create the dir first). On a cloud agent with a
> dedicated artifacts mount, you may override to that absolute path instead
> (e.g. `/opt/cursor/artifacts/dependency-graph.svg`). Never hardcode an
> absolute POSIX path on Windows.

---

## Default (v3): Static SVG via madge

Static graphs are environment-agnostic, embeddable in reports/PRs, and don't
require a human to open a browser.

### Standard command

```bash
# create the output dir first (cross-platform, project-relative)
mkdir -p .vibe-risk
npx madge \
  --image .vibe-risk/dependency-graph.svg \
  --extensions js,ts,jsx,tsx \
  src/
```

On Windows (PowerShell):

```powershell
New-Item -ItemType Directory -Force .vibe-risk | Out-Null
npx madge --image .vibe-risk/dependency-graph.svg --extensions js,ts,jsx,tsx src/
```

Requires Graphviz (`dot`). Install:

```bash
# Debian/Ubuntu
sudo apt-get install -y graphviz

# macOS
brew install graphviz

# Windows (choco / winget / scoop)
choco install graphviz   # or: winget install graphviz   # or: scoop install graphviz
```

### With circular highlight

```bash
npx madge --circular --extensions js,ts,jsx,tsx src/ > .vibe-risk/circular-deps.txt
npx madge --image .vibe-risk/dependency-graph.svg --extensions js,ts,jsx,tsx src/
```

### Fallback — Mermaid text graph

If Graphviz is unavailable:

```bash
# Produce a JSON adjacency list, then render as Mermaid
npx madge --json --extensions js,ts,jsx,tsx src/ > .vibe-risk/deps.json
```

Then convert top-20 most-connected nodes to a Mermaid `flowchart` block and
embed it inline in the report (it renders in GitHub, Cursor, etc.).

---

## Opt-in: Interactive skott webapp

Use when the user is local and explicitly wants to explore interactively.

### When to offer interactive mode

- User is running the skill on their own machine (not in CI / cloud agent)
- User explicitly asks for "interactive graph", "explore dependencies", etc.
- The static SVG is too dense to read and interactive zoom/filter would help

### Launch commands

```bash
# Full codebase
npx skott --displayMode=webapp --trackThirdPartyDependencies

# Scoped to src/
npx skott --displayMode=webapp --trackThirdPartyDependencies --cwd=src

# With ignore patterns
npx skott --displayMode=webapp --trackThirdPartyDependencies \
  --ignorePattern="**/*.test.*" \
  --ignorePattern="**/*.spec.*" \
  --ignorePattern="**/locales/**"
```

### Per-framework recommendations

| Framework | Recommended flags |
|-----------|------------------|
| Next.js (App Router) | `--cwd=src` (avoids scanning config files at root) |
| React SPA (Vite/CRA) | `--cwd=src` |
| Vue / Nuxt | `--cwd=src` |
| Express / Fastify API | no `--cwd` (scan from root) |
| Monorepo (single pkg) | `--cwd=packages/my-pkg` |

### Entrypoint mode (focused analysis)

```bash
npx skott src/app/layout.js --displayMode=webapp --trackThirdPartyDependencies
```

### skott capabilities recap

- Built-in webapp on localhost (port 3001 by default)
- Circular dependency detection with visual highlighting
- File size metadata on every node
- Dead file detection (orphan nodes with no incoming edges)
- Unused npm dependency detection
- Watch mode — graph updates live as files change
- TypeScript path alias support (resolves `@/` → `src/`)
- Incremental analysis for large codebases (`.skott/cache.json`)

---

## Connecting scan findings to visual patterns

The power of Phase 6 is bridging the numbers from the report to spatial intuition.
Guide the user on what to look for based on the scan results.

### God files → High fan-in + high fan-out nodes

Nodes with many connections in both directions are likely god files — heavily
depended upon AND depending on many other things. A clear SRP violation.

**Refactoring approach**: Extract outgoing dependencies into shared utilities first
(reduces fan-out), then split the file along responsibility boundaries.

### Circular dependencies → Visible cycles

skott highlights circular chains (and `madge --circular` lists them textually).
These create tight coupling that makes it impossible to safely change one file
without cascading effects.

**Refactoring approach**: Break cycles by extracting shared logic into a new module
that both files can import, or by using dependency injection / event patterns.

### Dead code → Orphan nodes

Nodes with no incoming edges (nothing imports them) are dead files.

**Action**: Verify they're truly unused (check for dynamic imports, test references,
CLI entry points, config references), then delete them.

### Architecture violations → Cross-layer arrows

Unexpected dependency directions reveal broken boundaries:

- Components importing from API routes (should go through a service layer)
- Utility files importing from feature-specific modules (inverted dependency)
- Deep imports across unrelated feature domains

**Action**: Introduce clear architectural boundaries. Consider `dependency-cruiser`
rules to enforce them in CI.

### Dependency clusters → Natural module boundaries

Groups of tightly interconnected nodes that are loosely connected to the rest
indicate natural feature boundaries.

**Action**: These clusters can become feature folders, module boundaries, or
even separate packages in a monorepo migration.

### Hub nodes → Single points of failure

A node that many others depend on is a "hub". If it has bugs, changes frequently,
or is poorly tested, risk cascades across the entire codebase.

**Action**: Ensure hub files are well-tested, stable, and have clear interfaces.
Split if the hub has multiple responsibilities.

---

## Refactoring order (safe to risky)

The graph directly informs the safest refactoring sequence:

1. **Dead files** — delete first (zero risk, immediate cleanup)
2. **Leaf nodes** — files with no dependents, refactor freely
3. **Low fan-in files** — few dependents, low blast radius
4. **Circular dependency breakers** — break one cycle at a time
5. **Hub files** — highest risk, save for last, need tests first

### Graph density as risk indicator

| Visual pattern | Refactoring complexity | Strategy |
|---------------|----------------------|----------|
| Sparse graph, isolated clusters | Low | Refactor per-cluster independently |
| Dense clusters with clear gaps | Medium | Respect cluster boundaries, refactor one at a time |
| Dense hairball, no clear structure | High | Untangle incrementally, don't attempt big-bang rewrite |

---

## Post-refactoring: architecture enforcement

After using the visualization to plan and execute refactoring, set up ongoing
boundary enforcement so the architecture doesn't drift back:

```bash
npm i -D dependency-cruiser
npx depcruise --init
```

Define rules like:

```json
{
  "forbidden": [
    {
      "name": "no-components-to-api",
      "from": { "path": "^src/components" },
      "to": { "path": "^src/app/api" }
    }
  ]
}
```

Add `npx depcruise src/ --config` to CI so violations are caught automatically.

---

## Which mode to run?

| Context | Mode | Command |
|---------|------|---------|
| Cloud agent / CI / PR | **Static SVG (default)** | `npx madge --image ... src/` |
| Human local dev | Interactive | `npx skott --displayMode=webapp --cwd=src` |
| Monorepo package | Static SVG, scoped | `npx madge --image ... packages/my-pkg/` |
| Environments without Graphviz | Mermaid fallback | `npx madge --json src/` + manual render |
| User has no time to explore | Static SVG | `npx madge --image ...` |

**Default decision in Phase 6:** Always generate the static SVG to
`.vibe-risk/dependency-graph.svg` (project-relative). On a cloud agent with a
dedicated artifacts mount you may override to that absolute path. Additionally
ask the user *only when running locally*: *"Launch the interactive graph as
well?"*

---

## Fallback chain

If the default command fails:

1. **No Graphviz installed** → try `brew install graphviz` / `apt install graphviz`.
   If not installable, fall back to JSON + Mermaid.
2. **madge fails to resolve imports** → add `--tsconfig tsconfig.json` flag (TS projects).
3. **Project uses non-standard path aliases** → use skott with `--cwd` instead.
4. **Still failing** → produce text-only "top 20 most connected files" table from
   the Phase 1 Step 2 data and note the visualization failure in the report.
