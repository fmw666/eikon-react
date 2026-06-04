/**
 * @file binary-detect.ts
 * @description Decides whether a template file is binary (and thus must be
 * skipped by the text-oriented strip pass). Extension allow/deny lists with a
 * magic-byte fallback for the long tail. Extracted from `strip-features.ts` so
 * the strip walker reads as orchestration over this predicate.
 */

import { stat } from 'node:fs/promises';
import path from 'node:path';

export async function isBinary(file: string): Promise<boolean> {
  try {
    const st = await stat(file);
    if (st.size > 5 * 1024 * 1024) return true;
  } catch {
    return true;
  }
  const ext = path.extname(file).toLowerCase();
  if (BINARY_EXTENSIONS.has(ext)) return true;
  if (TEXT_EXTENSIONS.has(ext)) return false;
  // Unknown extension — fall back to magic-byte sniffing so a `.bin`
  // checked in by mistake doesn't get treated as text and a
  // text-disguised-as-other-extension still gets stripped. Reading 512
  // bytes is cheap and only happens for the long-tail of unknown
  // extensions, not the bulk of `.ts/.tsx/.css/.md` files.
  return await magicByteIsBinary(file);
}

const BINARY_EXTENSIONS: ReadonlySet<string> = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.avif',
  '.ico',
  '.icns',
  '.bmp',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.eot',
  '.zip',
  '.tar',
  '.gz',
  '.7z',
  '.mp3',
  '.mp4',
  '.mov',
  '.webm',
  '.pdf',
  '.wasm',
]);

const TEXT_EXTENSIONS: ReadonlySet<string> = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.md',
  '.mdx',
  '.css',
  '.scss',
  '.html',
  '.svg',
  '.toml',
  '.yaml',
  '.yml',
  '.txt',
  '.rs',
  '.sh',
  '.gitignore',
]);

async function magicByteIsBinary(file: string): Promise<boolean> {
  const { open } = await import('node:fs/promises');
  let fh: Awaited<ReturnType<typeof open>> | null = null;
  try {
    fh = await open(file, 'r');
    const buf = Buffer.alloc(512);
    const { bytesRead } = await fh.read(buf, 0, 512, 0);
    if (bytesRead === 0) return false; // empty file is text
    let nonPrintable = 0;
    for (let i = 0; i < bytesRead; i++) {
      const b = buf[i]!;
      if (b === 0) return true; // any null byte → definitely binary
      // Printable ASCII range + common whitespace (\t \n \r).
      const printable = (b >= 0x20 && b < 0x7f) || b === 0x09 || b === 0x0a || b === 0x0d;
      if (!printable) nonPrintable++;
    }
    return nonPrintable / bytesRead > 0.3;
  } catch {
    return true;
  } finally {
    await fh?.close();
  }
}
