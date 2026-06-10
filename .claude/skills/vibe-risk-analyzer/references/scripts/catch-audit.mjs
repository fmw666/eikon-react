#!/usr/bin/env node
/**
 * vibe-risk v4 — comment-aware silent-catch audit.
 *
 * usage: node catch-audit.mjs <root...>
 *
 * Flags ONLY catches that are (empty OR console-only) AND lack a reason comment.
 * 关键教训：v3 时代的审计剥掉注释再判空,把"带意图注释的良性竞态静默"全部误报
 * （实测 42 报 → 8 真),v4 先看注释再判定。带 ≥6 字符理由注释的静默 = 合法
 * escape hatch（与 scoring-reference 对注释型 `any` 折半计分同思想）。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const EXCLUDE = new Set(['node_modules', 'dist', 'out', 'build', '.git', 'coverage', '.vibe-risk']);
const files = [];
function walk(d) {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (!EXCLUDE.has(n)) walk(p);
    } else if (/\.(js|mjs|cjs|ts|tsx|jsx)$/.test(n)) files.push(p);
  }
}
for (const r of process.argv.slice(2)) {
  statSync(r).isDirectory() ? walk(r) : files.push(r);
}

let total = 0;
const offenders = [];
for (const f of files) {
  const text = readFileSync(f, 'utf8');
  const re = /catch\s*(\([^)]*\))?\s*\{/g;
  let m;
  while ((m = re.exec(text))) {
    total++;
    let depth = 1;
    let i = re.lastIndex;
    while (i < text.length && depth > 0) {
      const c = text[i];
      if (c === '{') depth++;
      else if (c === '}') depth--;
      i++;
    }
    const body = text.slice(re.lastIndex, i - 1);
    const comments = [
      ...(body.match(/\/\/[^\n]*/g) || []),
      ...(body.match(/\/\*[\s\S]*?\*\//g) || []),
    ]
      .join(' ')
      .replace(/[/*]/g, '')
      .trim();
    const annotated = comments.length >= 6; // has a stated reason（中文 3 字即达标）
    const stripped = body
      .replace(/\/\/[^\n]*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .trim();
    const lines = stripped.split('\n').map((l) => l.trim()).filter(Boolean);
    const consoleOnly =
      lines.length > 0 &&
      lines.every(
        (l) =>
          /^console\.(error|warn|log|debug|info)\(/.test(l) ||
          /^\);?$/.test(l) ||
          /^['"`]/.test(l) ||
          (/^[A-Za-z0-9_$.,:'"`\s]+[,)]+;?$/.test(l) && !/(throw|return|=|\()/.test(l))
      );
    const silent = lines.length === 0;
    if ((consoleOnly || silent) && !annotated) {
      const line = text.slice(0, m.index).split('\n').length;
      offenders.push(
        `${relative(process.cwd(), f).replace(/\\/g, '/')}:${line} ${silent ? '[EMPTY-unannotated]' : '[console-only-unannotated]'}`
      );
    }
  }
}
console.log(`total catch blocks: ${total}`);
console.log(`unannotated silent/console-only: ${offenders.length}`);
for (const o of offenders) console.log('  ' + o);
process.exit(offenders.length ? 1 : 0);
