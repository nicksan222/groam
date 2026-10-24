import type { Id } from '@groam/backend/data-model';
import { ArrowRight, CircleDot, Pencil, Users } from '@groam/icons';
import { Badge } from '@groam/ui/components/badge';
import { Button } from '@groam/ui/components/button';
import { MutedCopy } from '@groam/ui/components/muted-copy';
import { PageLoading } from '@groam/ui/components/page-loading';
import Shell from '@groam/ui/components/shell/client';
import { WorkspaceNotice } from '@groam/ui/components/workspace-notice';
import { cn } from '@groam/ui/lib/utils';
import { ideaDetailNotice } from '@/features/ideas/idea-page-copy';
import { LinkedResearches } from '@/features/research/research-links/linked-researches';
import { useProposalActionRunner } from '@/features/trips/hooks/use-proposal-action-runner';
import { useTripVersion } from '@/features/trips/hooks/use-trip-versions';
import { IdeaRebaseReconciliation } from '@/features/trips/trip-ideas/idea-rebase-reconciliation';
import { useNavigate } from '@/lib/navigation/router';
import { ChangeSummary } from './change-summary';
import { ProposalDecisionBox } from './proposal-decision-box';
import { ProposalFeedback } from './proposal-feedback';
import type { ProposalDetail } from './proposal-types';
import { ReviewerSummary } from './reviewer-summary';

// fallow-ignore-next-line complexity
export function TripVersionDetail({
  embedded = false,
  isLoading = false,
  proposalId
}: {
  embedded?: boolean;
  isLoading?: boolean;
  proposalId: Id<'tripProposals'>;
}) {
  const {
    addFeedback,
    approve,
    close,
    feedback,
    merge,
    proposal,
    rebase,
    requestAgentReview,
    resolveFeedback,
    setReviewers,
    submit
  } = useTripVersion(proposalId);
  const { pendingAction, run } = useProposalActionRunner();
  const showLoading = isLoading || !proposal;

  if (showLoading) return <PageLoading label="Loading idea…" />;

  const unresolvedFeedback =
    feedback?.filter((comment) => comment.kind === 'change_request' && !comment.resolvedAt)
      .length ?? 0;
  const notice = ideaDetailNotice(proposal.status);

  return (
    <Shell.Stack stack="page">
      {embedded || !notice ? null : (
        <WorkspaceNotice
          aria-label={notice.ariaLabel}
          className={cn(proposal.status === 'draft' && 'border-primary/25 bg-primary/5')}
          description={notice.description}
          icon={
            proposal.status === 'draft' ? (
              <Pencil className="size-4" />
            ) : (
              <Users className="size-4" />
            )
          }
          title={notice.title}
        />
      )}

      {embedded ? null : (
        <IdeaRebaseReconciliation
          canRebase={proposal.canRebase}
          disabled={pendingAction !== null}
          onRebase={rebase}
          pending={pendingAction === 'rebase'}
          sourceChanged={proposal.sourceChanged}
          status={proposal.status}
        />
      )}

      <Shell.TwoColumns>
        <Shell.LeftColumn as="main">
          <ChangeSummary
            asOf={embedded ? proposal.baseUpdatedAt : undefined}
            changes={proposal.changes}
            comments={feedback}
            onComment={
              proposal.status === 'closed' || proposal.status === 'merged'
                ? undefined
                : (changeKey, content) => addFeedback(content, undefined, changeKey, 'comment')
            }
            status={proposal.status}
          />
          <ProposalFeedback
            addFeedback={addFeedback}
            authorName={proposal.author.name}
            feedback={feedback}
            pendingAction={pendingAction}
            resolveFeedback={resolveFeedback}
            run={run}
            status={proposal.status}
          />
        </Shell.LeftColumn>

        <Shell.RightColumn>
          <ProposalDecisionBox
            approve={approve}
            close={close}
            merge={merge}
            pendingAction={pendingAction}
            proposal={proposal}
            run={run}
            submit={submit}
            unresolvedFeedback={unresolvedFeedback}
          />
          <ReviewerSummary
            pendingAction={pendingAction}
            proposal={proposal}
            requestAgentReview={requestAgentReview}
            run={run}
            setReviewers={setReviewers}
          />
          {proposal.issue ? <LinkedTripIssue issue={proposal.issue} /> : null}
          {proposal.sourceTripId ? (
            <LinkedResearches
              target={{ id: proposal.id, kind: 'idea' }}
              tripId={proposal.sourceTripId}
            />
          ) : null}
        </Shell.RightColumn>
      </Shell.TwoColumns>
    </Shell.Stack>
  );
}

function LinkedTripIssue({ issue }: { issue: NonNullable<ProposalDetail['issue']> }) {
  const navigate = useNavigate();
  return (
    <Button
      className="w-full px-3 py-4 text-left transition-colors hover:bg-muted/30"
      onClick={() => {
        void navigate({
          params: { issueId: issue.id },
          to: '/issues/$issueId'
        });
      }}
      type="button"
      unstyled
    >
      <div className="flex items-center gap-2">
        <CircleDot className="size-4 text-primary" />
        <h3 className="text-sm font-semibold">Linked issue</h3>
        <ArrowRight className="ml-auto size-4 text-muted-foreground" />
      </div>
      <MutedCopy size="xs" className="mt-1">
        This idea started from an issue on the trip.
      </MutedCopy>
      <p className="mt-3 text-sm font-medium leading-5">{issue.title}</p>
      <Badge className="mt-3 capitalize" variant="outline">
        {issue.status}
      </Badge>
    </Button>
  );
}
