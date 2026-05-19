import {
  PARAMS,
  coerceValue,
  defaultState,
  getParam,
  type ParamState,
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
 */
export function parseFromQuery(
  input: string | URLSearchParams
): Partial<ParamState> {
  const sp = typeof input === 'string' ? new URLSearchParams(input) : input;
  const out: Partial<Record<string, boolean | string>> = {};
  sp.forEach((raw, key) => {
    const def = getParam(key);
    if (!def) return;
    const value = coerceValue(def, raw);
    if (value !== undefined) out[key] = value;
  });
  return out as Partial<ParamState>;
}

/**
 * Merge a partial param state on top of the schema defaults.
 */
export function mergeWithDefaults(
  partial: Partial<ParamState> | undefined
): ParamState {
  return { ...defaultState(), ...(partial ?? {}) } as ParamState;
}
