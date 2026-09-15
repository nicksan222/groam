import { create } from 'zustand';

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
type GroupActionsStore = {
  clearError: () => void;
  error: string | null;
  pendingAction: string | null;
  setError: (error: string | null) => void;
  setPendingAction: (pendingAction: string | null) => void;
};

/** Group management pending/error chrome — action handlers stay in the hook. */
export const useGroupActionsStore = create<GroupActionsStore>((set) => ({
  clearError: () => set({ error: null }),
  error: null,
  pendingAction: null,
  setError: (error) => set({ error }),
  setPendingAction: (pendingAction) => set({ pendingAction })
}));
