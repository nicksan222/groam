import { useCallback } from 'react';
import { useReviewCommentState } from '@/lib/stores/review-comment-store';

export function useReviewComment({
  onReply,
  onResolve,
  resolvedAt
}: {
  onReply: (content: string) => Promise<boolean>;
  onResolve: () => Promise<boolean>;
  resolvedAt: number | null | undefined;
}) {
  const {
    cancelReply,
    collapseResolved,
    expandedResolved,
    isReplying,
    reply,
    setReply,
    showResolved,
    toggleReplying
  } = useReviewCommentState();
  const isExpanded = !resolvedAt || expandedResolved;
  const canSubmitReply = reply.trim().length > 0;

  const submitReply = useCallback(async () => {
    const content = reply.trim();
    if (!content) return false;
    if (await onReply(content)) {
      setReply('');
      cancelReply();
      return true;
    }
    return false;
  }, [cancelReply, onReply, reply, setReply]);

  const toggleResolved = useCallback(async () => {
    if (await onResolve()) {
      collapseResolved();
      return true;
    }
    return false;
  }, [collapseResolved, onResolve]);

  return {
    canSubmitReply,
    cancelReply,
    isExpanded,
    isReplying,
    reply,
    setReply,
    showResolved,
    submitReply,
    toggleReplying,
    toggleResolved
  };
}
