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

import {
  handleBuild,
  handleBuildStatus,
  handleClearCache,
  handleFileContent,
  handleFilesTree,
  handlePreviewServe,
  handleTemplateRev,
  isPreviewPath,
  prewarmDefault,
} from './handlers';
import { scrubHalfBuiltCacheDirs, TEMPLATE_REACT_DIR } from './builder';
import { getTemplateRev } from './fingerprint';

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

  // -- /preview/<hash>/* iframe content --------------------------------
  if (isPreviewPath(url)) {
    await handlePreviewServe(req, res);
    return;
  }

  // -- Liveness probe used by Fly's HTTP health check ------------------
  if (pathname === '/healthz') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('ok');
    return;
  }

  // -- Static dist + SPA fallback --------------------------------------
  const served = await serveStatic(pathname, res);
  if (!served) await serveSpaFallback(pathname, res);
}

const server = createServer((req, res) => {
  // P4.25: tag every unhandled-error log line with method+URL so a
  // failure in production can be traced back to the exact route that
  // triggered it. The `log()` function already prefixes a wallclock
  // timestamp; combined with the URL this gives a usable structured
  // line for `fly logs | grep`.
  dispatch(req, res).catch((e: unknown) => {
    const msg = e instanceof Error ? (e.stack ?? e.message) : String(e);
    log(`unhandled error [${req.method ?? '?'} ${req.url ?? '?'}]: ${msg}`);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('Internal Server Error');
    } else {
      res.end();
    }
  });
});

server.listen(PORT, HOST, () => {
  log(`listening on http://${HOST}:${PORT}`);
  log(`static dist: ${STATIC_DIR}`);
  // Boot-time integrity sweep: a previous boot may have crashed mid-build,
  // leaving a `dist/index.html` without a `.build-ok` marker. Such a cache
  // entry would falsely satisfy `isReady()` and serve a half-built bundle.
  // Remove them before any request can find them.
  scrubHalfBuiltCacheDirs()
    .then((removed) => {
      if (removed.length > 0) {
        log(`scrubbed ${removed.length} half-built cache dir(s): ${removed.join(', ')}`);
      }
    })
    .catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      log(`scrub failed (non-fatal): ${msg}`);
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
  // on a hot cache. Fire-and-forget; failures only show in logs.
  prewarmDefault(log);
});

// Fly sends SIGTERM when migrating / scaling down. Drain in-flight
// requests cleanly so users don't see truncated responses.
const shutdown = (signal: string): void => {
  log(`${signal} received, draining...`);
  server.close((err) => {
    if (err) log(`close error: ${err.message}`);
    process.exit(err ? 1 : 0);
  });
  // Hard cap so a stuck connection can't keep the process alive forever.
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
