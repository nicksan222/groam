import { useState } from 'react';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
type ReviewCommentStore = {
  expandedResolved: boolean;
  isReplying: boolean;
  reply: string;
  cancelReply: () => void;
  collapseResolved: () => void;
  setExpandedResolved: (expandedResolved: boolean) => void;
  setIsReplying: (isReplying: boolean) => void;
  setReply: (reply: string) => void;
  showResolved: () => void;
  toggleReplying: () => void;
};

function createReviewCommentStore() {
  return createStore<ReviewCommentStore>()((set) => ({
    expandedResolved: false,
    isReplying: false,
    reply: '',
    cancelReply: () => set({ isReplying: false }),
    collapseResolved: () => set({ expandedResolved: false, isReplying: false }),
    setExpandedResolved: (expandedResolved) => set({ expandedResolved }),
    setIsReplying: (isReplying) => set({ isReplying }),
    setReply: (reply) => set({ reply }),
    showResolved: () => set({ expandedResolved: true }),
    toggleReplying: () => set((state) => ({ isReplying: !state.isReplying }))
  }));
}

export function useReviewCommentState() {
  const [store] = useState(createReviewCommentStore);
  return useStore(store);
}
