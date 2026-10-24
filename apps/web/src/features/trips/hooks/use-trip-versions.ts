import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import { toast } from '@groam/ui/components/toast';
import { useAction, useMutation, useQuery } from 'convex/react';
import { useCallback } from 'react';
import { attempt, attemptValue } from '@/lib/errors';
import type { IdeaRebaseChoice, IdeaRebaseResult } from './use-idea-rebase-reconciliation';

function useCreateTripVersion(tripId: Id<'trips'> | undefined) {
  const createMutation = useMutation(api.routes.trips.versions.create.run);
  return useCallback(
    (options?: { ideaName?: string; issueId?: Id<'tripIssues'>; title?: string }) =>
      tripId
        ? attemptValue(
            () => createMutation({ tripId, ...options }),
            'Unable to start an idea',
            options?.title ? `Idea created: ${options.title}` : 'Idea created'
          )
        : Promise.resolve(null),
    [createMutation, tripId]
  );
}

/** `tripId` may be missing (no trip yet); the list then stays skipped, like when `enabled` is off. */
export function useTripVersions(tripId: Id<'trips'> | undefined, enabled = true) {
  const proposals = useQuery(
    api.routes.trips.versions.list.run,
    enabled && tripId ? { tripId } : 'skip'
  );
  const createVersion = useCreateTripVersion(tripId);
  return { createVersion, proposals };
}

export function useTripProposalDetail(proposalId?: Id<'tripProposals'>) {
  return useQuery(api.routes.trips.versions.get.run, proposalId ? { proposalId } : 'skip');
}

export function useTripVersion(proposalId: Id<'tripProposals'>) {
  const proposal = useTripProposalDetail(proposalId);
  const feedback = useQuery(api.routes.trips.versions.feedback.list.run, { proposalId });
  const submitAction = useAction(api.routes.trips.versions.submit.run);
  const approvalMutation = useMutation(api.routes.trips.versions.approval.run);
  const mergeAction = useAction(api.routes.trips.versions.merge.run);
  const rebaseAction = useAction(api.routes.trips.versions.rebase.run);
  const resolveAction = useAction(api.routes.trips.versions.resolve.run);
  const closeMutation = useMutation(api.routes.trips.versions.close.run);
  const addFeedbackMutation = useMutation(api.routes.trips.versions.feedback.add.run);
  const resolveFeedbackMutation = useMutation(api.routes.trips.versions.feedback.resolve.run);
  const setReviewersMutation = useMutation(api.routes.trips.versions.reviewers.set.run);
  const runAgentReviewAction = useAction(api.routes.trips.versions.reviewers.agent.run.run);

  return {
    addFeedback: (
      content: string,
      parentCommentId?: Id<'tripProposalComments'>,
      changeKey?: string,
      kind: 'change_request' | 'comment' = 'comment'
    ) =>
      attempt(
        () =>
          addFeedbackMutation({
            content,
            kind,
            parentCommentId,
            proposalId,
            ...(changeKey ? { changeKey } : {})
          }),
        'Unable to add idea feedback'
      ),
    approve: (approved: boolean) =>
      attempt(
        () => approvalMutation({ approved, proposalId }),
        'Unable to update your approval',
        approved ? 'Approved' : 'Approval removed'
      ),
    close: (reason?: string) =>
      attempt(
        () => closeMutation({ proposalId, ...(reason ? { reason } : {}) }),
        'Unable to close this idea',
        reason ? 'Idea closed' : 'Draft deleted'
      ),
    feedback,
    merge: async () => {
      const result = await attemptValue(
        () => mergeAction({ proposalId }),
        'Unable to apply this idea'
      );
      if (result === 'applied') {
        toast.success('Applied to the shared trip');
        return true;
      }
      if (result !== null) {
        toast.warning(
          'This idea conflicts with the shared plan. Open it to update it before applying.'
        );
      }
      return false;
    },
    proposal,
    rebase: async (resolutions: Array<{ choice: IdeaRebaseChoice; path: string }> = []) => {
      const result = await attemptValue(
        async () => (await rebaseAction({ proposalId, resolutions })) as IdeaRebaseResult,
        'Unable to update this idea from the shared trip'
      );
      if (result?.kind === 'applied') toast.success('Idea updated from shared trip');
      return result;
    },
    resolve: (resolutions: Array<{ choice: IdeaRebaseChoice; path: string }>) =>
      attempt(
        () => resolveAction({ proposalId, resolutions }),
        'Unable to resolve and apply this idea',
        'Applied to the shared trip'
      ),
    requestAgentReview: async () => {
      const result = await attemptValue(
        () => runAgentReviewAction({ proposalId }),
        'Unable to run the idea review'
      );
      if (!result) return false;
      if (result.inProgress) {
        toast.info('The idea reviewer is already reviewing this idea.');
        return true;
      }
      toast.success(
        result.commentCount === 0
          ? 'Idea review passed with no blocking concerns.'
          : `Idea reviewer requested ${result.commentCount} change${result.commentCount === 1 ? '' : 's'}.`
      );
      return true;
    },
    resolveFeedback: (commentId: Id<'tripProposalComments'>, resolved: boolean) =>
      attempt(
        () => resolveFeedbackMutation({ commentId, proposalId, resolved }),
        'Unable to update idea feedback'
      ),
    setReviewers: (
      reviewers: Array<
        | { agentId: 'reviewer'; kind: 'agent'; name: string }
        | { kind: 'user'; name: string; userId: string }
      >
    ) =>
      attempt(
        () => setReviewersMutation({ proposalId, reviewers }),
        'Unable to update idea reviewers'
      ),
    submit: () =>
      attempt(() => submitAction({ proposalId }), 'Unable to share this idea', 'Sent for review')
  };
}
