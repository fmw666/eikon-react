/**
 * @file preview-serve.ts
 * @description The `/preview/<hash>/...` static-file route plus the
 * `__eikon*` variant-snapshot parsing that stamps the served HTML.
 * Split out of `handlers.ts` so that file reads as pure routing; the
 * three public entry points (`readVariantsFromUrl`, `isPreviewPath`,
 * `handlePreviewServe`) are re-exported from the handlers barrel so
 * importers keep their existing paths.
 */

import { readFile } from 'node:fs/promises';
import { type IncomingMessage, type ServerResponse } from 'node:http';
import path from 'node:path';

import { getDistDir, touchHashServed } from './builder';
import { rewriteHtmlOpenTag } from '../../create-eikon-react/src/inject-html-variants';
import { type VariantSelections } from '../../create-eikon-react/src/strip-features';
import { getParam } from '../src/lib/params-schema';
import { mimeFor } from './http-response';

// `hash.ts` slices `hashBuildInputs` output to 12 hex characters; this
// regex pins to that exact length so a crafted /preview/abcdef/ request
// (shorter than any real hash) cannot poison the `lastServed` map with
// a never-served entry. Audit close-out: previously accepted [6,64], a
// dead generosity range that left a Map-leak vector.
const PREVIEW_PATH_RE = /^\/preview\/([0-9a-f]{12})(\/.*)?$/;

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
