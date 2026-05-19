import { existsSync } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { type ServerResponse } from 'node:http';
import path from 'node:path';

import { type Connect, type Plugin } from 'vite';

import {
  clearAllCache,
  clearAllErrors,
  DEFAULT_INPUTS,
  ensureBuild,
  getCacheDir,
  getDistDir,
  isReady,
  getError,
  TEMPLATE_REACT_DIR,
} from './builder';
import {
  getTemplateRev,
  scheduleInvalidateTemplateRev,
} from './fingerprint';
import { type BuildInputs } from './hash';

interface BuildRequestBody {
  supabase?: boolean;
  query?: boolean;
  design?: string;
  layout?: string;
  ui?: string;
}

function normalizeInputs(body: BuildRequestBody): BuildInputs {
  return {
    supabase:
      body.supabase === undefined ? DEFAULT_INPUTS.supabase : !!body.supabase,
    query: body.query === undefined ? DEFAULT_INPUTS.query : !!body.query,
    design: String(body.design ?? DEFAULT_INPUTS.design),
    layout: String(body.layout ?? DEFAULT_INPUTS.layout),
    ui: String(body.ui ?? DEFAULT_INPUTS.ui),
  };
}

async function readJsonBody(req: Connect.IncomingMessage): Promise<unknown> {
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

/**
 * Folders we never expose through /api/files — they're either build output,
 * dependency caches, or the orphaned per-variant build trees themselves.
 */
const FILES_SKIP = new Set([
  'node_modules',
  'dist',
  '.preview-cache',
  '.git',
  '.turbo',
  'coverage',
  '.vite',
]);

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

/**
 * Vite plugin that turns the preview-site dev server into an on-demand
 * template builder:
 *
 *   GET  /api/template-rev                    -> { rev }
 *   POST /api/build           { ...params }  -> { hash, status }
 *   GET  /api/build-status?hash=...           -> { hash, status }
 *   GET  /api/files?hash=...                  -> { hash, tree }       (nested)
 *   GET  /api/file?hash=...&path=...          -> { hash, path, size, text }
 *   POST /api/clear-cache                     -> { ok: true }
 *   GET  /preview/<hash>/<file?>              -> static file or SPA fallback
 *
 * Status is one of 'ready' | 'building' | 'error'. The shell polls
 * /api/build-status until 'ready' then sets iframe.src to /preview/<hash>/.
 */
/**
 * Subpaths of template-react that the watcher tracks. We intentionally
 * exclude template-react root so chokidar never recurses into node_modules
 * (which would be tens of thousands of files and would noticeably slow boot).
 */
const WATCH_SUBPATHS = [
  'src',
  'public',
  'index.html',
  'vite.config.ts',
  'package.json',
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.node.json',
];

export function previewBuildPlugin(): Plugin {
  return {
    name: 'evomap-preview-build',
    configureServer(server) {
      // -- File watcher -------------------------------------------------
      //
      // Mix the current template content hash into every build's cache
      // key so editing template-react/src auto-invalidates and triggers a
      // rebuild on the next request. We piggy-back on vite's chokidar
      // watcher to avoid spinning up a second one.
      const watchPaths = WATCH_SUBPATHS.map((p) =>
        path.join(TEMPLATE_REACT_DIR, p)
      );
      server.watcher.add(watchPaths);

      const handleTemplateChange = (file: string): void => {
        const norm = path.normalize(file);
        if (
          norm === TEMPLATE_REACT_DIR ||
          norm.startsWith(TEMPLATE_REACT_DIR + path.sep)
        ) {
          // Debounced + coalesced: format-on-save touching N files only
          // results in one invalidation, one tree-cache wipe, one error
          // map clear. The flush callback runs after the debounce window,
          // so we don't pay the cost N times for a single editor action.
          scheduleInvalidateTemplateRev(() => {
            treeCache.clear();
            // Clearing errors here lets a previously-broken variant
            // self-heal as soon as the source is fixed — the next build
            // request hits a clean slate instead of the cached error.
            clearAllErrors();
          });
        }
      };
      server.watcher.on('change', handleTemplateChange);
      server.watcher.on('add', handleTemplateChange);
      server.watcher.on('unlink', handleTemplateChange);

      // -- Background pre-warm -----------------------------------------
      //
      // Kick off the default-combo build immediately so by the time the
      // user opens http://localhost:3100 the iframe is already warm. We
      // do NOT await it — boot of the dev server stays instant.
      void ensureBuild(DEFAULT_INPUTS).catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        server.config.logger.warn(
          `[preview] default pre-warm failed: ${msg}`
        );
      });

      // -- HTTP API ----------------------------------------------------
      server.middlewares.use('/api/template-rev', async (_req, res) => {
        try {
          const rev = await getTemplateRev(TEMPLATE_REACT_DIR);
          sendJson(res, { rev });
        } catch (e) {
          res.statusCode = 500;
          res.end(e instanceof Error ? e.message : String(e));
        }
      });

      server.middlewares.use('/api/build', async (req, res) => {
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
      });

      server.middlewares.use('/api/build-status', (req, res) => {
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
      });

      server.middlewares.use('/api/files', async (req, res) => {
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
      });

      server.middlewares.use('/api/file', async (req, res) => {
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
      });

      server.middlewares.use('/api/clear-cache', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('POST only');
          return;
        }
        await clearAllCache();
        sendJson(res, { ok: true });
      });

      server.middlewares.use(async (req, res, next) => {
        if (!req.url) return next();
        const match = req.url.match(/^\/preview\/([0-9a-f]{6,64})(\/.*)?$/);
        if (!match) return next();

        const hash = match[1]!;
        const rawRest = match[2] ?? '/';
        const rest = rawRest === '/' ? '/index.html' : rawRest;
        const dist = getDistDir(hash);

        // Reject anything that tries to escape the dist directory.
        const requested = path.normalize(path.join(dist, rest));
        if (!requested.startsWith(dist)) {
          res.statusCode = 403;
          res.end('Forbidden');
          return;
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
              return;
            } catch {
              // Fall through to 404 if even index.html is missing — i.e. the
              // build hasn't completed yet for this hash.
            }
          }
          res.statusCode = 404;
          res.end('Not found');
        }
      });
    },
  };
}
