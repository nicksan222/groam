import { create } from 'zustand';

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
type WorkspaceDialog = 'create-organization' | 'invite' | 'join' | null;

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
type InviteDialogContext = {
  tripId?: string;
  tripName?: string;
};

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
type WorkspaceDialogStore = {
  closeDialog: () => void;
  dialog: WorkspaceDialog;
  inviteContext: InviteDialogContext | null;
  openDialog: (dialog: Exclude<WorkspaceDialog, null>, context?: InviteDialogContext) => void;
};

/** High-churn workspace dialog selection — Zustand instead of React context. */
export const useWorkspaceDialogs = create<WorkspaceDialogStore>((set) => ({
  closeDialog: () => set({ dialog: null, inviteContext: null }),
  dialog: null,
  inviteContext: null,
  openDialog: (dialog, context) =>
    set({
      dialog,
      inviteContext: dialog === 'invite' ? (context ?? null) : null
    })
}));
