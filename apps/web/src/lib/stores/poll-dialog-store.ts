import type { Id } from '@groam/backend/data-model';
import { create } from 'zustand';

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
export type PollDialogStore = {
  /** The chat whose "/poll" dialog is open, or null. */
  discussionId: Id<'discussions'> | null;
  close: () => void;
  open: (discussionId: Id<'discussions'>) => void;
};

/** The chat poll dialog's open state, kept out of the thread so opening it never rerenders it. */
export const usePollDialogStore = create<PollDialogStore>((set) => ({
  close: () => set({ discussionId: null }),
  discussionId: null,
  open: (discussionId) => set({ discussionId })
}));
