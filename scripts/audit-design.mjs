#!/usr/bin/env node
/**
 * audit-design.mjs — score every `--design` preset against the design
 * standard it claims to follow.
 *
 * For each preset (apple, linear, anthropic, vercel, …) this prints a
 * 0–100 score plus a four-dimension breakdown and a concrete "差在哪"
 * (where it falls short) punch list:
 *
 *   1. Completeness   — does the preset ship the required overrides + a
 *                       dark half (the #1 mistake the customize-design
 *                       skill warns about)?
 *   2. Accessibility  — WCAG contrast of the key bg/fg pairs, light + dark.
 *   3. Brand fidelity — how close is the primary/ring/background to the
 *                       documented brand anchor colour (Apple systemBlue,
 *                       Linear lavender-blue, Anthropic Crail orange, …)?
 *   4. Design voice   — preset-specific fingerprint: font family, density
 *                       (`--spacing`), radii, shadow personality, motion,
 *                       focus ring, surface treatment.
 *
 * Pure ESM, zero dependencies. Reads tokens straight out of
 * `src/styles/index.css` (OKLCH values), so the score always reflects the
 * file on disk — no snapshot to drift.
 *
 * Reads `packages/template-react/src/styles/index.css` by default. This is a
 * repo-maintainer tool — it audits the unstripped 15-preset template, so it
 * lives in the repo-root `scripts/` (next to verify.mjs) rather than inside
 * the template package, which would ship it into single-design end-user
 * scaffolds.
 *
 * Usage (from repo root):
 *   pnpm audit:design                            # all presets, table
 *   node scripts/audit-design.mjs apple linear   # only these presets
 *   node scripts/audit-design.mjs --json         # machine-readable
 *   node scripts/audit-design.mjs --css <path>   # audit another index.css
 *   node scripts/audit-design.mjs --min 80       # exit 1 if any < 80
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================================
// 1. Colour maths — OKLCH ⇄ OKLab ⇄ linear sRGB ⇄ sRGB, WCAG contrast, ΔEOK.
//    (Björn Ottosson's oklab matrices.)
// ============================================================================

function clamp01(x) {
  return Math.min(1, Math.max(0, x));
}

/** Parse an `oklch(L C H[ / A])` string → {L, C, H, alpha} (L 0..1, H deg). */
function parseOklch(value) {
  const m = /oklch\(\s*([^)]+)\)/i.exec(value);
  if (!m) return null;
  const body = m[1].replace('/', ' ');
  const parts = body.split(/\s+/).filter(Boolean);
  if (parts.length < 3) return null;
  const toNum = (s) => (s.endsWith('%') ? parseFloat(s) / 100 : parseFloat(s));
  const L = toNum(parts[0]);
  const C = parseFloat(parts[1]);
  const H = parseFloat(parts[2]);
  const alpha = parts[3] != null ? toNum(parts[3]) : 1;
  if ([L, C, H].some((n) => Number.isNaN(n))) return null;
  return { L, C, H, alpha };
}

function oklchToOklab({ L, C, H }) {
  const h = (H * Math.PI) / 180;
  return { L, a: C * Math.cos(h), b: C * Math.sin(h) };
}

/** OKLab → linear sRGB (may be out of gamut; caller clamps). */
function oklabToLinearSrgb({ L, a, b }) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  return {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  };
}

function linearSrgbToOklab({ r, g, b }) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

const linToSrgb = (c) =>
  c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
const srgbToLin = (c) =>
  c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

function oklabToSrgb(lab) {
  const lin = oklabToLinearSrgb(lab);
  return {
    r: clamp01(linToSrgb(lin.r)),
    g: clamp01(linToSrgb(lin.g)),
    b: clamp01(linToSrgb(lin.b)),
  };
}

function hexToSrgb(hex) {
  const h = hex.replace('#', '');
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h;
  return {
    r: parseInt(full.slice(0, 2), 16) / 255,
    g: parseInt(full.slice(2, 4), 16) / 255,
    b: parseInt(full.slice(4, 6), 16) / 255,
  };
}

function srgbToOklab(srgb) {
  return linearSrgbToOklab({
    r: srgbToLin(srgb.r),
    g: srgbToLin(srgb.g),
    b: srgbToLin(srgb.b),
  });
}

const hexToOklab = (hex) => srgbToOklab(hexToSrgb(hex));

/** WCAG relative luminance from sRGB (0..1 channels). */
function luminance(srgb) {
  return (
    0.2126 * srgbToLin(srgb.r) +
    0.7152 * srgbToLin(srgb.g) +
    0.0722 * srgbToLin(srgb.b)
  );
}

/** Composite a possibly-translucent fg over an opaque bg (sRGB). */
function compositeOver(fg, alpha, bg) {
  return {
    r: fg.r * alpha + bg.r * (1 - alpha),
    g: fg.g * alpha + bg.g * (1 - alpha),
    b: fg.b * alpha + bg.b * (1 - alpha),
  };
}

function contrastRatio(lumA, lumB) {
  const hi = Math.max(lumA, lumB);
  const lo = Math.min(lumA, lumB);
  return (hi + 0.05) / (lo + 0.05);
}

/** Perceptual distance in OKLab, with lightness down-weighted (brand
 * recognition tolerates a lighter/darker shade far better than a hue shift). */
function deltaEOK(a, b, lightnessWeight = 0.5) {
  const dL = (a.L - b.L) * lightnessWeight;
  const da = a.a - b.a;
  const db = a.b - b.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}

/** Smallest absolute hue difference in degrees (0..180). */
function hueDelta(h1, h2) {
  const d = Math.abs(((h1 - h2 + 180) % 360) - 180);
  return d;
}

// ============================================================================
// 2. CSS parsing — pull token maps out of index.css.
// ============================================================================

/** Find the body `{ … }` of the first block whose header matches `headerRe`. */
function extractBlock(css, headerRe) {
  const m = headerRe.exec(css);
  if (!m) return null;
  let i = css.indexOf('{', m.index);
  if (i < 0) return null;
  let depth = 0;
  const start = i;
  for (; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') {
      depth--;
      if (depth === 0) return css.slice(start + 1, i);
    }
  }
  return null;
}

/** Parse `--name: value;` declarations (multi-line values allowed). */
function parseDecls(body) {
  const out = {};
  if (!body) return out;
  // Strip block comments so commented-out `--x:` lines don't get parsed.
  const clean = body.replace(/\/\*[\s\S]*?\*\//g, '');
  const re = /(--[\w-]+)\s*:\s*([^;]+);/g;
  let m;
  while ((m = re.exec(clean))) {
    out[m[1]] = m[2].trim().replace(/\s+/g, ' ');
  }
  return out;
}

/** Resolve a single level of `var(--x)` within the same map. */
function resolveVars(map) {
  const out = { ...map };
  for (const k of Object.keys(out)) {
    const vm = /^var\(\s*(--[\w-]+)\s*\)$/.exec(out[k]);
    if (vm && out[vm[1]] != null) out[k] = out[vm[1]];
  }
  return out;
}

function parseStylesheet(css) {
  const baseLight = parseDecls(extractBlock(css, /@theme\s*\{/));
  const baseDark = parseDecls(extractBlock(css, /(^|\n)\.dark\s*\{/));

  const presets = {};
  const markerRe =
    /@eikon:variant\(design=([\w-]+)\) begin \*\/([\s\S]*?)\/\* @eikon:variant\(design=\1\) end/g;
  let m;
  while ((m = markerRe.exec(css))) {
    const name = m[1];
    const block = m[2];
    const light = parseDecls(
      extractBlock(block, new RegExp(`:root\\.design-${name}\\s*\\{`))
    );
    const dark = parseDecls(
      extractBlock(block, new RegExp(`\\.dark\\.design-${name}\\s*\\{`))
    );
    presets[name] = { light, dark };
  }
  return { baseLight, baseDark, presets };
}

// ============================================================================
// 3. Rubric — brand anchors + per-preset design-voice fingerprints.
//    Each `voice` check returns 0..1 (or boolean) + an explanation.
// ============================================================================

// Helpers used inside specs (bound per-preset to the effective token maps).
const lenRem = (v) => {
  if (v == null) return null;
  const m = /(-?\d*\.?\d+)\s*rem/.exec(v);
  if (m) return parseFloat(m[1]);
  const px = /(-?\d*\.?\d+)\s*px/.exec(v);
  if (px) return parseFloat(px[1]) / 16;
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
};
const num = (v) => {
  if (v == null) return null;
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
};

/** A voice-check factory: each returns {id,label,weight,run(ctx)}. */
const check = (id, label, weight, run) => ({ id, label, weight, run });

const SPECS = {
  default: {
    label: 'Default (neutral violet)',
    inspiration: '中性基线（无品牌）',
    requireOverrides: false,
    // No brand to match — `default` is deliberately brand-agnostic, so the
    // brand-fidelity dimension is not applicable (re-weighted onto the rest).
    voice: [
      check('font', 'system-ui 字体栈', 1, (c) =>
        bool(
          /system-ui|ui-sans-serif/i.test(c.fontSans),
          `font-sans=${short(c.fontSans)}`
        )
      ),
      check('neutral-radius', '中庸圆角 (~0.75rem)', 1, (c) =>
        near(lenRem(c.L['--radius-lg']) ?? 0.75, 0.75, 0.4)
      ),
    ],
  },

  apple: {
    label: 'Apple HIG (systemBlue + SF Pro)',
    inspiration: 'Apple Human Interface Guidelines',
    anchors: { primary: '#007AFF', background: '#FAFAFA' },
    voice: [
      check('font', 'SF Pro / -apple-system 字体', 2, (c) =>
        bool(
          /SF Pro|-apple-system|BlinkMacSystemFont/i.test(c.fontSans),
          `font-sans=${short(c.fontSans)}`
        )
      ),
      check('density', '宽松密度 --spacing ≥ 0.26rem', 2, (c) =>
        atLeast(lenRem(c.L['--spacing']), 0.26, 'rem')
      ),
      check('radius', '慷慨圆角 --radius-lg ≥ 0.8rem', 2, (c) =>
        atLeast(lenRem(c.L['--radius-lg']), 0.8, 'rem')
      ),
      check('body', '大号正文 --text-base ≥ 1.05rem (≈17px)', 1, (c) =>
        atLeast(lenRem(c.L['--text-base']), 1.05, 'rem')
      ),
      check('shadow', '柔和低对比阴影（模糊优先）', 1, (c) =>
        bool(
          /0\.0[0-9]\b|0\.1\b/.test(c.L['--shadow-md'] || '') &&
            /px/.test(c.L['--shadow-md'] || ''),
          `shadow-md=${short(c.L['--shadow-md'])}`
        )
      ),
      check('tracking', '紧致字距 --tracking-tight ≤ -0.015em', 1, (c) =>
        atMost(num(c.L['--tracking-tight']), -0.015, 'em')
      ),
      check('ring', '光晕焦点环 --ring-width ≥ 3px', 1, (c) =>
        atLeast(lenRem(c.L['--ring-width']) * 16, 3, 'px')
      ),
    ],
  },

  linear: {
    label: 'Linear (lavender-blue + Inter)',
    inspiration: 'linear.app brand',
    anchors: { primary: '#5E6AD2', background: '#F4F5F8' },
    voice: [
      check('font', 'Inter 字体', 2, (c) =>
        bool(/Inter/i.test(c.fontSans), `font-sans=${short(c.fontSans)}`)
      ),
      check('density', '紧凑密度 --spacing ≤ 0.24rem', 2, (c) =>
        atMost(lenRem(c.L['--spacing']), 0.24, 'rem')
      ),
      check('radius', '紧凑圆角 --radius-lg ≤ 0.6rem', 1, (c) =>
        atMost(lenRem(c.L['--radius-lg']), 0.6, 'rem')
      ),
      check('body', '小号正文 --text-base ≤ 0.95rem (≈15px)', 1, (c) =>
        atMost(lenRem(c.L['--text-base']), 0.95, 'rem')
      ),
      check('hairline', '发丝阴影（0 模糊偏移）', 1, (c) =>
        bool(
          /\b0 1px 0 0\b/.test(c.L['--shadow-sm'] || ''),
          `shadow-sm=${short(c.L['--shadow-sm'])}`
        )
      ),
      check('motion', '迅捷动效 --duration-normal ≤ 180ms', 1, (c) =>
        atMost(num(c.L['--duration-normal']), 180, 'ms')
      ),
    ],
  },

  anthropic: {
    label: 'Anthropic (Claude orange + serif)',
    inspiration: 'Anthropic brand guidelines',
    anchors: { primary: '#d97757', background: '#faf9f5' },
    voice: [
      check('serif', '衬线正文字体 (Lora/serif)', 2, (c) =>
        bool(/Lora|serif/i.test(c.fontSans), `font-sans=${short(c.fontSans)}`)
      ),
      check('leading', '编辑式行高 --text-base--line-height ≥ 1.7rem', 2, (c) =>
        atLeast(lenRem(c.L['--text-base--line-height']), 1.7, 'rem')
      ),
      check('tracking', '零字距 --tracking-tight = 0', 1, (c) =>
        near(num(c.L['--tracking-tight']) ?? 0, 0, 0.006, 'em')
      ),
      check('warm-bg', '暖色背景 (hue 60–110)', 1, (c) => {
        const bg = c.color(c.L['--color-background']);
        if (!bg) return bool(false, 'bg 无法解析');
        const ok = bg.oklch.H >= 50 && bg.oklch.H <= 120;
        return bool(ok, `bg hue=${bg.oklch.H.toFixed(0)}°`);
      }),
      check('density', '宽松编辑密度 --spacing ≥ 0.27rem', 1, (c) =>
        atLeast(lenRem(c.L['--spacing']), 0.27, 'rem')
      ),
    ],
  },

  vercel: {
    label: 'Vercel Geist (mono ink)',
    inspiration: 'Vercel Geist',
    anchors: { ring: '#0070F3' },
    inkPrimary: true, // primary IS ink: near-black light / near-white dark
    voice: [
      check('mono', 'Geist Mono 等宽', 1, (c) =>
        bool(/Geist Mono/i.test(c.fontMono), `font-mono=${short(c.fontMono)}`)
      ),
      check('sans', 'Geist Sans 字体', 1, (c) =>
        bool(/Geist/i.test(c.fontSans), `font-sans=${short(c.fontSans)}`)
      ),
      check('monochrome', '单色 primary (chroma≈0)', 2, (c) => {
        const p = c.color(c.L['--color-primary']);
        if (!p) return bool(false, 'primary 无法解析');
        return bool(p.oklch.C < 0.02, `primary chroma=${p.oklch.C.toFixed(3)}`);
      }),
      check('accent-ring', '蓝色焦点环 (#0070F3-ish)', 2, (c) => {
        const r = c.color(c.L['--color-ring']);
        if (!r) return bool(false, 'ring 无法解析');
        const ok = r.oklch.C > 0.1 && hueDelta(r.oklch.H, 257) < 25;
        return bool(
          ok,
          `ring hue=${r.oklch.H.toFixed(0)}° C=${r.oklch.C.toFixed(2)}`
        );
      }),
      check('ring-shadow', '1px 描边阴影 (0 0 0 1px)', 1, (c) =>
        bool(
          /0 0 0 1px/.test(c.L['--shadow-sm'] || ''),
          `shadow-sm=${short(c.L['--shadow-sm'])}`
        )
      ),
      check('density', '紧凑密度 --spacing ≤ 0.24rem', 1, (c) =>
        atMost(lenRem(c.L['--spacing']), 0.24, 'rem')
      ),
      check('radius', '极小圆角 --radius-lg ≤ 0.4rem', 1, (c) =>
        atMost(lenRem(c.L['--radius-lg']), 0.4, 'rem')
      ),
    ],
  },

  notion: {
    label: 'Notion (warm gray + blue)',
    inspiration: 'Notion editor',
    anchors: { primary: '#2eaadc' },
    voice: [
      check('blue', '蓝色 primary (hue 200–245)', 2, (c) => {
        const p = c.color(c.L['--color-primary']);
        if (!p) return bool(false, 'primary 无法解析');
        const ok = p.oklch.H >= 195 && p.oklch.H <= 250 && p.oklch.C > 0.08;
        return bool(ok, `primary hue=${p.oklch.H.toFixed(0)}°`);
      }),
      check('font', 'Inter 字体', 1, (c) =>
        bool(/Inter/i.test(c.fontSans), `font-sans=${short(c.fontSans)}`)
      ),
      check('comfy-leading', '舒适行高 --text-base--line-height ≥ 1.6rem', 1, (c) =>
        atLeast(lenRem(c.L['--text-base--line-height']), 1.6, 'rem')
      ),
      check('warm-neutral', '暖灰背景（微暖 hue 40–100）', 1, (c) => {
        const bg = c.color(c.L['--color-background']);
        if (!bg) return bool(false, 'bg 无法解析');
        return bool(
          bg.oklch.H >= 40 && bg.oklch.H <= 100,
          `bg hue=${bg.oklch.H.toFixed(0)}°`
        );
      }),
    ],
  },

  flat: {
    label: 'Flat (zero shadow, solid)',
    inspiration: 'Flat / Metro / Swiss',
    voice: [
      check('no-shadow', '零阴影 --shadow-md = none / 极平', 2, (c) =>
        bool(
          /none/.test(c.L['--shadow-md'] || '') ||
            /shadow/.test('') === false,
          `shadow-md=${short(c.L['--shadow-md'])}`
        )
      ),
      check('border', '可见边框 --surface-border-width ≥ 1px', 1, (c) =>
        atLeast(lenRem(c.L['--surface-border-width']) * 16, 1, 'px')
      ),
      check('font', 'Inter Tight 字体', 1, (c) =>
        bool(/Inter/i.test(c.fontSans), `font-sans=${short(c.fontSans)}`)
      ),
    ],
  },

  material: {
    label: 'Material Design 3 (elevation)',
    inspiration: 'Material Design 3',
    voice: [
      check('elevation', '高度阴影（带模糊）', 2, (c) =>
        bool(
          /px .*px/.test(c.L['--shadow-md'] || '') &&
            !/none/.test(c.L['--shadow-md'] || ''),
          `shadow-md=${short(c.L['--shadow-md'])}`
        )
      ),
      check('container-radius', '容器圆角 --radius-lg ≥ 0.75rem', 1, (c) =>
        atLeast(lenRem(c.L['--radius-lg']), 0.75, 'rem')
      ),
      check('font', 'Roboto 字体', 1, (c) =>
        bool(/Roboto/i.test(c.fontSans), `font-sans=${short(c.fontSans)}`)
      ),
    ],
  },

  skeuomorphism: {
    label: 'Skeuomorphism (realistic)',
    inspiration: 'Realistic 3D',
    voice: [
      check('inset', '内嵌高光阴影 (inset)', 2, (c) =>
        bool(
          /inset/.test(c.L['--shadow-md'] || '') ||
            (c.L['--surface-inset-shadow'] &&
              !/^none$/.test(c.L['--surface-inset-shadow'])),
          `inset-shadow=${short(c.L['--surface-inset-shadow'])}`
        )
      ),
      check('deep-shadow', '深阴影（大偏移/模糊）', 1, (c) =>
        bool(
          /[2-9][0-9]?px/.test(c.L['--shadow-lg'] || ''),
          `shadow-lg=${short(c.L['--shadow-lg'])}`
        )
      ),
      check('serif', '衬线字体 (Georgia/serif)', 1, (c) =>
        bool(/Georgia|serif/i.test(c.fontSans), `font-sans=${short(c.fontSans)}`)
      ),
    ],
  },

  neumorphism: {
    label: 'Neumorphism (soft plastic)',
    inspiration: 'Soft UI',
    voice: [
      check('paired-shadow', '成对内外阴影', 2, (c) =>
        bool(
          /inset/.test(c.L['--surface-inset-shadow'] || '') ||
            (c.L['--shadow-md'] || '').split(',').length >= 2,
          `inset=${short(c.L['--surface-inset-shadow'])}`
        )
      ),
      check('low-contrast', '低对比：bg≈card (|ΔL|<0.06)', 2, (c) => {
        const bg = c.color(c.L['--color-background']);
        const card = c.color(c.L['--color-card']);
        if (!bg || !card) return bool(false, '无法解析 bg/card');
        const dL = Math.abs(bg.oklch.L - card.oklch.L);
        return bool(dL < 0.06, `|ΔL|=${dL.toFixed(3)}`);
      }),
      check('no-border', '无边框 --surface-border-width ≈ 0', 1, (c) =>
        atMost(lenRem(c.L['--surface-border-width']) * 16, 0.5, 'px')
      ),
    ],
  },

  'liquid-glass': {
    label: 'Liquid Glass (refractive)',
    inspiration: 'Apple iOS 26',
    voice: [
      check('backdrop', '背景模糊 --surface-backdrop 含 blur', 2, (c) =>
        bool(
          /blur/.test(c.L['--surface-backdrop'] || ''),
          `backdrop=${short(c.L['--surface-backdrop'])}`
        )
      ),
      check('ambient', '环境背景 --bg-ambient ≠ none', 1, (c) =>
        bool(
          c.L['--bg-ambient'] && !/^none$/.test(c.L['--bg-ambient']),
          `bg-ambient=${short(c.L['--bg-ambient'])}`
        )
      ),
      check('font', 'SF Pro 字体', 1, (c) =>
        bool(
          /SF Pro|-apple-system/i.test(c.fontSans),
          `font-sans=${short(c.fontSans)}`
        )
      ),
    ],
  },

  claymorphism: {
    label: 'Claymorphism (puffy 3D)',
    inspiration: 'clay.css',
    voice: [
      check('inset-glow', '内发光阴影 (shadow 含 inset)', 2, (c) =>
        bool(
          /inset/.test(c.L['--shadow-md'] || '') ||
            /inset/.test(c.L['--surface-inset-shadow'] || ''),
          `shadow-md=${short(c.L['--shadow-md'])}`
        )
      ),
      check('round', '大圆角 --radius-lg ≥ 1rem', 1, (c) =>
        atLeast(lenRem(c.L['--radius-lg']), 1, 'rem')
      ),
      check('font', '俏皮字体 (Fredoka/Nunito)', 1, (c) =>
        bool(
          /Fredoka|Nunito|Quicksand/i.test(c.fontSans),
          `font-sans=${short(c.fontSans)}`
        )
      ),
    ],
  },

  aurora: {
    label: 'Aurora (gradient glow)',
    inspiration: 'Aurora UI',
    voice: [
      check('dark-base', '深色基底可用 (dark bg L < 0.2)', 1, (c) => {
        const bg = c.color(c.D['--color-background']);
        if (!bg) return bool(false, 'bg 无法解析');
        return bool(bg.oklch.L < 0.2, `dark bg L=${bg.oklch.L.toFixed(2)}`);
      }),
      check('dual-glow', '双色辉光阴影（多色 shadow）', 2, (c) =>
        bool(
          (c.L['--shadow-lg'] || '').match(/oklch|rgb|hsl/g)?.length >= 2,
          `shadow-lg=${short(c.L['--shadow-lg'])}`
        )
      ),
      check('font', 'Space Grotesk 字体', 1, (c) =>
        bool(
          /Space Grotesk/i.test(c.fontSans),
          `font-sans=${short(c.fontSans)}`
        )
      ),
    ],
  },

  'neo-brutalism': {
    label: 'NEO-Brutalism (hard outlines)',
    inspiration: 'Brutalist web',
    voice: [
      check('thick-border', '粗边框 --surface-border-width = 3px', 2, (c) =>
        atLeast(lenRem(c.L['--surface-border-width']) * 16, 3, 'px')
      ),
      check('hard-shadow', '硬偏移零模糊阴影 (Npx Npx 0)', 2, (c) =>
        bool(
          /-?\d+px -?\d+px 0\b/.test(c.L['--shadow-md'] || ''),
          `shadow-md=${short(c.L['--shadow-md'])}`
        )
      ),
      check('zero-radius', '零圆角 --radius-lg = 0', 2, (c) =>
        near(lenRem(c.L['--radius-lg']) ?? 1, 0, 0.01, 'rem')
      ),
      check('mono', '等宽字体', 1, (c) =>
        bool(/Mono|Fira Code/i.test(c.fontSans), `font-sans=${short(c.fontSans)}`)
      ),
      check('hover-pop', 'hover 阴影弹出 --surface-hover-shadow', 1, (c) =>
        bool(
          /-?\d+px -?\d+px 0\b/.test(c.L['--surface-hover-shadow'] || ''),
          `hover=${short(c.L['--surface-hover-shadow'])}`
        )
      ),
    ],
  },

  cyberpunk: {
    label: 'Cyberpunk (neon magenta + cyan)',
    inspiration: 'Synthwave / cyberpunk',
    voice: [
      check('neon-glow', '霓虹辉光阴影（模糊扩散）', 2, (c) =>
        bool(
          /0 0 \d+px/.test(c.L['--shadow-md'] || ''),
          `shadow-md=${short(c.L['--shadow-md'])}`
        )
      ),
      check('high-chroma', '高饱和 primary (C ≥ 0.2)', 1, (c) => {
        const p = c.color(c.L['--color-primary']);
        if (!p) return bool(false, 'primary 无法解析');
        return bool(p.oklch.C >= 0.2, `primary C=${p.oklch.C.toFixed(2)}`);
      }),
      check('radius', '近零圆角 --radius-lg ≤ 0.3rem', 1, (c) =>
        atMost(lenRem(c.L['--radius-lg']), 0.3, 'rem')
      ),
      check('mono', '等宽字体', 1, (c) =>
        bool(/Mono|Fira Code/i.test(c.fontSans), `font-sans=${short(c.fontSans)}`)
      ),
      check('hard-cut', '硬切动效 --ease-out 被覆写', 1, (c) =>
        bool(
          c.L['--ease-out'] != null,
          c.L['--ease-out'] ? `ease-out=${short(c.L['--ease-out'])}` : '未覆写'
        )
      ),
    ],
  },

  terminal: {
    label: 'Terminal (green phosphor CRT)',
    inspiration: 'CRT / phosphor terminal',
    voice: [
      check('mono', '等宽字体', 1, (c) =>
        bool(/Mono|Fira Code/i.test(c.fontSans), `font-sans=${short(c.fontSans)}`)
      ),
      check('phosphor', '磷光绿 primary (hue 130–165, C ≥ 0.12)', 2, (c) => {
        const p = c.color(c.L['--color-primary']);
        if (!p) return bool(false, 'primary 无法解析');
        const ok = p.oklch.H >= 125 && p.oklch.H <= 170 && p.oklch.C >= 0.12;
        return bool(ok, `primary hue=${p.oklch.H.toFixed(0)}° C=${p.oklch.C.toFixed(2)}`);
      }),
      check('dark-base', '深色基底 bg L < 0.25', 1, (c) => {
        const bg = c.color(c.L['--color-background']);
        if (!bg) return bool(false, 'bg 无法解析');
        return bool(bg.oklch.L < 0.25, `bg L=${bg.oklch.L.toFixed(2)}`);
      }),
      check('zero-radius', '零圆角 --radius-lg ≤ 0.15rem', 1, (c) =>
        atMost(lenRem(c.L['--radius-lg']), 0.15, 'rem')
      ),
      check('glow', '绿色辉光阴影', 1, (c) =>
        bool(
          /0 0 \d+px/.test(c.L['--shadow-md'] || ''),
          `shadow-md=${short(c.L['--shadow-md'])}`
        )
      ),
    ],
  },

  carbon: {
    label: 'IBM Carbon (enterprise blue)',
    inspiration: 'IBM Carbon Design System',
    anchors: { primary: '#0F62FE' },
    voice: [
      check('font', 'IBM Plex Sans 字体', 2, (c) =>
        bool(/IBM Plex/i.test(c.fontSans), `font-sans=${short(c.fontSans)}`)
      ),
      check('square', '直角 --radius-lg ≤ 0.1rem', 2, (c) =>
        atMost(lenRem(c.L['--radius-lg']), 0.1, 'rem')
      ),
      check('dense', '密集密度 --spacing ≤ 0.24rem', 1, (c) =>
        atMost(lenRem(c.L['--spacing']), 0.24, 'rem')
      ),
      check('focus', '2px 焦点边框 --ring-width ≥ 2px', 1, (c) =>
        atLeast(lenRem(c.L['--ring-width']) * 16, 2, 'px')
      ),
    ],
  },

  editorial: {
    label: 'Editorial (black-and-white print)',
    inspiration: 'Broadsheet / magazine print',
    inkPrimary: true, // primary IS ink: near-black light / near-white dark
    voice: [
      check('serif', '衬线字体 (Playfair/Georgia/serif)', 2, (c) =>
        bool(
          /Playfair|Georgia|serif/i.test(c.fontSans),
          `font-sans=${short(c.fontSans)}`
        )
      ),
      check('leading', '编辑式行高 --text-base--line-height ≥ 1.7rem', 2, (c) =>
        atLeast(lenRem(c.L['--text-base--line-height']), 1.7, 'rem')
      ),
      check('mono-ink', '黑白无彩 (foreground chroma ≈ 0)', 1, (c) => {
        const fg = c.color(c.L['--color-foreground']);
        if (!fg) return bool(false, 'fg 无法解析');
        return bool(fg.oklch.C < 0.02, `fg C=${fg.oklch.C.toFixed(3)}`);
      }),
      check('flat', '扁平阴影（印刷无投影）', 1, (c) =>
        bool(
          /0 1px 0|0 2px 0|none/.test(c.L['--shadow-md'] || ''),
          `shadow-md=${short(c.L['--shadow-md'])}`
        )
      ),
      check('radius', '近零圆角 --radius-lg ≤ 0.2rem', 1, (c) =>
        atMost(lenRem(c.L['--radius-lg']), 0.2, 'rem')
      ),
    ],
  },

  evomap: {
    label: 'EvoMap (agent economy cyan)',
    inspiration: 'EvoMap DESIGN.md',
    anchors: { primary: '#47C9E7' },
    voice: [
      check('font-display', 'Outfit / Inter technical product type', 2, (c) =>
        bool(
          /Inter/i.test(c.fontSans) && /Outfit/i.test(c.L['--font-display'] || ''),
          `font-sans=${short(c.fontSans)} display=${short(c.L['--font-display'])}`
        )
      ),
      check('cyan-primary', 'cyan primary (hue 200-230, C >= 0.10)', 2, (c) => {
        const p = c.color(c.L['--color-primary']);
        if (!p) return bool(false, 'primary 无法解析');
        const ok = p.oklch.H >= 200 && p.oklch.H <= 230 && p.oklch.C >= 0.1;
        return bool(ok, `primary hue=${p.oklch.H.toFixed(0)}° C=${p.oklch.C.toFixed(2)}`);
      }),
      check('dark-first', 'dark-first black base bg L <= 0.05', 2, (c) => {
        const bg = c.color(c.D['--color-background']);
        if (!bg) return bool(false, 'dark bg 无法解析');
        return bool(bg.oklch.L <= 0.05, `dark bg L=${bg.oklch.L.toFixed(2)}`);
      }),
      check('compact-radius', 'technical card radius --radius-lg = 0.5rem', 1, (c) =>
        near(lenRem(c.L['--radius-lg']), 0.5, 0.05, 'rem')
      ),
      check('dense-spacing', '4px spacing ramp --spacing = 0.25rem', 1, (c) =>
        near(lenRem(c.L['--spacing']), 0.25, 0.03, 'rem')
      ),
      check('soft-depth', 'soft boundary shadow, no heavy decorative drop', 1, (c) =>
        bool(
          /0 0 0 1px|0 8px|0 12px/.test(c.L['--shadow-md'] || ''),
          `shadow-md=${short(c.L['--shadow-md'])}`
        )
      ),
    ],
  },

  pixel: {
    label: 'Pixel Pop (8-bit pastel arcade)',
    inspiration: 'Retro 8-bit / pixel-art pop',
    voice: [
      check('pixel-font', '像素位图标题字体 (Press Start 2P)', 2, (c) =>
        bool(
          /Press Start 2P/i.test(c.L['--font-display'] || ''),
          `display=${short(c.L['--font-display'])}`
        )
      ),
      check('hard-shadow', '硬偏移零模糊阴影 (Npx Npx 0)', 2, (c) =>
        bool(
          /-?\d+px -?\d+px 0\b/.test(c.L['--shadow-md'] || ''),
          `shadow-md=${short(c.L['--shadow-md'])}`
        )
      ),
      check('zero-radius', '零圆角 --radius-lg = 0', 2, (c) =>
        near(lenRem(c.L['--radius-lg']) ?? 1, 0, 0.01, 'rem')
      ),
      check('thick-border', '粗边框 --surface-border-width = 3px', 1, (c) =>
        atLeast(lenRem(c.L['--surface-border-width']) * 16, 3, 'px')
      ),
      check('pastel-primary', '糖果柔彩 primary (0.08 ≤ C ≤ 0.17, L ≥ 0.7)', 1, (c) => {
        const p = c.color(c.L['--color-primary']);
        if (!p) return bool(false, 'primary 无法解析');
        const ok = p.oklch.C >= 0.08 && p.oklch.C <= 0.17 && p.oklch.L >= 0.7;
        return bool(ok, `primary L=${p.oklch.L.toFixed(2)} C=${p.oklch.C.toFixed(2)}`);
      }),
      check('mono', '等宽正文字体', 1, (c) =>
        bool(/Mono|Fira Code/i.test(c.fontSans), `font-sans=${short(c.fontSans)}`)
      ),
      check('hover-pop', 'hover 阴影弹出 --surface-hover-shadow', 1, (c) =>
        bool(
          /-?\d+px -?\d+px 0\b/.test(c.L['--surface-hover-shadow'] || ''),
          `hover=${short(c.L['--surface-hover-shadow'])}`
        )
      ),
    ],
  },
};

// Small result builders for voice checks → { score: 0..1, detail }.
function bool(ok, detail) {
  return { score: ok ? 1 : 0, detail };
}
function atLeast(v, min, unit = '') {
  if (v == null) return { score: 0, detail: `缺失 (需 ≥ ${min}${unit})` };
  const ok = v >= min;
  // partial credit when within 15% below target
  const score = ok ? 1 : clamp01(1 - (min - v) / (min * 0.15));
  return { score, detail: `${fmt(v)}${unit} (需 ≥ ${min}${unit})` };
}
function atMost(v, max, unit = '') {
  if (v == null) return { score: 0, detail: `缺失 (需 ≤ ${max}${unit})` };
  const ok = v <= max;
  const span = Math.abs(max * 0.15) || 0.05;
  const score = ok ? 1 : clamp01(1 - (v - max) / span);
  return { score, detail: `${fmt(v)}${unit} (需 ≤ ${max}${unit})` };
}
function near(v, target, tol, unit = '') {
  if (v == null) return { score: 0, detail: `缺失 (目标 ${target}${unit})` };
  const d = Math.abs(v - target);
  const score = clamp01(1 - d / (tol * 3));
  return { score, detail: `${fmt(v)}${unit} (目标 ${target}±${tol}${unit})` };
}
const fmt = (n) => (Math.round(n * 1000) / 1000).toString();
const short = (s) => {
  if (!s) return '∅';
  const v = String(s).split(',')[0].trim();
  return v.length > 28 ? v.slice(0, 27) + '…' : v;
};

// ============================================================================
// 4. Scoring engine.
// ============================================================================

const WEIGHTS = {
  completeness: 20,
  accessibility: 30,
  brand: 25,
  voice: 25,
};

const REQUIRED_OVERRIDES = [
  '--color-primary',
  '--color-primary-foreground',
  '--color-ring',
  '--color-accent',
];

// bg/fg pairs to contrast-check, with the WCAG target each should hit.
//
// Two thresholds, by content type:
//   4.5 — body text (WCAG 1.4.3 AA, normal text): background/card/muted
//         foregrounds carry paragraphs and secondary copy.
//   3.0 — large text (WCAG 1.4.3 AA, ≥18px or ≥14px bold): the
//         primary/secondary/accent/destructive pairs are BUTTON FILLS whose
//         only text is a short, bold/large label, so the large-text bar is
//         the correct standard for them. (Holding a vivid brand button to
//         4.5:1 would force it off-brand — Apple's own systemBlue buttons
//         sit ~4:1 by design.)
const CONTRAST_PAIRS = [
  ['--color-background', '--color-foreground', 4.5, '正文/背景'],
  ['--color-card', '--color-card-foreground', 4.5, '卡片'],
  ['--color-muted', '--color-muted-foreground', 4.5, '弱化文本'],
  ['--color-primary', '--color-primary-foreground', 3, '主按钮(大字)'],
  ['--color-secondary', '--color-secondary-foreground', 3, '次按钮(大字)'],
  ['--color-accent', '--color-accent-foreground', 3, '强调(大字)'],
  ['--color-destructive', '--color-destructive-foreground', 3, '危险(大字)'],
];

function makeColor(value) {
  const oklch = parseOklch(value);
  if (!oklch) return null;
  const lab = oklchToOklab(oklch);
  const srgb = oklabToSrgb(lab);
  return { oklch, lab, srgb, alpha: oklch.alpha };
}

function scorePreset(name, stylesheet) {
  const spec = SPECS[name] || { label: name, inspiration: '—', voice: [] };
  const preset = stylesheet.presets[name] || { light: {}, dark: {} };

  // Effective cascade (see file header for the specificity reasoning).
  const L = resolveVars({
    ...stylesheet.baseLight,
    ...preset.light,
  });
  const D = resolveVars({
    ...stylesheet.baseLight,
    ...stylesheet.baseDark,
    ...preset.light,
    ...preset.dark,
  });

  const ctx = {
    L,
    D,
    color: makeColor,
    fontSans: L['--font-sans'] || '',
    fontMono: L['--font-mono'] || '',
  };

  const findings = [];

  // --- Dimension 1: completeness -------------------------------------------
  let completeness;
  if (spec.requireOverrides === false) {
    completeness = { score: 1, findings: [] };
  } else {
    let got = 0;
    const localFindings = [];
    for (const tok of REQUIRED_OVERRIDES) {
      if (preset.light[tok] != null) got++;
      else localFindings.push(`light 块缺少必需覆写 ${tok}`);
    }
    const hasDark = Object.keys(preset.dark).length > 0;
    if (!hasDark)
      localFindings.push('缺少 .dark 半身（基础 .dark 会击穿 → 暗色还原失败）');
    // dark should re-tune at least primary or background
    const darkTunesCore =
      preset.dark['--color-primary'] != null ||
      preset.dark['--color-background'] != null;
    if (hasDark && !darkTunesCore)
      localFindings.push('dark 块未重调 primary/background（可能对比不足）');

    const overrideRatio = got / REQUIRED_OVERRIDES.length;
    const darkScore = hasDark ? (darkTunesCore ? 1 : 0.6) : 0;
    completeness = {
      score: overrideRatio * 0.6 + darkScore * 0.4,
      findings: localFindings,
    };
  }
  for (const f of completeness.findings)
    findings.push({ dim: 'complete', msg: f });

  // --- Dimension 2: accessibility (light + dark) ----------------------------
  const a11y = scoreContrast(L, D, findings);

  // --- Dimension 3: brand fidelity ------------------------------------------
  const brand = scoreBrand(spec, L, findings);

  // --- Dimension 4: design voice --------------------------------------------
  const voice = scoreVoice(spec, ctx, findings);

  // --- weighted total -------------------------------------------------------
  const dims = {
    completeness: { ...completeness, weight: WEIGHTS.completeness },
    accessibility: { ...a11y, weight: WEIGHTS.accessibility },
    brand: { ...brand, weight: brand.applicable ? WEIGHTS.brand : 0 },
    voice: { ...voice, weight: WEIGHTS.voice },
  };
  let totalW = 0;
  let totalS = 0;
  for (const k of Object.keys(dims)) {
    totalW += dims[k].weight;
    totalS += dims[k].score * dims[k].weight;
  }
  const total = Math.round((totalS / totalW) * 100);

  return { name, label: spec.label, inspiration: spec.inspiration, total, dims, findings };
}

function scoreContrast(L, D, findings) {
  let sum = 0;
  let count = 0;
  for (const [bgTok, fgTok, target, label] of CONTRAST_PAIRS) {
    for (const [mode, map] of [
      ['light', L],
      ['dark', D],
    ]) {
      const bg = makeColor(map[bgTok]);
      const fg = makeColor(map[fgTok]);
      if (!bg || !fg) continue; // token absent / not oklch → don't penalize
      const fgComp =
        fg.alpha < 1 ? compositeOver(fg.srgb, fg.alpha, bg.srgb) : fg.srgb;
      const ratio = contrastRatio(luminance(bg.srgb), luminance(fgComp));
      count++;
      // full credit at target, partial down to target*0.6
      const floor = target * 0.6;
      const s =
        ratio >= target
          ? 1
          : clamp01((ratio - floor) / (target - floor));
      sum += s;
      if (ratio < target)
        findings.push({
          dim: 'a11y',
          msg: `${mode} ${label} 对比 ${ratio.toFixed(2)}:1 < ${target}:1 (${bgTok}/${fgTok})`,
        });
    }
  }
  return { score: count ? sum / count : 1, findings: [] };
}

function scoreBrand(spec, L, findings) {
  const anchors = spec.anchors;
  if (!anchors && !spec.inkPrimary)
    return { applicable: false, score: 1, findings: [] };

  let sum = 0;
  let count = 0;

  const grade = (tokenVal, anchorHex, label) => {
    const c = makeColor(tokenVal);
    if (!c) {
      findings.push({ dim: 'brand', msg: `${label} 无法解析，跳过比对` });
      return;
    }
    const target = hexToOklab(anchorHex);
    const anchorH = oklabHue(target);
    const anchorC = Math.hypot(target.a, target.b);
    const dL = Math.abs(c.oklch.L - target.L);

    let s;
    let detail;
    if (anchorC < 0.03) {
      // Neutral anchor (e.g. a near-white background): hue is meaningless,
      // so grade on lightness match + staying near-neutral.
      const lightScore = clamp01(1 - dL / 0.15);
      const neutralScore =
        c.oklch.C < 0.04 ? 1 : clamp01(1 - (c.oklch.C - 0.04) / 0.1);
      s = 0.7 * lightScore + 0.3 * neutralScore;
      detail = `明度差 ${dL.toFixed(2)} · 饱和 ${c.oklch.C.toFixed(3)}`;
    } else {
      // Chromatic anchor: brand identity lives in HUE first, chroma second.
      // Lightness is a UI decision (a darker/lighter shade of the brand hue
      // per surface / contrast need), so it's treated leniently.
      const dH = hueDelta(c.oklch.H, anchorH);
      const hueScore = clamp01(1 - (dH - 8) / (45 - 8));
      const ratio = c.oklch.C / anchorC;
      let chromaScore = 1;
      if (ratio < 0.6) chromaScore = clamp01(ratio / 0.6);
      else if (ratio > 1.7) chromaScore = clamp01(1 - (ratio - 1.7) / 1.3);
      const lightScore = clamp01(1 - Math.max(0, dL - 0.2) / 0.5);
      s = 0.62 * hueScore + 0.23 * chromaScore + 0.15 * lightScore;
      detail = `色相差 ${dH.toFixed(0)}° · 饱和比 ${ratio.toFixed(2)} · 明度差 ${dL.toFixed(2)}`;
    }

    sum += s;
    count++;
    if (s < 0.85)
      findings.push({ dim: 'brand', msg: `${label} 偏离锚色 ${anchorHex}：${detail}` });
  };

  if (spec.inkPrimary) {
    // primary should read as ink (very dark in light mode)
    const p = makeColor(L['--color-primary']);
    if (p) {
      const ok = p.oklch.L < 0.25 && p.oklch.C < 0.03;
      const s = ok ? 1 : clamp01(1 - (p.oklch.L - 0.25) / 0.25);
      sum += s;
      count++;
      if (!ok)
        findings.push({
          dim: 'brand',
          msg: `primary 应为墨黑 (L<0.25,C≈0)，实际 L=${p.oklch.L.toFixed(2)} C=${p.oklch.C.toFixed(2)}`,
        });
    }
  }
  if (anchors?.primary) grade(L['--color-primary'], anchors.primary, 'primary');
  if (anchors?.ring) grade(L['--color-ring'], anchors.ring, 'ring');
  if (anchors?.background)
    grade(L['--color-background'], anchors.background, 'background');

  return { applicable: true, score: count ? sum / count : 1, findings: [] };
}

function oklabHue(lab) {
  const h = (Math.atan2(lab.b, lab.a) * 180) / Math.PI;
  return (h + 360) % 360;
}

function scoreVoice(spec, ctx, findings) {
  const checks = spec.voice || [];
  if (checks.length === 0) return { score: 1, findings: [] };
  let sumW = 0;
  let sumS = 0;
  for (const c of checks) {
    const res = c.run(ctx);
    sumW += c.weight;
    sumS += res.score * c.weight;
    if (res.score < 0.85)
      findings.push({
        dim: 'voice',
        msg: `${c.label} — ${res.detail}`,
      });
  }
  return { score: sumW ? sumS / sumW : 1, findings: [] };
}

// ============================================================================
// 5. Reporting.
// ============================================================================

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};
const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (s, ...codes) => (useColor ? codes.join('') + s + C.reset : s);

function scoreColor(score) {
  if (score >= 90) return C.green;
  if (score >= 75) return C.cyan;
  if (score >= 60) return C.yellow;
  return C.red;
}
function bar(score, width = 20) {
  const filled = Math.round((score / 100) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}
function stars(score) {
  const n = Math.round((score / 100) * 5 * 2) / 2; // half-star precision
  const full = Math.floor(n);
  const half = n - full >= 0.5;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - (half ? 1 : 0));
}

function printReport(results) {
  console.log('');
  console.log(
    paint('  Design 风格审计', C.bold) +
      paint('  —  每个 --design 选项 vs. 其设计标准', C.gray)
  );
  console.log(
    paint(
      '  维度权重：完整度 20 · 可达性(对比) 30 · 品牌色还原 25 · 设计味道 25',
      C.gray
    )
  );
  console.log('');

  const sorted = [...results].sort((a, b) => b.total - a.total);
  for (const r of sorted) {
    const sc = scoreColor(r.total);
    console.log(
      `  ${paint(r.name.padEnd(15), C.bold)} ${paint(bar(r.total), sc)} ` +
        `${paint(String(r.total).padStart(3) + '/100', sc, C.bold)}  ` +
        paint(stars(r.total), C.yellow) +
        paint(`   ${r.inspiration}`, C.gray)
    );

    const d = r.dims;
    const seg = (label, dim) => {
      if (dim.weight === 0) return paint(`${label} —不适用`, C.gray);
      const pct = Math.round(dim.score * 100);
      return `${label} ${paint(String(pct).padStart(3), scoreColor(pct))}`;
    };
    console.log(
      paint(
        `      ${seg('完整', d.completeness)}  ${seg('对比', d.accessibility)}  ` +
          `${seg('品牌', d.brand)}  ${seg('味道', d.voice)}`,
        C.dim
      )
    );

    if (r.findings.length) {
      const tag = {
        complete: paint('完整', C.cyan),
        a11y: paint('对比', C.red),
        brand: paint('品牌', C.yellow),
        voice: paint('味道', C.cyan),
      };
      const show = r.findings.slice(0, 8);
      for (const f of show)
        console.log(paint('        ▸ ', C.gray) + `[${tag[f.dim]}] ${f.msg}`);
      if (r.findings.length > show.length)
        console.log(
          paint(`        … 另有 ${r.findings.length - show.length} 项`, C.gray)
        );
    } else {
      console.log(paint('        ✓ 无明显失分项', C.green));
    }
    console.log('');
  }

  const avg = Math.round(
    results.reduce((s, r) => s + r.total, 0) / results.length
  );
  console.log(
    paint('  平均分：', C.bold) +
      paint(`${avg}/100`, scoreColor(avg), C.bold) +
      paint(`   (${results.length} 个 preset)`, C.gray)
  );
  console.log('');
}

// ============================================================================
// 6. CLI.
// ============================================================================

function main() {
  const argv = process.argv.slice(2);
  let cssPath = path.resolve(
    __dirname,
    '..',
    'packages',
    'template-react',
    'src',
    'styles',
    'index.css'
  );
  let json = false;
  let min = null;
  const only = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') json = true;
    else if (a === '--css') cssPath = path.resolve(argv[++i]);
    else if (a === '--min') min = Number(argv[++i]);
    else if (a === '--help' || a === '-h') {
      console.log(
        'Usage: node scripts/audit-design.mjs [presets…] [--json] [--css <path>] [--min <score>]'
      );
      return;
    } else if (!a.startsWith('-')) only.push(a);
  }

  let css;
  try {
    css = readFileSync(cssPath, 'utf8');
  } catch (e) {
    console.error(`无法读取 CSS：${cssPath}\n${e.message}`);
    process.exit(2);
  }

  const stylesheet = parseStylesheet(css);
  const names = (only.length ? only : Object.keys(stylesheet.presets)).filter(
    (n) => stylesheet.presets[n]
  );
  if (only.length) {
    const missing = only.filter((n) => !stylesheet.presets[n]);
    if (missing.length)
      console.error(`未找到 preset：${missing.join(', ')}`);
  }
  if (names.length === 0) {
    console.error('CSS 中没有解析到任何 design preset 块。');
    process.exit(2);
  }

  const results = names.map((n) => scorePreset(n, stylesheet));

  if (json) {
    const payload = results.map((r) => ({
      name: r.name,
      label: r.label,
      total: r.total,
      dimensions: Object.fromEntries(
        Object.entries(r.dims).map(([k, v]) => [
          k,
          { score: Math.round(v.score * 100), weight: v.weight },
        ])
      ),
      findings: r.findings,
    }));
    console.log(JSON.stringify(payload, null, 2));
  } else {
    printReport(results);
  }

  if (min != null) {
    const failed = results.filter((r) => r.total < min);
    if (failed.length) {
      if (!json)
        console.error(
          paint(
            `  ✗ ${failed.length} 个 preset 低于阈值 ${min}：` +
              failed.map((r) => `${r.name}(${r.total})`).join(', '),
            C.red
          )
        );
      process.exit(1);
    }
  }
}

main();
