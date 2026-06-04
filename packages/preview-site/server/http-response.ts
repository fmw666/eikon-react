/**
 * @file http-response.ts
 * @description Response-assembly plumbing shared by the playground API
 * handlers: JSON / error responses, bounded request-body parsing, and the
 * static-file MIME table. Extracted from `handlers.ts` so the route handlers
 * read as orchestration over these primitives. No request-handler state lives
 * here — every function takes its inputs and writes its outputs explicitly.
 */

import { type IncomingMessage, type ServerResponse } from 'node:http';
import path from 'node:path';

import { logError } from './log';
import { incr } from './metrics';

export const MAX_BODY_BYTES = 64 * 1024;

export async function readJsonBody(req: IncomingMessage): Promise<unknown> {
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

/**
 * P4.19: Send a 5xx response without leaking server internals. The raw
 * error (with stack frames including absolute paths and line numbers)
 * goes to the server log; the client sees a stable, opaque message.
 * The optional statusCode on the error lets `readJsonBody` signal 413
 * (body too large) without the caller needing to inspect the message.
 */
export function sendServerError(
  res: ServerResponse,
  e: unknown,
  fallback = 'Internal Server Error'
): void {
  const status =
    e &&
    typeof e === 'object' &&
    typeof (e as { statusCode?: number }).statusCode === 'number'
      ? (e as { statusCode: number }).statusCode
      : 500;
  // Tag every error log with the request id (`x-request-id`) so an
  // operator can grep `fly logs | grep <reqId>` to assemble the full
  // trail for a single failed request. The id is set by `prod.ts`
  // before dispatch; default to `-` for tests / unattached calls.
  const reqId = res.getHeader('x-request-id');
  logError('http_error', e, {
    request_id: typeof reqId === 'string' ? reqId : '-',
    status,
  });
  if (status >= 500) incr('http_5xx');
  else if (status >= 400) incr('http_4xx');
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end(status === 413 ? 'Payload too large' : fallback);
}

export function sendJson(res: ServerResponse, body: unknown): void {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export function mimeFor(p: string): string {
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
