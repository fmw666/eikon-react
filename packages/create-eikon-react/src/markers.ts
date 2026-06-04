/**
 * @file markers.ts
 * @description The marker grammar and block-pairing strip engine. This is the
 * regex core that powers feature/variant stripping; `strip-features.ts`
 * orchestrates the filesystem walk on top of it and `simulate-strip.ts` (in
 * preview-site) reuses the exported regexes. Pure string-in/string-out — no fs.
 *
 * Comment markers used inside template source files to delimit optional code.
 *
 *   // @eikon:feature(name) begin
 *   …code…
 *   // @eikon:feature(name) end
 *
 * Or for whole-file ownership (MUST be the very first line of the file — see
 * FILE_MARKER_RE below):
 *
 *   // @eikon:feature(name) file
 *
 * The leading slashes may be preceded by `{/*`, JSX `{/*` style, or `<!--` for
 * env files; we treat them all as line-level markers and just match the token.
 */

// IMPORTANT — the `\\*\\/\\}?` shape (no whitespace between `*/` and the
// optional `}`) is load-bearing. Earlier iterations used `\\*\\/\\s*\\}?`
// which made the closing-brace optional even across newlines. That
// silently swallowed the `@theme {…}` close brace whenever a marker block
// sat next to it (e.g. when stripping `--touch-target-min` from
// `src/styles/index.css`), turning the next `}` into part of the marker
// match. JSX-style `{/* … */}` keeps `*/}` adjacent, so requiring
// adjacency is also semantically correct — never reintroduce `\\s*` here.
export const BLOCK_RE =
  /[ \t]*(?:\/\/|\/\*|\{\/\*|#|<!--)\s*@eikon:feature\(([^)]+)\)\s*begin\s*(?:\*\/\}?|-->)?[ \t]*\r?\n?/g;
const BLOCK_END_RE_SRC =
  '[ \\t]*(?:\\/\\/|\\/\\*|\\{\\/\\*|#|<!--)\\s*@eikon:feature\\(NAME\\)\\s*end\\s*(?:\\*\\/\\}?|-->)?[ \\t]*\\r?\\n?';
// File-level markers are only honoured on the FIRST LINE of the file. This is
// the convention used by every real consumer in the template (see
// `src/shared/supabase/client.ts:1`, …) and the
// constraint is load-bearing: without it, any documentation file that quotes
// the marker as a literal — like `.agent/skills/enable-supabase/SKILL.md` —
// gets silently deleted whenever the corresponding feature is stripped.
// The regex is intentionally NOT multiline (`m` flag) so `^` anchors to
// string start, not line start.
export const FILE_MARKER_RE =
  /^[ \t]*(?:\/\/|\/\*|\{\/\*|#|<!--)\s*@eikon:feature\(([^)]+)\)\s*file[^\n]*/;

/**
 * Variant grammar — same comment shapes as features but with an `axis=value`
 * payload. Examples (axis/value names below are illustrative; this module
 * is unaware of which axis/value pairs are valid — that knowledge lives in
 * `VARIANT_CHOICES` in `index.ts`):
 *
 *   // @eikon:variant(design=<value>) begin
 *   …kept only when design === '<value>'…
 *   // @eikon:variant(design=<value>) end
 *
 *   // @eikon:variant(layout=sidebar) file
 *   …whole file kept only when layout === 'sidebar'…
 *
 * Same first-line constraint as FILE_MARKER_RE — see comment above for why.
 */
export const VARIANT_FILE_MARKER_RE =
  /^[ \t]*(?:\/\/|\/\*|\{\/\*|#|<!--)\s*@eikon:variant\(([^=)]+)=([^)]+)\)\s*file[^\n]*/;

/**
 * Cache compiled regexes by feature name. The cost of `new RegExp(...)` is
 * small in absolute terms, but `stripFeatures` calls this once per
 * `(file × disabled-feature)` — without caching, a ~60 file template with
 * one disabled feature recompiles the same regex 60 times. Module-level
 * cache means one compile per feature per CLI run.
 */
const featureRegexCache = new Map<string, RegExp>();

function regexForFeature(feature: string): RegExp {
  let re = featureRegexCache.get(feature);
  if (re) return re;
  const escaped = feature.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // See header comment on BLOCK_RE — `\\*\\/\\}?` (no whitespace) is
  // load-bearing; do not reintroduce `\\s*` between `*/` and `\\}?`.
  const beginPart =
    '[ \\t]*(?:\\/\\/|\\/\\*|\\{\\/\\*|#|<!--)\\s*@eikon:feature\\(' +
    escaped +
    '\\)\\s*begin\\s*(?:\\*\\/\\}?|-->)?[ \\t]*\\r?\\n?';
  const endPart = BLOCK_END_RE_SRC.replace('NAME', escaped);
  re = new RegExp(beginPart + '[\\s\\S]*?' + endPart, 'g');
  featureRegexCache.set(feature, re);
  return re;
}

export function stripBlocksForFeature(input: string, feature: string): string {
  // Stateful flag (`g`) means we must reset lastIndex between calls; using
  // `String.prototype.replace` with a global regex already does the right
  // thing (it ignores lastIndex), so caching the compiled regex is safe.
  return input.replace(regexForFeature(feature), '');
}

/**
 * Cache regex by axis name. The regex captures the value via a group, so
 * a single compiled regex per axis serves every keepValue selection.
 */
const variantRegexCache = new Map<string, RegExp>();

function regexForVariantAxis(axis: string): RegExp {
  let re = variantRegexCache.get(axis);
  if (re) return re;
  const escAxis = axis.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // See header comment on BLOCK_RE — `\\*\\/\\}?` (no whitespace) is
  // load-bearing; do not reintroduce `\\s*` between `*/` and `\\}?`.
  // The CSS regression that motivated this: a `/* @eikon:variant(...)
  // end */` line inside `@theme { ... }` would, with `\\s*\\}?`,
  // greedy-eat the next-line `}` along with the marker, breaking
  // brace balance for the Tailwind v4 parser.
  const beginPart =
    '[ \\t]*(?:\\/\\/|\\/\\*|\\{\\/\\*|#|<!--)\\s*@eikon:variant\\(' +
    escAxis +
    '=([^)]+)\\)\\s*begin\\s*(?:\\*\\/\\}?|-->)?[ \\t]*\\r?\\n?';
  const endPart =
    '[ \\t]*(?:\\/\\/|\\/\\*|\\{\\/\\*|#|<!--)\\s*@eikon:variant\\(' +
    escAxis +
    '=\\1\\)\\s*end\\s*(?:\\*\\/\\}?|-->)?[ \\t]*\\r?\\n?';
  re = new RegExp(beginPart + '[\\s\\S]*?' + endPart, 'g');
  variantRegexCache.set(axis, re);
  return re;
}

/**
 * Drop every `@eikon:variant(<axis>=<other-value>)` block where the value
 * does NOT match `keepValue`. Blocks for `keepValue` are left as-is (marker
 * comments included), mirroring how stripBlocksForFeature treats kept
 * features.
 */
export function stripBlocksForVariant(
  input: string,
  axis: string,
  keepValue: string
): string {
  // The closing-marker pattern uses a `\1` back-reference so a single
  // regex pass correctly pairs `begin` with the matching `end` for the
  // SAME variant value. Capture group 1 is `([^)]+)` — the variant
  // value (e.g. `mobile-drawer`). Adding any capture group BEFORE this
  // point will shift `\1` to a different group and silently mis-pair
  // markers, leaving dead text behind. If you must add a group, use a
  // non-capturing group `(?:...)` or update `\1` to the new index.
  return input.replace(regexForVariantAxis(axis), (match, value: string) =>
    value === keepValue ? match : ''
  );
}
