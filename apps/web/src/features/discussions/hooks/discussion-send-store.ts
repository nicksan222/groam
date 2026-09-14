import { createStore } from 'zustand/vanilla';
import type { DiscussionPendingUserMessage } from '@/types/discussions';

export type { DiscussionPendingUserMessage };

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
type DiscussionSendStore = {
  clearPending: () => void;
  isSending: boolean;
  nextOptimisticKey: () => string;
  pendingUserMessage: DiscussionPendingUserMessage | null;
  setPending: (pending: DiscussionPendingUserMessage | null) => void;
  setSending: (isSending: boolean) => void;
};

export function createDiscussionSendStore() {
  let optimisticSequence = 0;
  return createStore<DiscussionSendStore>()((set) => ({
    clearPending: () => set({ pendingUserMessage: null }),
    isSending: false,
    nextOptimisticKey: () => {
      optimisticSequence += 1;
      return `optimistic-user-${optimisticSequence}`;
    },
    pendingUserMessage: null,
    setPending: (pendingUserMessage) => set({ pendingUserMessage }),
    setSending: (isSending) => set({ isSending })
  }));
}
