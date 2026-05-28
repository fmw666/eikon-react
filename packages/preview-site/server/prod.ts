/**
 * @file prod.ts
 * @description Production HTTP server for the deployed preview-site.
 *
 * In `pnpm dev`, the playground is served by Vite's dev server with
 * `previewBuildPlugin` mounted (see `middleware.ts`). For a deployed Fly
 * machine we don't have Vite's dev server in front of us, so this file
 * stands up a minimal Node `http` listener that:
 *
 *   1. Mounts the same `/api/*` and `/preview/<hash>/*` handlers from
 *      `handlers.ts` — playground behaviour stays identical to dev.
 *   2. Serves the built React shell out of `packages/preview-site/dist/`
 *      with sensible cache headers (1y immutable for fingerprinted
 *      assets, no-store for HTML so deploys take effect on next nav).
 *   3. Falls back to `dist/index.html` for unknown extensionless paths
 *      so the client-side router (`src/landing/nav/route.ts`) can take
 *      over for `/changelog`, `/playground`, etc.
 *   4. Pre-warms the default-combo template build so the first user to
 *      hit the playground iframe doesn't pay a full cold build.
 *
 * Layout assumption (post-tsup): this file ends up at
 *   packages/preview-site/dist-server/prod.js
 * and reads static assets from `../dist` (i.e. preview-site/dist/). Both
 * directories sit next to each other inside the same package, so the
 * relative path is stable across local builds and the Fly image.
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { stat, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

import {
  handleBuild,
  handleBuildStatus,
  handleClearCache,
  handleFileContent,
  handleFilesTree,
  handleMetrics,
  handlePreviewServe,
  handleTemplateRev,
  isPreviewPath,
  prewarmDefault,
} from './handlers';
import { scrubHalfBuiltCacheDirs, TEMPLATE_REACT_DIR } from './builder';
import { getTemplateRev } from './fingerprint';
import { logEvent } from './log';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Static dist of the built React shell. Resolved relative to the compiled
 * server file so the same code works whether `prod.js` was emitted by
 * tsup into `dist-server/` or invoked directly from `server/` during
 * local sanity-checks.
 */
const STATIC_DIR = path.resolve(__dirname, '..', 'dist');

const PORT = Number(process.env.PORT ?? 8080);
const HOST = process.env.HOST ?? '0.0.0.0';

const log = (msg: string): void => {
  console.log(`[preview] ${msg}`);
};

function mimeFor(p: string): string {
  const ext = path.extname(p).toLowerCase();
  switch (ext) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
    case '.mjs':
      return 'application/javascript; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.svg':
      return 'image/svg+xml';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.ico':
      return 'image/x-icon';
    case '.woff':
      return 'font/woff';
    case '.woff2':
      return 'font/woff2';
    case '.map':
      return 'application/json';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Vite emits hashed filenames into `assets/`, so anything under that
 * prefix is safe to mark immutable for a year. Top-level HTML and the
 * favicon stay no-store so a deploy takes effect on the next page nav.
 */
function cacheHeaderFor(urlPath: string): string {
  if (urlPath.startsWith('/assets/')) {
    return 'public, max-age=31536000, immutable';
  }
  return 'no-store';
}

async function serveStatic(
  urlPath: string,
  res: ServerResponse
): Promise<boolean> {
  const rel = urlPath === '/' ? '/index.html' : urlPath;
  const requested = path.normalize(path.join(STATIC_DIR, rel));
  if (
    requested !== STATIC_DIR &&
    !requested.startsWith(STATIC_DIR + path.sep)
  ) {
    res.statusCode = 403;
    res.end('Forbidden');
    return true;
  }
  try {
    const st = await stat(requested);
    if (!st.isFile()) return false;
    const data = await readFile(requested);
    res.setHeader('Content-Type', mimeFor(requested));
    res.setHeader('Cache-Control', cacheHeaderFor(urlPath));
    res.end(data);
    return true;
  } catch {
    return false;
  }
}

/**
 * SPA fallback. Triggered when the static lookup misses AND the path is
 * extensionless (e.g. `/changelog`, `/playground`). Returns the same
 * `dist/index.html` so React boots and the client-side router resolves
 * the route. Anything with a file extension that misses gets a real 404.
 */
async function serveSpaFallback(
  urlPath: string,
  res: ServerResponse
): Promise<void> {
  if (path.extname(urlPath)) {
    res.statusCode = 404;
    res.end('Not found');
    return;
  }
  try {
    const data = await readFile(path.join(STATIC_DIR, 'index.html'));
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(data);
  } catch {
    res.statusCode = 500;
    res.end('Static dist not found — did `pnpm build:preview` run?');
  }
}

async function dispatch(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const url = req.url ?? '/';
  // Strip query string for routing; handlers re-parse what they need.
  const pathname = url.split('?', 1)[0]!;

  // -- API routes (exact prefix match, mirroring the Vite plugin) ------
  if (pathname === '/api/template-rev') return handleTemplateRev(req, res);
  if (pathname === '/api/build') return handleBuild(req, res);
  if (pathname === '/api/build-status') return handleBuildStatus(req, res);
  if (pathname === '/api/files-tree') return handleFilesTree(req, res);
  if (pathname === '/api/file-content') return handleFileContent(req, res);
  if (pathname === '/api/clear-cache') return handleClearCache(req, res);

  // -- Operator endpoints ----------------------------------------------
  if (pathname === '/metrics') return handleMetrics(req, res);

  // -- /preview/<hash>/* iframe content --------------------------------
  if (isPreviewPath(url)) {
    await handlePreviewServe(req, res);
    return;
  }

  // -- Liveness probe used by Fly's HTTP health check ------------------
  if (pathname === '/healthz') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    if (!bootReady) {
      // Fly's health check polls /healthz on `interval = "15s"` with a
      // 45 s `grace_period` (fly.toml). During boot we still need to
      // run `scrubHalfBuiltCacheDirs` before any /api/build can land
      // safely — without that, a leftover dist/index.html from a prior
      // boot's mid-build crash would falsely satisfy `isReady()`. Reply
      // 503 until scrub finishes so Fly's first probe correctly sees a
      // not-yet-ready machine; after scrub, every subsequent probe
      // gets 200.
      res.statusCode = 503;
      res.end('booting');
      return;
    }
    if (bootDegraded) {
      // Service is functional (handles /api/build on demand), but the
      // boot pre-warm errored out so the cold-start path is
      // un-prewarmed. Fly should still consider us healthy enough to
      // route traffic to — operator visibility is the only goal here.
      res.end('degraded');
      return;
    }
    res.end('ok');
    return;
  }

  // -- Static dist + SPA fallback --------------------------------------
  const served = await serveStatic(pathname, res);
  if (!served) await serveSpaFallback(pathname, res);
}

const server = createServer((req, res) => {
  // Stamp every request with an `x-request-id` header so log lines
  // emitted from any handler can be correlated by an operator running
  // `fly logs | grep <reqId>`. Honours an inbound id if Fly's edge
  // attached one (forward compatibility), otherwise mints a UUID.
  const incoming = req.headers['x-request-id'];
  const requestId =
    typeof incoming === 'string' && incoming.length > 0
      ? incoming
      : randomUUID();
  res.setHeader('x-request-id', requestId);

  // P4.25: tag every unhandled-error log line with method+URL so a
  // failure in production can be traced back to the exact route that
  // triggered it. The structured logger now also carries the request
  // id, so operators can `fly logs | grep <reqId>` for the full trail.
  dispatch(req, res).catch((e: unknown) => {
    logEvent('http_unhandled', {
      request_id: requestId,
      method: req.method ?? '?',
      url: req.url ?? '?',
      error_message: e instanceof Error ? e.message : String(e),
      ...(e instanceof Error && e.stack ? { error_stack: e.stack } : {}),
    });
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('Internal Server Error');
    } else {
      res.end();
    }
  });
});

/**
 * Boot-state flags consulted by `/healthz`. Audit close-out: previously
 * /healthz unconditionally returned 200 the moment listen() succeeded —
 * even if the boot scrub hadn't finished and a leftover half-built dir
 * could still flash through `isReady()`, and even if `prewarmDefault`
 * silently threw and left the machine serving 500 on every /api/build.
 *
 *  - `bootReady` flips true after `scrubHalfBuiltCacheDirs` resolves.
 *    /healthz returns 503 until then so Fly's grace-period probes see
 *    the machine come up cleanly.
 *  - `bootDegraded` flips true if the warm-cache pre-bake threw. The
 *    machine is still functional (every /api/build can run on demand);
 *    the flag exists so operators can grep `fly logs` for "degraded"
 *    after a deploy and decide whether to investigate.
 */
let bootReady = false;
let bootDegraded = false;

server.listen(PORT, HOST, () => {
  log(`listening on http://${HOST}:${PORT}`);
  log(`static dist: ${STATIC_DIR}`);
  // Boot-time integrity sweep: a previous boot may have crashed mid-build,
  // leaving a `dist/index.html` without a `.build-ok` marker. Such a cache
  // entry would falsely satisfy `isReady()` and serve a half-built bundle.
  // Audit close-out: scrub MUST flip `bootReady` before /healthz starts
  // returning 200; doing scrub-first (and gating /healthz behind it)
  // guarantees no /api/build can land on a half-built cache during the
  // window between listen() and scrub completion.
  scrubHalfBuiltCacheDirs()
    .then((removed) => {
      if (removed.length > 0) {
        log(`scrubbed ${removed.length} half-built cache dir(s): ${removed.join(', ')}`);
      }
    })
    .catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      log(`scrub failed (non-fatal): ${msg}`);
    })
    .finally(() => {
      bootReady = true;
      log('bootReady=true');
    });
  // P4.10: pre-warm the template-rev so the first /api/build (often
  // fired before prewarmDefault completes) doesn't pay the ~50–200ms
  // tree walk in its critical path. Fire-and-forget — failures show
  // up as the on-demand path catching up.
  getTemplateRev(TEMPLATE_REACT_DIR)
    .then((rev) => log(`template-rev: ${rev}`))
    .catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      log(`template-rev pre-warm failed: ${msg}`);
    });
  // Best-effort warm of the default combo so the first /api/build lands
  // on a hot cache. Fire-and-forget; failures flip `bootDegraded` so
  // operators can spot un-prewarmed machines in `fly logs`.
  Promise.resolve(prewarmDefault(log)).catch((e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e);
    bootDegraded = true;
    log(`prewarmDefault failed (machine is degraded but functional): ${msg}`);
  });
});

// Fly sends SIGTERM when migrating / scaling down. Drain in-flight
// requests cleanly so users don't see truncated responses.
//
// Audit close-out: the prior 10 s blanket cap could SIGKILL a viteBuild
// mid-`writeFile`, leaving exactly the half-built dir that
// `scrubHalfBuiltCacheDirs` is designed to clean up — circular
// dependency between deploy and recovery. The new budget is
// `BUILD_TIMEOUT_MS + 5 s` (currently 65 s), giving the longest legal
// build a chance to finish writing its `.build-ok` marker. After that,
// hard exit — the recovery scrub on next boot picks up anything
// genuinely orphaned.
const SHUTDOWN_BUDGET_MS = 65_000;
const shutdown = (signal: string): void => {
  log(`${signal} received, draining...`);
  server.close((err) => {
    if (err) log(`close error: ${err.message}`);
    process.exit(err ? 1 : 0);
  });
  setTimeout(() => process.exit(1), SHUTDOWN_BUDGET_MS).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
