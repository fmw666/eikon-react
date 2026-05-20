import {
  PARAMS,
  coercePlatform,
  coerceValue,
  defaultState,
  getParam,
  type ParamState,
  type Platform,
} from './params-schema';

/**
 * Encode a full ParamState into a query string suitable for the iframe URL.
 * Boolean values are serialized as `on` / `off` (more readable than `true`/`false`).
 * Defaults are emitted too so that the frame can reliably round-trip on reload.
 */
export function serializeToQuery(state: ParamState): string {
  const sp = new URLSearchParams();
  for (const def of PARAMS) {
    const v = state[def.id];
    if (def.kind === 'boolean') {
      sp.set(def.id, v ? 'on' : 'off');
    } else {
      sp.set(def.id, String(v));
    }
  }
  return sp.toString();
}

/**
 * Decode a query string (or URLSearchParams) into a partial ParamState. Unknown
 * params are ignored; invalid values for a known param are dropped.
 *
 * Two-pass strategy: extract `platform` first so the second pass can apply
 * cross-axis narrowing (`coerceValue(def, raw, platform)`) — otherwise a deep
 * link like `?platform=mobile&layout=sidebar` would survive parsing and only
 * snap inside the store, which is too late for callers that want the raw
 * partial state to already be self-consistent.
 */
export function parseFromQuery(
  input: string | URLSearchParams
): Partial<ParamState> {
  const sp = typeof input === 'string' ? new URLSearchParams(input) : input;
  const platform = pickPlatform(sp);
  const out: Partial<Record<string, boolean | string>> = {};
  if (platform) out['platform'] = platform;
  sp.forEach((raw, key) => {
    if (key === 'platform') return; // already handled
    const def = getParam(key);
    if (!def) return;
    const value = coerceValue(def, raw, platform);
    if (value !== undefined) out[key] = value;
  });
  return out as Partial<ParamState>;
}

/**
 * Extract the platform value from the query string if present and valid.
 * Returns `undefined` when the query string carries no `platform=` key,
 * which lets `parseFromQuery` defer to the schema default — and lets the
 * URL parser stay lossless for queries from clients that predate the
 * platform axis.
 */
function pickPlatform(sp: URLSearchParams): Platform | undefined {
  const raw = sp.get('platform');
  if (raw == null) return undefined;
  const def = getParam('platform');
  if (!def || def.kind !== 'enum') return undefined;
  const v = coerceValue(def, raw);
  return typeof v === 'string' ? coercePlatform(v) : undefined;
}

/**
 * Merge a partial param state on top of the schema defaults.
 */
export function mergeWithDefaults(
  partial: Partial<ParamState> | undefined
): ParamState {
  return { ...defaultState(), ...(partial ?? {}) } as ParamState;
}
