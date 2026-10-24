import { create } from 'zustand';
import type { TripSectionRequest } from '@/types/trips';

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
export type TripCreateRequestStore = {
  clear: () => void;
  /** Asks the section on screen to open its create dialog, or its filter/sort dialogs. */
  request: (kind: TripSectionRequest) => void;
  requested: { kind: TripSectionRequest; nonce: number } | null;
};

/** The page header's creation button asks the section body, which owns the dialog, to open it. */
export const useTripCreateRequestStore = create<TripCreateRequestStore>((set) => ({
  clear: () => set({ requested: null }),
  request: (kind) =>
    set((state) => ({ requested: { kind, nonce: (state.requested?.nonce ?? 0) + 1 } })),
  requested: null
}));
