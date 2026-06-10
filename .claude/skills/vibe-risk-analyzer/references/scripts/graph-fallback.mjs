#!/usr/bin/env node
/**
 * vibe-risk v4 — graphviz-free directory-level dependency graph (SVG).
 *
 * usage: node graph-fallback.mjs --root src [--root other/src] \
 *          [--alias "@=src/app" --alias "@shared=src/shared"] \
 *          [--depth 2] [--out .vibe-risk/dependency-graph.svg]
 *
 * 设计取舍：逐文件图在 150+ 节点时不可读;目录级聚合（默认 2 段路径为一桶）
 * 反而更能呈现架构层与跨层违例。布局 = 按"近似拓扑深度"分行的简单网格,
 * 零依赖、跨平台（Windows/cloud 无 graphviz 也能出图）。
 */
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';

const argv = process.argv.slice(2);
const roots = [];
const aliases = [];
let depth = 2;
let out = '.vibe-risk/dependency-graph.svg';
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--root') roots.push(argv[++i]);
  else if (argv[i] === '--alias') {
    const [k, v] = argv[++i].split('=');
    aliases.push([k, v]);
  } else if (argv[i] === '--depth') depth = Number(argv[++i]);
  else if (argv[i] === '--out') out = argv[++i];
}
if (!roots.length) {
  console.error('usage: graph-fallback.mjs --root <dir> [...]');
  process.exit(2);
}

const EXCLUDE = new Set(['node_modules', 'dist', 'out', 'build', '.git', 'coverage']);
const files = [];
function walk(d) {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) {
      if (!EXCLUDE.has(n)) walk(p);
    } else if (/\.(js|jsx|ts|tsx|mjs|cjs)$/.test(n)) {
      files.push(p.replace(/\\/g, '/'));
    }
  }
}
for (const r of roots) walk(r);

const bucketOf = (p) => {
  const rel = relative(process.cwd(), p).replace(/\\/g, '/');
  return rel.split('/').slice(0, depth + 1).slice(0, -1).join('/') || rel;
};

const nodes = new Map(); // bucket -> file count
const edges = new Map(); // "a|b" -> weight
const IMP = /from\s+['"]([^'"]+)['"]|import\(['"]([^'"]+)['"]\)|require\(\s*['"]([^'"]+)['"]\s*\)/g;

const resolveSpec = (file, spec) => {
  for (const [k, v] of aliases) {
    if (spec === k || spec.startsWith(k + '/')) {
      return (v + spec.slice(k.length)).replace(/\\/g, '/');
    }
  }
  if (!spec.startsWith('.')) return null; // bare import — external
  const parts = (dirname(file) + '/' + spec).split('/');
  const norm = [];
  for (const s of parts) {
    if (s === '.' || s === '') continue;
    else if (s === '..') norm.pop();
    else norm.push(s);
  }
  return norm.join('/');
};

for (const f of files) {
  const a = bucketOf(f);
  nodes.set(a, (nodes.get(a) ?? 0) + 1);
  const text = readFileSync(f, 'utf8');
  let m;
  while ((m = IMP.exec(text))) {
    const target = resolveSpec(f, m[1] || m[2] || m[3]);
    if (!target) continue;
    const b = bucketOf(target);
    if (b === a) continue;
    const k = a + '|' + b;
    edges.set(k, (edges.get(k) ?? 0) + 1);
  }
}

// 近似拓扑深度：无入边 = 0 层,其余 = max(上游层)+1（环按已见层截断）
const incoming = new Map([...nodes.keys()].map((n) => [n, 0]));
for (const k of edges.keys()) {
  const b = k.split('|')[1];
  if (incoming.has(b)) incoming.set(b, incoming.get(b) + 1);
}
const layer = new Map();
const assign = (n, d, seen) => {
  if (seen.has(n)) return;
  seen.add(n);
  layer.set(n, Math.max(layer.get(n) ?? 0, d));
  for (const k of edges.keys()) {
    const [a, b] = k.split('|');
    if (a === n && nodes.has(b)) assign(b, d + 1, seen);
  }
};
for (const [n, c] of incoming) if (c === 0) assign(n, 0, new Set());
for (const n of nodes.keys()) if (!layer.has(n)) layer.set(n, 0);

// 网格布局
const rows = new Map();
for (const [n, d] of layer) (rows.get(d) ?? rows.set(d, []).get(d)).push(n);
const NODE_W = 170;
const ROW_H = 92;
const pos = new Map();
let maxCols = 1;
for (const [d, ns] of [...rows.entries()].sort((x, y) => x[0] - y[0])) {
  ns.sort();
  maxCols = Math.max(maxCols, ns.length);
  ns.forEach((n, i) => pos.set(n, { x: 40 + i * NODE_W, y: 60 + d * ROW_H }));
}
const W = 80 + maxCols * NODE_W;
const H = 120 + (Math.max(...layer.values()) + 1) * ROW_H;

let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="sans-serif">
<defs><marker id="arr" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#8395b4"/></marker></defs>
<rect width="${W}" height="${H}" fill="#ffffff"/>
<text x="40" y="30" font-size="15" font-weight="700" fill="#15233c">dependency graph (directory-level, depth=${depth}) — ${nodes.size} buckets / ${edges.size} edges</text>`;
for (const [k, w] of edges) {
  const [a, b] = k.split('|');
  const A = pos.get(a);
  const B = pos.get(b);
  if (!A || !B) continue;
  const up = B.y <= A.y;
  svg += `<path d="M${A.x + 75},${A.y + 46} C${A.x + 75},${(A.y + B.y) / 2 + 23} ${B.x + 75},${(A.y + B.y) / 2 + 23} ${B.x + 75},${B.y}" fill="none" stroke="${up ? '#d97706' : '#5b7db1'}" stroke-width="${Math.min(1 + w * 0.15, 4)}" opacity="${Math.min(0.18 + w * 0.04, 0.7)}" marker-end="url(#arr)"/>`;
}
for (const [n, c] of nodes) {
  const { x, y } = pos.get(n);
  svg += `<rect x="${x}" y="${y}" rx="8" width="150" height="46" fill="#eef3fb" stroke="#5b7db1" stroke-width="1.2"/>
<text x="${x + 75}" y="${y + 19}" text-anchor="middle" font-size="10.5" font-weight="600" fill="#1f2d44">${n}</text>
<text x="${x + 75}" y="${y + 35}" text-anchor="middle" font-size="9.5" fill="#5a6b85">${c} files</text>`;
}
svg += `<text x="40" y="${H - 16}" font-size="10" fill="#5a6b85">orange = upward edge (potential layer violation / cycle participant). Generated by vibe-risk graph-fallback (no graphviz needed).</text></svg>`;

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, svg);
console.log(`written ${out}: ${nodes.size} buckets, ${edges.size} edges`);
