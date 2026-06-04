/**
 * @file handlers.ts
 * @description Platform-agnostic HTTP request handlers for the preview-site
 * playground API. Both the Vite dev plugin (server/middleware.ts) and the
 * production Node server (server/prod.ts) mount these on top of their
 * respective request pipelines so the playground behaviour stays identical
 * across `pnpm dev` and a deployed Fly machine.
 *
 * Each exported handler is a plain `(req, res) => Promise<void>` function
 * that reads its inputs from the URL / request body, writes its response,
 * and never throws (errors are surfaced as 4xx/5xx responses). The Vite
 * `Connect.IncomingMessage` extends Node's `http.IncomingMessage`, so using
 * the narrower http type lets the same handlers serve both call sites
 * without a type cast.
 *
 * The supporting layers were split out of this file so it reads as pure
 * routing:
 *   - response assembly + bounded body parsing → `http-response.ts`
 *   - file-tree building                        → `file-tree.ts`
 *   - strip-simulator LRU caches                → `sim-cache.ts`
 *   - `/api/build` body normalization           → `build-inputs.ts`
 *   - `/preview/<hash>/...` static serving       → `preview-serve.ts`
 * Per-process state (the sim caches) is fine — the dev plugin and prod
 * server each instantiate one process.
 */

import { type IncomingMessage, type ServerResponse } from 'node:http';

import {
  clearAllCache,
  DEFAULT_INPUTS,
  ensureBuild,
  isReady,
  getError,
  TEMPLATE_REACT_DIR,
} from './builder';
import { getTemplateRev } from './fingerprint';
import {
  simulateStripFileContent,
  simulateStripTree,
} from './simulate-strip';
import { renderText } from './metrics';
import { readJsonBody, sendJson, sendServerError } from './http-response';
import { pathsToTree } from './file-tree';
import { normalizeInputs, type BuildRequestBody } from './build-inputs';
import {
  clearSimTreeCache,
  readSimContent,
  readSimInputs,
  readSimTree,
  rememberSimContent,
  rememberSimTree,
  simContentKey,
  simKey,
} from './sim-cache';

// Re-exported (the imported binding above) so the dev plugin
// (`middleware.ts`) keeps importing the watcher's cache-invalidation hook
// from the handlers barrel even though its implementation now lives in
// `sim-cache.ts`.
export { clearSimTreeCache };

// Re-exported so `middleware.ts` / `prod.ts` keep importing the
// `/preview/<hash>/...` route and its variant helpers from the handlers
// barrel even though the implementation now lives in `preview-serve.ts`.
export {
  handlePreviewServe,
  isPreviewPath,
  readVariantsFromUrl,
} from './preview-serve';

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------
//
// Endpoint contract (kept identical to the dev-server plugin so the React
// shell sees the same wire format whether it's loaded from `pnpm dev` or
// from the deployed Fly machine):
//
//   GET  /api/template-rev                              -> { rev }
//   POST /api/build           { ...params }            -> { hash, status }
//   GET  /api/build-status?hash=...                     -> { hash, status }
//   GET  /api/files-tree?<6 params>                     -> { tree }
//   GET  /api/file-content?<6 params>&path=...          -> { path, size, text }
//   POST /api/clear-cache                               -> { ok: true }
//   GET  /preview/<hash>/<file?>                        -> static file or SPA fallback
//
// Status is one of 'ready' | 'building' | 'error'. The shell polls
// /api/build-status until 'ready' then sets iframe.src to /preview/<hash>/.
// The `files-tree` / `file-content` pair are cache-decoupled (Phase F):
// they take the raw 6-tuple of params and run `simulateStrip*` to produce
// what `npx create-eikon-react --<args>` would emit, without ever touching
// the per-hash dist directory.

export async function handleTemplateRev(
  _req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  try {
    const rev = await getTemplateRev(TEMPLATE_REACT_DIR);
    sendJson(res, { rev });
  } catch (e) {
    sendServerError(res, e);
  }
}

export async function handleBuild(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end('POST only');
    return;
  }
  try {
    const body = (await readJsonBody(req)) as BuildRequestBody;
    const inputs = normalizeInputs(body);
    const state = await ensureBuild(inputs);
    sendJson(res, state);
  } catch (e) {
    sendServerError(res, e);
  }
}

export function handleBuildStatus(
  req: IncomingMessage,
  res: ServerResponse
): void {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const hash = url.searchParams.get('hash') ?? '';
  if (!hash) {
    res.statusCode = 400;
    res.end('hash query param required');
    return;
  }
  if (isReady(hash)) {
    sendJson(res, { hash, status: 'ready' });
    return;
  }
  const err = getError(hash);
  if (err) {
    sendJson(res, { hash, status: 'error', error: err });
    return;
  }
  sendJson(res, { hash, status: 'building' });
}

// ---------------------------------------------------------------------------
// /api/files-tree + /api/file-content — input-driven, cache-decoupled
// ---------------------------------------------------------------------------
//
// Phase F: the files panel no longer follows the build cache. Instead the
// shell calls these two endpoints with the raw 6-tuple of params; the
// server uses `simulateStripTree` / `simulateStripFileContent` (wrapped in
// the LRU caches from `sim-cache.ts`) to produce what
// `npx create-eikon-react --<args>` would have made — without ever touching
// the per-hash cacheDir. Switching design / ui / layout / toastPosition hits
// these handlers in milliseconds since the underlying work is all in-memory
// regex + a small fs walk of `template-react/`.

export async function handleFilesTree(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const inputs = readSimInputs(url);
  const key = simKey(inputs);
  try {
    let paths = readSimTree(key);
    if (!paths) {
      paths = await simulateStripTree(inputs);
      rememberSimTree(key, paths);
    }
    sendJson(res, { tree: pathsToTree(paths) });
  } catch (e) {
    sendServerError(res, e);
  }
}

export async function handleFileContent(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const inputs = readSimInputs(url);
  const rel = url.searchParams.get('path') ?? '';
  if (!rel) {
    res.statusCode = 400;
    res.end('path query param required');
    return;
  }
  // Reject path traversal — the simulator only reads from
  // TEMPLATE_REACT_DIR, but we reject empty / parent-escaping inputs at
  // the edge so a malformed query never reaches the fs.
  if (rel.includes('..') || rel.startsWith('/') || rel.includes('\\')) {
    res.statusCode = 400;
    res.end('Invalid path');
    return;
  }
  try {
    const cacheKey = simContentKey(inputs, rel);
    let text = readSimContent(cacheKey);
    if (text === undefined) {
      text = await simulateStripFileContent(rel, inputs);
      rememberSimContent(cacheKey, text);
    }
    if (text === null) {
      res.statusCode = 404;
      res.end('Not found (stripped under current inputs)');
      return;
    }
    sendJson(res, { path: rel, size: Buffer.byteLength(text, 'utf8'), text });
  } catch (e) {
    sendServerError(res, e);
  }
}

export async function handleClearCache(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end('POST only');
    return;
  }
  await clearAllCache();
  clearSimTreeCache();
  sendJson(res, { ok: true });
}

/**
 * Plain-text metrics endpoint. One `key=value` line per counter or
 * observation so `curl /metrics | grep build_` is the operator UX.
 * Not Prometheus textfmt — keep the surface tiny until a scraper
 * actually shows up that needs the proper exposition format.
 */
export function handleMetrics(_req: IncomingMessage, res: ServerResponse): void {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(renderText());
}

/**
 * Kick off a default-combo build immediately so the very first user
 * request lands on a warm cache. Both the dev plugin and the prod server
 * call this at boot; it never throws — failures are logged via the
 * passed-in logger so a broken default doesn't take the process down.
 */
export function prewarmDefault(
  log: (msg: string) => void = (m) => console.warn(m)
): void {
  void ensureBuild(DEFAULT_INPUTS).catch((e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e);
    log(`[preview] default pre-warm failed: ${msg}`);
  });
}
