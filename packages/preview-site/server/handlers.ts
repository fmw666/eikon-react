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

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

interface BuildRequestBody {
  platform?: string;
  supabase?: boolean;
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
    design: String(body.design ?? DEFAULT_INPUTS.design),
    layout: String(body.layout ?? DEFAULT_INPUTS.layout),
    ui: String(body.ui ?? DEFAULT_INPUTS.ui),
    toastPosition: String(body.toastPosition ?? DEFAULT_INPUTS.toastPosition),
  };
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
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
    res.statusCode = 500;
    res.end(e instanceof Error ? e.message : String(e));
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
    res.statusCode = 500;
    res.end(e instanceof Error ? e.message : String(e));
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

/** LRU-ish cache on the simulated tree response. Entries are tiny
 *  (POSIX paths in an array → on the order of 100KB even for the full
 *  template) and the only invalidation lever is template-rev change,
 *  which the watcher / fingerprint flow already drives. We simply drop
 *  every entry whenever the watcher sees a template change. */
const simTreeCache = new Map<string, string[]>();
const SIM_TREE_CACHE_MAX = 32;

function rememberSimTree(key: string, tree: string[]): void {
  simTreeCache.set(key, tree);
  if (simTreeCache.size > SIM_TREE_CACHE_MAX) {
    const oldest = simTreeCache.keys().next().value as string | undefined;
    if (oldest) simTreeCache.delete(oldest);
  }
}

/**
 * Invalidate the simulator's tree cache. Called by the dev plugin's
 * file watcher when template-react changes; production never hits this
 * because the template is baked into the image.
 */
export function clearSimTreeCache(): void {
  simTreeCache.clear();
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
    let paths = simTreeCache.get(key);
    if (!paths) {
      paths = await simulateStripTree(inputs);
      rememberSimTree(key, paths);
    }
    sendJson(res, { tree: pathsToTree(paths) });
  } catch (e) {
    res.statusCode = 500;
    res.end(e instanceof Error ? e.message : String(e));
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
    const text = await simulateStripFileContent(rel, inputs);
    if (text === null) {
      res.statusCode = 404;
      res.end('Not found (stripped under current inputs)');
      return;
    }
    sendJson(res, { path: rel, size: Buffer.byteLength(text, 'utf8'), text });
  } catch (e) {
    res.statusCode = 500;
    res.end(e instanceof Error ? e.message : String(e));
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
    res.setHeader('Content-Type', mimeFor(requested));
    res.setHeader('Cache-Control', 'no-store');
    res.end(data);
  } catch {
    // SPA fallback: any extensionless path (e.g. /preview/<h>/counter)
    // should boot the same index.html and let react-router handle it.
    if (!path.extname(rest)) {
      try {
        const data = await readFile(path.join(dist, 'index.html'));
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(data);
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
