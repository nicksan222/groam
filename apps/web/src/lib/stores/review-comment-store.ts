import { useState } from 'react';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
type ReviewCommentStore = {
  expandedResolved: boolean;
  isReplying: boolean;
  cancelReply: () => void;
  collapseResolved: () => void;
  setExpandedResolved: (expandedResolved: boolean) => void;
  setIsReplying: (isReplying: boolean) => void;
  showResolved: () => void;
  toggleReplying: () => void;
};

function createReviewCommentStore() {
  return createStore<ReviewCommentStore>()((set) => ({
    expandedResolved: false,
    isReplying: false,
    cancelReply: () => set({ isReplying: false }),
    collapseResolved: () => set({ expandedResolved: false, isReplying: false }),
    setExpandedResolved: (expandedResolved) => set({ expandedResolved }),
    setIsReplying: (isReplying) => set({ isReplying }),
    showResolved: () => set({ expandedResolved: true }),
    toggleReplying: () => set((state) => ({ isReplying: !state.isReplying }))
  }));
}

export function useReviewCommentState() {
  const [store] = useState(createReviewCommentStore);
  return useStore(store);
}
