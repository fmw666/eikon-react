import { create } from 'zustand';

export interface CounterState {
  value: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

export const useCounterStore = create<CounterState>((set) => ({
  value: 0,
  increment: () => set((s) => ({ value: s.value + 1 })),
  decrement: () => set((s) => ({ value: Math.max(0, s.value - 1) })),
  reset: () => set({ value: 0 }),
}));
