import type { Id } from '@groam/backend/data-model';
import { create } from 'zustand';
import type { CreateTripIdeaIntent } from '@/features/trips/hooks/use-create-trip-idea-dialog';

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
type StartIdeaDialogStore = {
  dialogOpen: boolean;
  isCreating: boolean;
  resetSelection: () => void;
  selectedTripId: Id<'trips'> | '';
  setCreating: (isCreating: boolean) => void;
  setDialogOpen: (dialogOpen: boolean) => void;
  setSelectedTripId: (selectedTripId: Id<'trips'> | '') => void;
};

export const useStartIdeaDialogStore = create<StartIdeaDialogStore>((set) => ({
  dialogOpen: false,
  isCreating: false,
  selectedTripId: '',
  resetSelection: () => set({ selectedTripId: '' }),
  setCreating: (isCreating) => set({ isCreating }),
  setDialogOpen: (dialogOpen) => set({ dialogOpen }),
  setSelectedTripId: (selectedTripId) => set({ selectedTripId })
}));

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
type CreateTripIdeaDialogStore = {
  dialogOpen: boolean;
  intent: CreateTripIdeaIntent;
  isCreating: boolean;
  openWithIntent: (intent?: Partial<CreateTripIdeaIntent>) => void;
  setCreating: (isCreating: boolean) => void;
  setDialogOpen: (dialogOpen: boolean) => void;
};

const defaultIntent: CreateTripIdeaIntent = {
  addDestination: false,
  section: 'overview'
};

export const useCreateTripIdeaDialogStore = create<CreateTripIdeaDialogStore>((set) => ({
  dialogOpen: false,
  intent: defaultIntent,
  isCreating: false,
  openWithIntent: (intent) =>
    set({
      dialogOpen: true,
      intent: {
        addDestination: intent?.addDestination ?? false,
        section: intent?.section ?? 'overview'
      }
    }),
  setCreating: (isCreating) => set({ isCreating }),
  setDialogOpen: (dialogOpen) => set({ dialogOpen })
}));

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
type TripSidebarActionsStore = {
  pendingTripId: Id<'trips'> | null;
  setPendingTripId: (pendingTripId: Id<'trips'> | null) => void;
};

export const useTripSidebarActionsStore = create<TripSidebarActionsStore>((set) => ({
  pendingTripId: null,
  setPendingTripId: (pendingTripId) => set({ pendingTripId })
}));
