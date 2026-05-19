import { create } from 'zustand';

import {
  defaultState,
  type ParamId,
  type ParamState,
  type ParamValue,
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
 */
export function createParamsStore(initial?: Partial<ParamState>) {
  return create<ParamsStore>((set) => ({
    state: { ...defaultState(), ...(initial ?? {}) },
    setParam: (id, value) =>
      set((s) => ({ state: { ...s.state, [id]: value } })),
    replaceAll: (next) =>
      set((s) => ({ state: { ...s.state, ...next } })),
    reset: () => set({ state: defaultState() }),
  }));
}
