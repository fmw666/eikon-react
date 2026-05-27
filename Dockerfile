# syntax=docker/dockerfile:1.7
#
# Production image for @eikon/preview.
#
# Two stages — both based on node:20-slim:
#   1. `builder` installs the full pnpm workspace (incl. devDeps because
#      `vite`, `@vitejs/plugin-react`, `tsup`, etc. are needed at build
#      time AND at runtime — `viteBuild()` is invoked from the running
#      server). Then it builds:
#        - packages/preview-site/dist        (React shell, via vite)
#        - packages/preview-site/dist-server (Node server, via tsup)
#   2. `runner` carries the entire built workspace plus `node_modules`,
#      and starts the prod server.
#
# WHY we keep `node_modules` whole instead of installing `--prod`:
#   At runtime, `server/builder.ts` calls `viteBuild()` against a copy
#   of `packages/template-react/`. Vite resolves the template's
#   dependencies (incl. `@tailwindcss/vite`, `@vitejs/plugin-react`,
#   `tailwindcss`, etc. — currently in template-react's devDeps) by
#   walking up node_modules from the cache dir. A `--prod` install
#   would strip those symlinks and the build would crash with
#   "Cannot find module" on the first user request.
#
# Image size note: ~1.2-1.5 GB is expected. This is a build-as-a-service
# image, not a static page. If size matters later, the next optimisation
# is to re-jig template-react's deps so the build-relevant packages are
# in `dependencies` and switch the runtime stage to `pnpm install --prod`.

FROM node:20-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

# ---------------------------------------------------------------------------
# Stage 1 — install + build
# ---------------------------------------------------------------------------
FROM base AS builder

# Copy the manifests first so changes to source code don't bust the
# (slow) `pnpm install` layer. Every package.json + the nested
# template-react workspace need to be present for the install to
# resolve the full graph.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/preview-site/package.json packages/preview-site/
COPY packages/template-react/package.json packages/template-react/
COPY packages/template-react/pnpm-workspace.yaml packages/template-react/
COPY packages/template-react/apps/desktop/package.json packages/template-react/apps/desktop/
COPY packages/template-react/apps/mobile/package.json packages/template-react/apps/mobile/
COPY packages/create-eikon-react/package.json packages/create-eikon-react/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# Now copy the rest of the source. A code change beyond this line still
# replays only the build steps below, not the install layer.
COPY . .

# Vite shell + tsup-bundled prod server. `build:all` does both in
# sequence so a future bumping of either side stays in lock-step.
RUN pnpm --filter @eikon/preview build:all

# Pre-bake the single max-capability preview shell so first-paint on any
# deployed URL hits a hot cache. Playground params are runtime state now;
# file/code truth comes from simulate-strip rather than separate Vite
# builds. Pre-baked dirs land in
# packages/template-react/.preview-cache/<hash>/ and survive the
# `COPY --from=builder /app /app` in the runner stage. See
# `packages/preview-site/scripts/prebuild-variants.ts` for the enumeration.
RUN pnpm --filter @eikon/preview prebuild-variants

# ---------------------------------------------------------------------------
# Stage 2 — minimal runtime
# ---------------------------------------------------------------------------
FROM base AS runner

ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0

# We bring the entire built workspace because the runtime calls
# `viteBuild()` against template-react/, which needs both its source
# and its node_modules. See the file-header note for why `--prod`
# would break this.
COPY --from=builder /app /app

# Match Fly's documented internal_port. The actual port is read from
# `process.env.PORT` so this is just informational.
EXPOSE 8080

# Healthz keeps Fly's autoscaler honest: the route is implemented
# directly in `server/prod.ts` and just returns 200 OK.
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

WORKDIR /app/packages/preview-site
CMD ["node", "dist-server/prod.js"]
