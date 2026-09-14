import { createStore } from 'zustand/vanilla';

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
type TripDurationPlannerStore = {
  from: string;
  openField: 'end' | 'start' | null;
  setField: (field: 'end' | 'start' | null) => void;
  setFrom: (from: string) => void;
  setRange: (from: string, to: string) => void;
  setTo: (to: string) => void;
  to: string;
};

export function createTripDurationPlannerStore(from: string, to: string) {
  return createStore<TripDurationPlannerStore>()((set) => ({
    from,
    openField: null,
    setField: (openField) => set({ openField }),
    setFrom: (nextFrom) => set({ from: nextFrom }),
    setRange: (nextFrom, nextTo) => set({ from: nextFrom, to: nextTo }),
    setTo: (nextTo) => set({ to: nextTo }),
    to
  }));
}
