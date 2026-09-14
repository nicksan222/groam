import type { Id } from '@groam/backend/data-model';
import { createStore } from 'zustand/vanilla';
import type { StayDraft } from '@/features/trips/hooks/trip-destination-form-state';

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
type TripStayEditorStore = {
  draft: StayDraft;
  editingId: Id<'tripDestinationStays'> | 'new' | null;
  patchDraft: (value: Partial<StayDraft>) => void;
  resetDraft: (draft: StayDraft) => void;
  setEditingId: (editingId: Id<'tripDestinationStays'> | 'new' | null) => void;
};

export function createTripStayEditorStore(initialDraft: StayDraft) {
  return createStore<TripStayEditorStore>()((set) => ({
    draft: initialDraft,
    editingId: null,
    patchDraft: (value) => set((state) => ({ draft: { ...state.draft, ...value } })),
    resetDraft: (draft) => set({ draft, editingId: null }),
    setEditingId: (editingId) => set({ editingId })
  }));
}
