/**
 * @file copy-tree.ts
 * @description Skip-aware recursive directory copy used by the build
 * orchestrator to materialise a per-hash cache tree from `template-react/`.
 * Pure helper (takes src/dest/skip explicitly), extracted from `builder.ts`
 * so the build flow there reads as orchestration.
 */

import { copyFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';

/**
 * Manual recursive copy that skips entries whose basename is in `skip`.
 *
 * Node's `fs.cp({recursive: true})` refuses when dest is a subdirectory of
 * src — which is exactly our setup (cache lives under template-react/). The
 * hand-rolled version sidesteps that check entirely because each
 * `copyFile`/`mkdir` call sees only individual paths, not the relationship.
 */
export async function copyTree(
  src: string,
  dest: string,
  skip: ReadonlySet<string>
): Promise<void> {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    if (skip.has(entry.name)) continue;
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyTree(from, to, skip);
    } else if (entry.isFile()) {
      await copyFile(from, to);
    }
    // Symlinks and other special files are uncommon in template payloads;
    // silently skip them rather than try to faithfully reproduce.
  }
}
