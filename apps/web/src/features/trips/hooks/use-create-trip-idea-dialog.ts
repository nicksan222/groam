import type { Id } from '@groam/backend/data-model';
import { useCallback } from 'react';
import { useCreateTripIdeaDialogStore } from '@/lib/stores/trip-ui-stores';
import type { CreateTripIdeaIntent, CreateTripIdeaResult } from '@/types/trips';

export type { CreateTripIdeaIntent, CreateTripIdeaResult };

export function useCreateTripIdeaDialog({
  createVersion,
  onCreated
}: {
  createVersion: (title?: string) => Promise<CreateTripIdeaResult>;
  onCreated: (proposalId: Id<'tripProposals'>, intent: CreateTripIdeaIntent) => void;
}) {
  const dialogOpen = useCreateTripIdeaDialogStore((state) => state.dialogOpen);
  const isCreating = useCreateTripIdeaDialogStore((state) => state.isCreating);
  const intent = useCreateTripIdeaDialogStore((state) => state.intent);
  const openWithIntent = useCreateTripIdeaDialogStore((state) => state.openWithIntent);
  const setCreating = useCreateTripIdeaDialogStore((state) => state.setCreating);
  const setDialogOpen = useCreateTripIdeaDialogStore((state) => state.setDialogOpen);

  const openDialog = useCallback(
    (nextIntent?: Partial<CreateTripIdeaIntent>) => {
      openWithIntent(nextIntent);
    },
    [openWithIntent]
  );

  const createWithIntent = useCallback(
    async (nextIntent: CreateTripIdeaIntent, title?: string) => {
      setCreating(true);
      try {
        const version = await createVersion(title);
        if (!version) return;
        setDialogOpen(false);
        onCreated(version.proposalId, nextIntent);
      } finally {
        setCreating(false);
      }
    },
    [createVersion, onCreated, setCreating, setDialogOpen]
  );

  const create = useCallback(
    (title?: string) => createWithIntent(intent, title),
    [createWithIntent, intent]
  );

  const createForIntent = useCallback(
    (nextIntent: CreateTripIdeaIntent, title?: string) => createWithIntent(nextIntent, title),
    [createWithIntent]
  );

  return {
    create,
    createForIntent,
    dialogOpen,
    isCreating,
    openDialog,
    setDialogOpen
  };
}
