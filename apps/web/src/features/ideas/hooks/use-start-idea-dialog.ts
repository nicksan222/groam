import { useNavigate } from '@tanstack/react-router';
import { useCallback } from 'react';
import { useCreateIdea } from '@/features/ideas/hooks/use-workspace-ideas';
import { ideaCloneHref } from '@/features/ideas/idea-href';
import { useStartIdeaDialogStore } from '@/lib/stores/trip-ui-stores';

export function useStartIdeaDialog() {
  const createIdea = useCreateIdea();
  const navigate = useNavigate();
  const dialogOpen = useStartIdeaDialogStore((state) => state.dialogOpen);
  const isCreating = useStartIdeaDialogStore((state) => state.isCreating);
  const selectedTripId = useStartIdeaDialogStore((state) => state.selectedTripId);
  const setDialogOpen = useStartIdeaDialogStore((state) => state.setDialogOpen);
  const setCreating = useStartIdeaDialogStore((state) => state.setCreating);
  const setSelectedTripId = useStartIdeaDialogStore((state) => state.setSelectedTripId);
  const resetSelection = useStartIdeaDialogStore((state) => state.resetSelection);

  const openDialog = useCallback(() => setDialogOpen(true), [setDialogOpen]);

  const onOpenChange = useCallback(
    (open: boolean) => {
      setDialogOpen(open);
      if (!open) resetSelection();
    },
    [resetSelection, setDialogOpen]
  );

  const startIdea = useCallback(
    async (title?: string) => {
      if (!selectedTripId) return;
      setCreating(true);
      try {
        const version = await createIdea(selectedTripId, title);
        if (version) {
          setDialogOpen(false);
          resetSelection();
          void navigate(
            ideaCloneHref({ id: version.proposalId, sourceTripId: selectedTripId }, 'overview')
          );
        }
      } finally {
        setCreating(false);
      }
    },
    [createIdea, navigate, resetSelection, selectedTripId, setCreating, setDialogOpen]
  );

  return {
    dialogOpen,
    isCreating,
    onOpenChange,
    openDialog,
    selectedTripId,
    setSelectedTripId,
    startIdea
  };
}
