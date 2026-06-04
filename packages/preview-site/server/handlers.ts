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
 * Per-process state (the sim caches) is fine — the dev plugin and prod
 * server each instantiate one process.
 */

import { readFile } from 'node:fs/promises';
import { type IncomingMessage, type ServerResponse } from 'node:http';
import path from 'node:path';

import {
  clearAllCache,
  DEFAULT_INPUTS,
  ensureBuild,
  getDistDir,
  isReady,
  getError,
  TEMPLATE_REACT_DIR,
  touchHashServed,
} from './builder';
import { getTemplateRev } from './fingerprint';
import { type BuildInputs } from './hash';
import {
  simulateStripFileContent,
  simulateStripTree,
} from './simulate-strip';
import { rewriteHtmlOpenTag } from '../../create-eikon-react/src/inject-html-variants';
import { type VariantSelections } from '../../create-eikon-react/src/strip-features';
import { getParam } from '../src/lib/params-schema';
import { renderText } from './metrics';
import { mimeFor, readJsonBody, sendJson, sendServerError } from './http-response';
import { pathsToTree } from './file-tree';
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

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

interface BuildRequestBody {
  platform?: string;
  supabase?: boolean;
  pm?: string;
  design?: string;
  layout?: string;
  ui?: string;
  toastPosition?: string;
}

function normalizeInputs(body: BuildRequestBody): BuildInputs {
  return {
    platform: String(body.platform ?? DEFAULT_INPUTS.platform),
    supabase:
      body.supabase === undefined ? DEFAULT_INPUTS.supabase : !!body.supabase,
    pm: String(body.pm ?? DEFAULT_INPUTS.pm),
    design: String(body.design ?? DEFAULT_INPUTS.design),
    layout: String(body.layout ?? DEFAULT_INPUTS.layout),
    ui: String(body.ui ?? DEFAULT_INPUTS.ui),
    toastPosition: String(body.toastPosition ?? DEFAULT_INPUTS.toastPosition),
  };
}

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

// `hash.ts` slices `hashBuildInputs` output to 12 hex characters; this
// regex pins to that exact length so a crafted /preview/abcdef/ request
// (shorter than any real hash) cannot poison the `lastServed` map with
// a never-served entry. Audit close-out: previously accepted [6,64], a
// dead generosity range that left a Map-leak vector.
const PREVIEW_PATH_RE = /^\/preview\/([0-9a-f]{12})(\/.*)?$/;

/**
 * Pull the runtime axes the playground appended to `iframe.src` as
 * `__eikon*` query params. Used by `handlePreviewServe` to splice the
 * same `<html class data-…>` attributes onto the served HTML that
 * `inject-html-variants.ts` bakes onto a CLI scaffold — so the iframe's
 * first paint already reflects the user's chosen design / ui / layout
 * instead of relying on the postMessage round-trip that fires after
 * React mounts.
 *
 * Missing keys collapse to no-ops inside `rewriteHtmlOpenTag`
 * (it checks individual axes for truthy values), so a request that
 * arrives without any `__eikon*` params produces unchanged HTML —
 * matching the legacy behaviour for any caller that hasn't been taught
 * to attach the snapshot.
 *
 * Each value is validated against the schema's enum white-list before
 * being passed to `rewriteHtmlOpenTag` — `rewriteHtmlOpenTag` interpolates
 * its inputs straight into HTML attribute strings, so unsanitized URL
 * input would let a crafted `?__eikonDesign=x"><script>...` request break
 * out of the attribute. Unknown values silently drop, matching the
 * "missing key collapses to no-op" contract above.
 *
 * Exported for tests so the white-list behaviour can be asserted directly
 * without a full HTTP round-trip.
 */
export function readVariantsFromUrl(rawUrl: string): VariantSelections {
  const u = new URL(rawUrl, 'http://localhost');
  const out: VariantSelections = {};
  const d = validateAxisValue('design', u.searchParams.get('__eikonDesign'));
  const i = validateAxisValue('ui', u.searchParams.get('__eikonUi'));
  const l = validateAxisValue('layout', u.searchParams.get('__eikonLayout'));
  if (d) out.design = d;
  if (i) out.ui = i;
  if (l) out.layout = l;
  return out;
}

/**
 * Look the raw value up against `params-schema.PARAMS`'s enum for `axis`.
 * Returns the value when it's a known enum member, `undefined` otherwise.
 * Unknown / missing axes also return `undefined` — callers treat both as
 * "axis not specified".
 */
function validateAxisValue(
  axis: 'design' | 'ui' | 'layout',
  raw: string | null
): string | undefined {
  if (!raw) return undefined;
  const def = getParam(axis);
  if (!def || def.kind !== 'enum') return undefined;
  return def.values.includes(raw) ? raw : undefined;
}

/**
 * Decide whether a request URL belongs to the `/preview/<hash>/...` route.
 * Lets the prod server's static-file fallback skip these without a regex
 * test of its own.
 */
export function isPreviewPath(url: string): boolean {
  return PREVIEW_PATH_RE.test(url);
}

/**
 * Serve a file out of the per-hash dist directory. SPA-style: any
 * extensionless path falls back to `index.html` so the template-side
 * router (react-router et al.) can take over.
 *
 * Returns true if the request matched the /preview/ pattern (response
 * has been written, or 404 has been emitted), false otherwise so the
 * caller can fall through to its next route.
 */
export async function handlePreviewServe(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  if (!req.url) return false;
  const match = req.url.match(PREVIEW_PATH_RE);
  if (!match) return false;

  const hash = match[1]!;
  const rawRest = match[2] ?? '/';
  const rest = rawRest === '/' ? '/index.html' : rawRest;
  const dist = getDistDir(hash);

  // Mark this hash as actively in use so the LRU eviction in builder.ts
  // doesn't delete the cache dir while the iframe is still pulling
  // chunks / navigating SPA routes inside it. We touch BEFORE serving
  // so even a 404 (e.g. preview hash got evicted between page nav and
  // chunk fetch) refreshes the timestamp and lets the next eviction
  // pass keep the dir if a parallel rebuild is repopulating it.
  touchHashServed(hash);

  // Reject anything that tries to escape the dist directory.
  const requested = path.normalize(path.join(dist, rest));
  if (!requested.startsWith(dist)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return true;
  }

  try {
    const data = await readFile(requested);
    const mime = mimeFor(requested);
    if (mime.startsWith('text/html')) {
      // Stamp `<html>` with the variant attrs the playground appended to
      // iframe.src — same shape as a CLI scaffold's post-strip HTML, so
      // the cascade applies before any JS runs and there's no first-frame
      // flash on the user's chosen design / ui / layout.
      const variants = readVariantsFromUrl(req.url ?? '/');
      const stamped = rewriteHtmlOpenTag(data.toString('utf8'), variants);
      res.setHeader('Content-Type', mime);
      // HTML is variant-stamped per request, so we must NOT cache it —
      // a stamped `class="design-apple"` response would otherwise be
      // served to a later request that asked for a different design.
      res.setHeader('Cache-Control', 'no-store');
      res.end(stamped);
    } else {
      res.setHeader('Content-Type', mime);
      // Audit close-out: hashed Vite chunks under /preview/<hash>/assets/*
      // are content-addressed (the file basename includes a hash like
      // `index-CS6Z3agH.js`). They're truly immutable for the lifetime
      // of the parent build hash — serving them with `no-store` forced a
      // re-download on every iframe navigation. Match what `prod.ts`
      // already does for the top-level static dist (1y immutable).
      if (rest.startsWith('/assets/')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        res.setHeader('Cache-Control', 'no-store');
      }
      res.end(data);
    }
  } catch {
    // SPA fallback: any extensionless path (e.g. /preview/<h>/counter)
    // should boot the same index.html and let react-router handle it.
    if (!path.extname(rest)) {
      try {
        const data = await readFile(path.join(dist, 'index.html'));
        const variants = readVariantsFromUrl(req.url ?? '/');
        const stamped = rewriteHtmlOpenTag(data.toString('utf8'), variants);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(stamped);
        return true;
      } catch {
        // Fall through to 404 if even index.html is missing — i.e. the
        // build hasn't completed yet for this hash.
      }
    }
    res.statusCode = 404;
    res.end('Not found');
  }
  return true;
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
