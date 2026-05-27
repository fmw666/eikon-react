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
 * Handlers held the `treeCache` Map as a closure inside `previewBuildPlugin`
 * before the extraction; here it's module-level state, matching what
 * `builder.ts` already does for `inflight` / `errors`. Per-process state
 * is fine — the dev plugin and prod server each instantiate one process.
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

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    let aborted = false;
    req.on('data', (c: Buffer) => {
      if (aborted) return;
      total += c.length;
      // P4.9: reject runaway POST bodies before they accumulate in
      // memory. The legitimate /api/build / /api/clear-cache payloads
      // are tiny (≤200 bytes); 64KB is generous headroom that still
      // closes the trivial DoS where a client uploads megabytes of
      // junk to /api/build to inflate the server's resident memory.
      if (total > MAX_BODY_BYTES) {
        aborted = true;
        const err = new Error(
          `request body exceeded ${MAX_BODY_BYTES} bytes`
        );
        (err as { statusCode?: number }).statusCode = 413;
        reject(err);
        // Best-effort: stop accumulating and detach. We can't cleanly
        // close the underlying socket from here without races, so the
        // outer handler returns the 413 response and the connection
        // tears down naturally.
        req.removeAllListeners('data');
        req.removeAllListeners('end');
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      if (aborted) return;
      try {
        const s = Buffer.concat(chunks).toString('utf8') || '{}';
        resolve(JSON.parse(s));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

const MAX_BODY_BYTES = 64 * 1024;

/**
 * P4.19: Send a 5xx response without leaking server internals. The raw
 * error (with stack frames including absolute paths and line numbers)
 * goes to the server log; the client sees a stable, opaque message.
 * The optional statusCode on the error lets `readJsonBody` signal 413
 * (body too large) without the caller needing to inspect the message.
 */
function sendServerError(
  res: ServerResponse,
  e: unknown,
  fallback = 'Internal Server Error'
): void {
  const detail = e instanceof Error ? (e.stack ?? e.message) : String(e);
  console.warn(`[handlers] ${detail}`);
  const status =
    e &&
    typeof e === 'object' &&
    typeof (e as { statusCode?: number }).statusCode === 'number'
      ? (e as { statusCode: number }).statusCode
      : 500;
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end(status === 413 ? 'Payload too large' : fallback);
}

function sendJson(res: ServerResponse, body: unknown): void {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

interface FileNode {
  /** Path-from-template-root used as a stable id; e.g. 'src/app/providers.tsx'. */
  id: string;
  name: string;
  type: 'dir' | 'file';
  children?: FileNode[];
}

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
// server uses `simulateStripTree` / `simulateStripFileContent` to produce
// what `npx create-eikon-react --<args>` would have made — without ever
// touching the per-hash cacheDir. Switching design / ui / layout /
// toastPosition hits these handlers in milliseconds since the underlying
// work is all in-memory regex + a small fs walk of `template-react/`.

interface SimInputs {
  platform: string;
  supabase: boolean;
  pm: string;
  design: string;
  layout: string;
  ui: string;
  toastPosition: string;
}

function readSimInputs(url: URL): SimInputs {
  const q = url.searchParams;
  return {
    platform: q.get('platform') ?? DEFAULT_INPUTS.platform,
    supabase: q.get('supabase') === 'true',
    pm: q.get('pm') ?? DEFAULT_INPUTS.pm,
    design: q.get('design') ?? DEFAULT_INPUTS.design,
    layout: q.get('layout') ?? DEFAULT_INPUTS.layout,
    ui: q.get('ui') ?? DEFAULT_INPUTS.ui,
    toastPosition: q.get('toastPosition') ?? DEFAULT_INPUTS.toastPosition,
  };
}

function simKey(inputs: SimInputs): string {
  // Stable order — JSON.stringify on an object literal preserves
  // insertion order, and TS `interface` fields land in declaration order.
  return JSON.stringify(inputs);
}

/** LRU cache on the simulated tree response. Entries are tiny
 *  (POSIX paths in an array → on the order of 100KB even for the full
 *  template) and the only invalidation lever is template-rev change,
 *  which the watcher / fingerprint flow already drives. We simply drop
 *  every entry whenever the watcher sees a template change.
 *
 *  P4.12: Implemented as Map-with-bump for true LRU semantics.
 *  Map preserves insertion order; deleting and re-setting on hit
 *  bumps the entry to the most-recent position so the eviction step
 *  (drop the FIRST key) actually drops the LEAST-recently-used. */
const simTreeCache = new Map<string, string[]>();
const SIM_TREE_CACHE_MAX = 32;

function readSimTree(key: string): string[] | undefined {
  const v = simTreeCache.get(key);
  if (v !== undefined) {
    // Bump on hit: re-insert so this key is now newest.
    simTreeCache.delete(key);
    simTreeCache.set(key, v);
  }
  return v;
}

function rememberSimTree(key: string, tree: string[]): void {
  // Same delete-then-set pattern even on first insert — keeps the bump
  // path identical and means there's a single code path that maintains
  // ordering.
  simTreeCache.delete(key);
  simTreeCache.set(key, tree);
  if (simTreeCache.size > SIM_TREE_CACHE_MAX) {
    const oldest = simTreeCache.keys().next().value as string | undefined;
    if (oldest) simTreeCache.delete(oldest);
  }
}

/**
 * P4.13: file-content cache. Same key strategy as simTreeCache plus
 * the relative path. Users opening the same file across rapid param
 * changes (common: clicking through 3-4 design presets to compare
 * `index.css`) hit this cache instead of re-running the per-file
 * regex strip + fs read. Entries are individual file contents (≤a
 * few KB each), so MAX=128 keeps total cache size bounded ≪1MB.
 *
 * `null` is cached too (file legitimately stripped under these
 * inputs) to prevent the same param/path from re-walking the strip
 * decision repeatedly.
 */
const simContentCache = new Map<string, string | null>();
const SIM_CONTENT_CACHE_MAX = 128;

function simContentKey(inputs: SimInputs, relPath: string): string {
  return `${simKey(inputs)} ${relPath}`;
}

function readSimContent(key: string): string | null | undefined {
  if (!simContentCache.has(key)) return undefined;
  const v = simContentCache.get(key) ?? null;
  simContentCache.delete(key);
  simContentCache.set(key, v);
  return v;
}

function rememberSimContent(key: string, value: string | null): void {
  simContentCache.delete(key);
  simContentCache.set(key, value);
  if (simContentCache.size > SIM_CONTENT_CACHE_MAX) {
    const oldest = simContentCache.keys().next().value as string | undefined;
    if (oldest) simContentCache.delete(oldest);
  }
}

/**
 * Invalidate the simulator's tree + content caches. Called by the dev
 * plugin's file watcher when template-react changes; production never
 * hits this because the template is baked into the image.
 */
export function clearSimTreeCache(): void {
  simTreeCache.clear();
  simContentCache.clear();
}

/**
 * Convert a flat list of POSIX-relative paths into the nested
 * `FileNode[]` shape the existing shell-side tree renderer expects.
 * Sorted dirs-before-files, case-insensitive — matches `readTree`.
 */
function pathsToTree(paths: ReadonlyArray<string>): FileNode[] {
  interface DirAcc {
    children: Map<string, DirAcc | true>;
  }
  const root: DirAcc = { children: new Map() };
  for (const p of paths) {
    const parts = p.split('/');
    let cur: DirAcc = root;
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i]!;
      const isLeaf = i === parts.length - 1;
      const existing = cur.children.get(name);
      if (isLeaf) {
        if (existing === undefined) cur.children.set(name, true);
        // If a dir exists with the same name, that's a paths bug —
        // skip silently; the structure tests would catch it.
      } else {
        if (existing === true) {
          // Same name appeared once as file, now as dir — ignore the
          // file leaf. Shouldn't happen for real templates.
          const dir: DirAcc = { children: new Map() };
          cur.children.set(name, dir);
          cur = dir;
        } else if (existing === undefined) {
          const dir: DirAcc = { children: new Map() };
          cur.children.set(name, dir);
          cur = dir;
        } else {
          cur = existing;
        }
      }
    }
  }
  function emit(acc: DirAcc, prefix: string): FileNode[] {
    const dirs: FileNode[] = [];
    const files: FileNode[] = [];
    for (const [name, val] of acc.children) {
      const id = prefix ? `${prefix}/${name}` : name;
      if (val === true) {
        files.push({ id, name, type: 'file' });
      } else {
        dirs.push({ id, name, type: 'dir', children: emit(val, id) });
      }
    }
    const cmp = (a: FileNode, b: FileNode) =>
      a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
    return [...dirs.sort(cmp), ...files.sort(cmp)];
  }
  return emit(root, '');
}

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

const PREVIEW_PATH_RE = /^\/preview\/([0-9a-f]{6,64})(\/.*)?$/;

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
 */
function readVariantsFromUrl(rawUrl: string): VariantSelections {
  const u = new URL(rawUrl, 'http://localhost');
  const out: VariantSelections = {};
  const d = u.searchParams.get('__eikonDesign');
  const i = u.searchParams.get('__eikonUi');
  const l = u.searchParams.get('__eikonLayout');
  if (d) out.design = d;
  if (i) out.ui = i;
  if (l) out.layout = l;
  return out;
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
      res.setHeader('Cache-Control', 'no-store');
      res.end(stamped);
    } else {
      res.setHeader('Content-Type', mime);
      res.setHeader('Cache-Control', 'no-store');
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
