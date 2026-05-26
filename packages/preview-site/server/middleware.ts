import path from 'node:path';

import { type Plugin } from 'vite';

import { clearAllErrors, TEMPLATE_REACT_DIR } from './builder';
import { scheduleInvalidateTemplateRev } from './fingerprint';
import {
  clearSimTreeCache,
  handleBuild,
  handleBuildStatus,
  handleClearCache,
  handleFileContent,
  handleFilesTree,
  handlePreviewServe,
  handleTemplateRev,
  prewarmDefault,
} from './handlers';

/**
 * Vite plugin that turns the preview-site dev server into an on-demand
 * template builder.
 *
 * The actual request handling lives in `handlers.ts` so the prod Node
 * server (`server/prod.ts`) can mount the same set of endpoints. This
 * plugin only adds the pieces that are dev-only:
 *
 *   - File watcher tied to template-react/, so editing the template
 *     debounces into one cache invalidation + tree-cache wipe.
 *   - A boot-time pre-warm of the default combo (the prod server also
 *     pre-warms; we just call the same exported helper).
 *
 *   GET  /api/template-rev                              -> { rev }
 *   POST /api/build           { ...params }            -> { hash, status }
 *   GET  /api/build-status?hash=...                     -> { hash, status }
 *   GET  /api/files-tree?<6 params>                     -> { tree }
 *   GET  /api/file-content?<6 params>&path=...          -> { path, size, text }
 *   POST /api/clear-cache                               -> { ok: true }
 *   GET  /preview/<hash>/<file?>                        -> static file or SPA fallback
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
    name: 'eikon-preview-build',
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
            clearSimTreeCache();
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
      // user opens http://localhost:3100 the iframe is already warm.
      prewarmDefault((m) => server.config.logger.warn(m));

      // -- HTTP API ----------------------------------------------------
      server.middlewares.use('/api/template-rev', handleTemplateRev);
      server.middlewares.use('/api/build', handleBuild);
      server.middlewares.use('/api/build-status', handleBuildStatus);
      // Phase F: input-driven, cache-decoupled file panel endpoints. The
      // shell took the migration off the hash-keyed routes in Phase H and
      // the legacy ones were deleted in Phase J — these are the canonical
      // file endpoints now.
      server.middlewares.use('/api/files-tree', handleFilesTree);
      server.middlewares.use('/api/file-content', handleFileContent);
      server.middlewares.use('/api/clear-cache', handleClearCache);

      server.middlewares.use(async (req, res, next) => {
        const matched = await handlePreviewServe(req, res);
        if (!matched) next();
      });
    },
  };
}
