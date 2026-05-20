import { create } from 'zustand';

import {
  PARAMS,
  coercePlatform,
  defaultState,
  getEffectiveDefault,
  getEffectiveValues,
  isAvailable,
  type ParamId,
  type ParamState,
  type ParamValue,
  type Platform,
} from './params-schema';

export interface ParamsStore {
  state: ParamState;
  setParam: <K extends ParamId>(id: K, value: ParamValue) => void;
  replaceAll: (next: Partial<ParamState>) => void;
  reset: () => void;
}

/**
 * Factory so the shell and the frame each get their own isolated store
 * instance — they share the schema but never share React state across the
 * iframe boundary (state is propagated via postMessage / query string).
 *
 * Cross-axis snap on `platform` change:
 *   When `setParam('platform', next)` is called, every other param is
 *   re-validated against the new platform's `availableWhen` / `valuesWhen`.
 *   If a current value is no longer accepted, it snaps to the new
 *   platform's effective default. This is what makes the playground's
 *   "switching tab also resets some choices below" behaviour coherent
 *   without leaking the rule into the UI layer.
 */
export function createParamsStore(initial?: Partial<ParamState>) {
  const initialState = { ...defaultState(), ...(initial ?? {}) } as ParamState;
  // On boot, normalise against the (possibly URL-supplied) initial platform
  // so a deep-link like `?platform=mobile&layout=sidebar` doesn't leave the
  // store with an impossible combination — the layout snaps to the mobile
  // default before the first render.
  const normalised = snapToPlatform(
    initialState,
    coercePlatform(initialState.platform)
  );
  return create<ParamsStore>((set) => ({
    state: normalised,
    setParam: (id, value) =>
      set((s) => {
        const next = { ...s.state, [id]: value } as ParamState;
        if (id === 'platform') {
          return { state: snapToPlatform(next, coercePlatform(value)) };
        }
        return { state: next };
      }),
    replaceAll: (next) =>
      set((s) => {
        const merged = { ...s.state, ...next } as ParamState;
        return {
          state: snapToPlatform(merged, coercePlatform(merged.platform)),
        };
      }),
    reset: () => set({ state: defaultState() }),
  }));
}

/**
 * Pure helper: walk every param and replace any value invalid under the
 * chosen platform with that platform's effective default. Boolean and enum
 * params are both handled. The `platform` value itself is preserved.
 *
 * Exported for unit testing — callers normally go through the store.
 */
export function snapToPlatform(
  state: ParamState,
  platform: Platform
): ParamState {
  const out = { ...state } as Record<string, ParamValue>;
  for (const def of PARAMS) {
    if (def.id === 'platform') continue;
    if (!isAvailable(def, platform)) {
      // The control disappears from the UI under this platform; reset it to
      // the cross-axis default so the hidden value doesn't surface again
      // when the user switches platform back.
      out[def.id] = getEffectiveDefault(def, platform);
      continue;
    }
    if (def.kind === 'enum') {
      const allowed = getEffectiveValues(def, platform);
      const current = out[def.id];
      if (typeof current !== 'string' || !allowed.includes(current)) {
        out[def.id] = getEffectiveDefault(def, platform);
      }
    }
    // Boolean params currently never narrow per-platform; nothing to snap.
  }
  return out as ParamState;
}
