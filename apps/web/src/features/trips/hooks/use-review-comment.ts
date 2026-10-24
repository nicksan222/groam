import { useCallback } from 'react';
import { useReviewCommentState } from '@/lib/stores/review-comment-store';

/** Expand/collapse and reply-box state for one review thread; the reply draft lives in its composer. */
export function useReviewComment({
  onResolve,
  resolvedAt
}: {
  onResolve: () => Promise<boolean>;
  resolvedAt: number | null | undefined;
}) {
  const {
    cancelReply,
    collapseResolved,
    expandedResolved,
    isReplying,
    showResolved,
    toggleReplying
  } = useReviewCommentState();
  const isExpanded = !resolvedAt || expandedResolved;

  const toggleResolved = useCallback(async () => {
    if (await onResolve()) {
      collapseResolved();
      return true;
    }
    return false;
  }, [collapseResolved, onResolve]);

  return { cancelReply, isExpanded, isReplying, showResolved, toggleReplying, toggleResolved };
}
