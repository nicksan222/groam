import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import { toast } from '@groam/ui/components/toast';
import { useAction, useMutation, useQuery } from 'convex/react';
import { useCallback } from 'react';
import { errorMessage } from '@/lib/errors';
import type { IdeaRebaseChoice, IdeaRebaseResult } from './use-idea-rebase-reconciliation';

export function useTripVersions(tripId: Id<'trips'>, enabled = true) {
  const proposals = useQuery(api.routes.trips.versions.list.run, enabled ? { tripId } : 'skip');
  const createMutation = useMutation(api.routes.trips.versions.create.run);

  const createVersion = useCallback(
    async (options?: { ideaName?: string; issueId?: Id<'tripIssues'>; title?: string }) => {
      try {
        const created = await createMutation({ tripId, ...options });
        toast.success(options?.title ? `Idea created: ${options.title}` : 'Idea created');
        return created;
      } catch (error: unknown) {
        toast.error(errorMessage(error, 'Unable to start an idea'));
        return null;
      }
    },
    [createMutation, tripId]
  );

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

  const run = useCallback(
    async (action: () => Promise<unknown>, fallback: string, success?: string) => {
      try {
        await action();
        if (success) toast.success(success);
        return true;
      } catch (error: unknown) {
        toast.error(errorMessage(error, fallback));
        return false;
      }
    },
    []
  );

  return {
    addFeedback: (
      content: string,
      parentCommentId?: Id<'tripProposalComments'>,
      changeKey?: string,
      kind: 'change_request' | 'comment' = 'comment'
    ) =>
      run(
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
      run(
        () => approvalMutation({ approved, proposalId }),
        'Unable to update your approval',
        approved ? 'Approved' : 'Approval removed'
      ),
    close: (reason?: string) =>
      run(
        () => closeMutation({ proposalId, ...(reason ? { reason } : {}) }),
        'Unable to close this idea',
        reason ? 'Idea closed' : 'Draft deleted'
      ),
    feedback,
    merge: () =>
      run(
        () => mergeAction({ proposalId }),
        'Unable to apply this idea',
        'Applied to the shared trip'
      ),
    proposal,
    rebase: async (resolutions?: Array<{ choice: IdeaRebaseChoice; path: string }>) => {
      try {
        const result = (await rebaseAction({
          proposalId,
          resolutions: resolutions ?? []
        })) as IdeaRebaseResult;
        if (result.kind === 'applied') toast.success('Idea updated from shared trip');
        return result;
      } catch (error: unknown) {
        toast.error(errorMessage(error, 'Unable to update this idea from the shared trip'));
        return null;
      }
    },
    resolve: (resolutions: Array<{ choice: IdeaRebaseChoice; path: string }>) =>
      run(
        () => resolveAction({ proposalId, resolutions }),
        'Unable to resolve and apply this idea',
        'Applied to the shared trip'
      ),
    requestAgentReview: async () => {
      try {
        const result = await runAgentReviewAction({ proposalId });
        toast.success(
          result.commentCount === 0
            ? 'Idea review passed with no blocking concerns.'
            : `Idea reviewer requested ${result.commentCount} change${result.commentCount === 1 ? '' : 's'}.`
        );
        return true;
      } catch (error: unknown) {
        toast.error(errorMessage(error, 'Unable to run the idea review'));
        return false;
      }
    },
    resolveFeedback: (commentId: Id<'tripProposalComments'>, resolved: boolean) =>
      run(
        () => resolveFeedbackMutation({ commentId, proposalId, resolved }),
        'Unable to update idea feedback'
      ),
    setReviewers: (
      reviewers: Array<
        | { agentId: 'reviewer'; kind: 'agent'; name: string }
        | { kind: 'user'; name: string; userId: string }
      >
    ) =>
      run(() => setReviewersMutation({ proposalId, reviewers }), 'Unable to update idea reviewers'),
    submit: () =>
      run(() => submitAction({ proposalId }), 'Unable to share this idea', 'Sent for review')
  };
}
