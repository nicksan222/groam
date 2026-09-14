import type { Id } from '@groam/backend/data-model';
import { Badge } from '@groam/ui/components/badge';
import { Button } from '@groam/ui/components/button';
import Shell from '@groam/ui/components/shell/client';
import { Skeleton } from '@groam/ui/components/skeleton';
import { WorkspaceNotice } from '@groam/ui/components/workspace-notice';
import { cn } from '@groam/ui/lib/utils';
import { useNavigate } from '@tanstack/react-router';
import { ArrowRight, CircleDot, Pencil, Users } from 'lucide-react';
import { ideaOpenHref } from '@/features/ideas/idea-href';
import { ideaDetailNotice } from '@/features/ideas/idea-list/idea-page-copy';
import { useProposalActionRunner } from '@/features/trips/hooks/use-proposal-action-runner';
import { useTripVersion } from '@/features/trips/hooks/use-trip-versions';
import { IdeaRebaseReconciliation } from '@/features/trips/trip-ideas/idea-rebase-reconciliation';
import { TripIdeaBadge } from '@/features/trips/trip-ideas/trip-idea-name';
import { testIds } from '@/lib/test-ids';
import { ChangeSummary } from './change-summary';
import { PassOnIdea } from './pass-on-idea';
import { ProposalDecisionBox } from './proposal-decision-box';
import { ProposalFeedback } from './proposal-feedback';
import type { ProposalDetail } from './proposal-types';
import { ReviewerSummary } from './reviewer-summary';
import { VersionBadge } from './version-badge';
import { VersionStatusIcon } from './version-status-icon';

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
  const navigate = useNavigate();
  const { pendingAction, run } = useProposalActionRunner();
  const showLoading = isLoading || !proposal;

  if (showLoading) {
    return (
      <Shell.PageStack aria-busy="true" aria-label="Loading idea…" role="status">
        {embedded ? null : (
          <div className="space-y-2">
            <Skeleton className="h-7 w-[min(100%,16rem)]" />
            <Skeleton className="h-4 w-[min(100%,12rem)]" />
          </div>
        )}
        <Shell.TwoColumns>
          <Shell.LeftColumn>
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </Shell.LeftColumn>
          <Shell.RightColumn>
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </Shell.RightColumn>
        </Shell.TwoColumns>
      </Shell.PageStack>
    );
  }

  const openCopy = () => {
    void navigate(ideaOpenHref(proposal));
  };

  const unresolvedFeedback =
    feedback?.filter((comment) => comment.kind === 'change_request' && !comment.resolvedAt)
      .length ?? 0;
  const notice = ideaDetailNotice(proposal.status);

  return (
    <Shell.PageStack>
      {embedded ? null : (
        <header className="border-b pb-5">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-3">
                <VersionStatusIcon status={proposal.status} />
                <div className="min-w-0">
                  <Shell.Title className="truncate">{proposal.title}</Shell.Title>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <TripIdeaBadge name={proposal.ideaName} />
                    {proposal.status === 'draft' ? <Badge>Your draft</Badge> : null}
                    <VersionBadge
                      conflictCount={proposal.conflicts.length}
                      status={proposal.status}
                    />
                    <span>
                      <strong className="font-medium text-foreground">
                        {proposal.author.name}
                      </strong>{' '}
                      {proposal.status === 'draft'
                        ? `is shaping ${proposal.changes.length} change${proposal.changes.length === 1 ? '' : 's'} on this idea`
                        : `suggested ${proposal.changes.length} change${proposal.changes.length === 1 ? '' : 's'} to the shared trip`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button onClick={openCopy} size="sm" variant="outline">
                <Pencil /> {proposal.status === 'draft' ? 'Continue editing' : 'Open this idea'}
              </Button>
              {proposal.canClose ? (
                <PassOnIdea
                  appearance="header"
                  close={close}
                  pendingAction={pendingAction}
                  proposal={proposal}
                  run={run}
                  triggerTestId={testIds.closeIdeaHeader}
                />
              ) : null}
            </div>
          </div>
        </header>
      )}

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
        </Shell.RightColumn>
      </Shell.TwoColumns>
    </Shell.PageStack>
  );
}

function LinkedTripIssue({ issue }: { issue: NonNullable<ProposalDetail['issue']> }) {
  const navigate = useNavigate();
  return (
    <button
      className="w-full px-3 py-4 text-left transition-colors hover:bg-muted/30"
      onClick={() => {
        void navigate({
          params: { issueId: issue.id },
          to: '/issues/$issueId'
        });
      }}
      type="button"
    >
      <div className="flex items-center gap-2">
        <CircleDot className="size-4 text-primary" />
        <h3 className="text-sm font-semibold">Linked issue</h3>
        <ArrowRight className="ml-auto size-4 text-muted-foreground" />
      </div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        This idea started from an issue on the trip.
      </p>
      <p className="mt-3 text-sm font-medium leading-5">{issue.title}</p>
      <Badge className="mt-3 capitalize" variant="outline">
        {issue.status}
      </Badge>
    </button>
  );
}
