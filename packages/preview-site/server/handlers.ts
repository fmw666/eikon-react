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

import { existsSync } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { type IncomingMessage, type ServerResponse } from 'node:http';
import path from 'node:path';

import { TEMPLATE_COPY_SKIP } from '../../create-eikon-react/src/skip-list';

import {
  clearAllCache,
  DEFAULT_INPUTS,
  ensureBuild,
  getCacheDir,
  getDistDir,
  isReady,
  getError,
  TEMPLATE_REACT_DIR,
} from './builder';
import { getTemplateRev } from './fingerprint';
import { type BuildInputs } from './hash';

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

// /api/files reads the cacheDir, which already excludes everything in
// TEMPLATE_COPY_SKIP at copy time. Vite's `viteBuild()` then deposits a
// fresh `dist/` (and occasionally `.vite/`) inside cacheDir — those names
// ALSO live in TEMPLATE_COPY_SKIP, which is exactly why reusing the same
// set here scrubs them in one move and keeps "what the user sees in the
// preview tree" identical to "what the user has on disk after the CLI".
const FILES_SKIP = TEMPLATE_COPY_SKIP;

/** Cap individual file responses so we don't OOM the browser on something
 *  weird like a bundled binary that slipped past the extension filter. */
const FILE_MAX_BYTES = 2 * 1024 * 1024;

interface FileNode {
  /** Path-from-cacheRoot used as a stable id; e.g. 'src/app/providers.tsx'. */
  id: string;
  name: string;
  type: 'dir' | 'file';
  children?: FileNode[];
}

/**
 * /api/files response cache. Trees are deterministic per cache directory,
 * and a cache directory only changes when its hash changes (new build) or
 * gets evicted — both already drive an `invalidate` (template change) or
 * are externally observable. We keep the cache tiny since each entry is
 * just a JS object graph.
 */
const treeCache = new Map<string, FileNode[]>();
const TREE_CACHE_MAX = 16;

function rememberTree(hash: string, tree: FileNode[]): void {
  treeCache.set(hash, tree);
  if (treeCache.size > TREE_CACHE_MAX) {
    const oldest = treeCache.keys().next().value as string | undefined;
    if (oldest) treeCache.delete(oldest);
  }
}

/**
 * Drop every cached file tree. The dev plugin calls this from its file
 * watcher when template-react changes; in prod the template is baked into
 * the image and never changes, so this is unused there but kept exported
 * for symmetry.
 */
export function clearTreeCache(): void {
  treeCache.clear();
}

async function readTree(rootDir: string, dir: string): Promise<FileNode[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const dirs: FileNode[] = [];
  const files: FileNode[] = [];
  for (const entry of entries) {
    if (FILES_SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    const id = path.relative(rootDir, full).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      dirs.push({
        id,
        name: entry.name,
        type: 'dir',
        children: await readTree(rootDir, full),
      });
    } else if (entry.isFile()) {
      files.push({ id, name: entry.name, type: 'file' });
    }
  }
  const cmp = (a: FileNode, b: FileNode) =>
    a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
  return [...dirs.sort(cmp), ...files.sort(cmp)];
}

/**
 * Resolve a /api/file?path=... request to an absolute path inside the cache
 * directory, returning null if the path tries to escape (e.g. via '..').
 */
function safeResolveInside(rootDir: string, relPath: string): string | null {
  const normalized = path.normalize(path.join(rootDir, relPath));
  if (
    normalized !== rootDir &&
    !normalized.startsWith(rootDir + path.sep)
  ) {
    return null;
  }
  return normalized;
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
//   GET  /api/template-rev                    -> { rev }
//   POST /api/build           { ...params }  -> { hash, status }
//   GET  /api/build-status?hash=...           -> { hash, status }
//   GET  /api/files?hash=...                  -> { hash, tree }       (nested)
//   GET  /api/file?hash=...&path=...          -> { hash, path, size, text }
//   POST /api/clear-cache                     -> { ok: true }
//   GET  /preview/<hash>/<file?>              -> static file or SPA fallback
//
// Status is one of 'ready' | 'building' | 'error'. The shell polls
// /api/build-status until 'ready' then sets iframe.src to /preview/<hash>/.

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

export async function handleFiles(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const hash = url.searchParams.get('hash') ?? '';
  if (!hash) {
    res.statusCode = 400;
    res.end('hash query param required');
    return;
  }
  const cached = treeCache.get(hash);
  if (cached) {
    sendJson(res, { hash, tree: cached });
    return;
  }
  const cacheDir = getCacheDir(hash);
  if (!existsSync(cacheDir)) {
    res.statusCode = 404;
    res.end('Build not found for hash');
    return;
  }
  try {
    const tree = await readTree(cacheDir, cacheDir);
    rememberTree(hash, tree);
    sendJson(res, { hash, tree });
  } catch (e) {
    res.statusCode = 500;
    res.end(e instanceof Error ? e.message : String(e));
  }
}

export async function handleFile(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const hash = url.searchParams.get('hash') ?? '';
  const rel = url.searchParams.get('path') ?? '';
  if (!hash || !rel) {
    res.statusCode = 400;
    res.end('hash and path query params required');
    return;
  }
  const cacheDir = getCacheDir(hash);
  const abs = safeResolveInside(cacheDir, rel);
  if (!abs) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }
  try {
    const st = await stat(abs);
    if (!st.isFile()) {
      res.statusCode = 404;
      res.end('Not a file');
      return;
    }
    if (st.size > FILE_MAX_BYTES) {
      res.statusCode = 413;
      res.end('File too large to preview');
      return;
    }
    const buf = await readFile(abs);
    sendJson(res, {
      hash,
      path: rel,
      size: st.size,
      text: buf.toString('utf8'),
    });
  } catch {
    res.statusCode = 404;
    res.end('Not found');
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
  clearTreeCache();
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
