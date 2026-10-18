import { Avatar } from '@groam/ui/components/avatar';
import { AvatarFallback } from '@groam/ui/components/avatar-fallback';
import { Badge } from '@groam/ui/components/badge';
import { Button } from '@groam/ui/components/button';
import { MenuRow } from '@groam/ui/components/menu-row';
import { Popover, PopoverContent, PopoverTrigger } from '@groam/ui/components/popover';
import { SearchInput } from '@groam/ui/components/search-input';
import Shell from '@groam/ui/components/shell/client';
import { Spinner } from '@groam/ui/components/spinner';
import { initials } from '@groam/ui/lib/avatar';
import { Bot, Check, CheckCircle2, Circle, MessageSquareText, UserPlus, X } from 'lucide-react';
import { useState } from 'react';
import {
  reviewersDescription,
  reviewersEmpty,
  reviewersTitle
} from '@/features/ideas/idea-list/idea-page-copy';
import type { useTripVersion } from '@/features/trips/hooks/use-trip-versions';
import { formatDate } from '@/features/trips/hooks/version-format';
import {
  filterReviewerOptions,
  type Reviewer,
  reviewerIsSelected,
  reviewerKey,
  toggleReviewerSelection
} from '@/features/trips/trip-versions/reviewer-selection';
import { IdeaSectionHeading } from './idea-section-heading';

function ReviewerRow({
  approved,
  canManage,
  disabled,
  onToggle,
  reviewer
}: {
  approved: boolean;
  canManage: boolean;
  disabled: boolean;
  onToggle: () => void;
  reviewer: Reviewer;
}) {
  return (
    <li className="flex items-center gap-2 px-3 py-2">
      {reviewer.kind === 'agent' ? (
        <span className="grid size-7 place-items-center rounded-full bg-primary/10 text-primary">
          <Bot className="size-3.5" />
        </span>
      ) : (
        <Avatar className="size-7">
          <AvatarFallback className="text-[9px]">{initials(reviewer.name)}</AvatarFallback>
        </Avatar>
      )}
      <span className="min-w-0 flex-1 truncate text-xs font-medium">{reviewer.name}</span>
      {reviewer.kind === 'agent' ? (
        <Badge variant="secondary">AI</Badge>
      ) : approved ? (
        <span className="inline-flex items-center gap-1 text-[11px] text-primary">
          <CheckCircle2 className="size-3.5" /> Approved
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <Circle className="size-3.5" /> Pending
        </span>
      )}
      {canManage && reviewer.kind === 'user' ? (
        <Button
          aria-label={`Remove ${reviewer.name} as reviewer`}
          disabled={disabled}
          onClick={onToggle}
          size="icon-xs"
          title={`Remove ${reviewer.name}`}
          variant="ghost"
        >
          <X />
        </Button>
      ) : null}
    </li>
  );
}

function GroamReview({
  review
}: {
  review: NonNullable<NonNullable<ReturnType<typeof useTripVersion>['proposal']>['groamReview']>;
}) {
  const passed = review.status === 'passed';
  return (
    <div className="mx-3 mb-3 mt-3 rounded-lg border border-border p-3">
      <div className="flex items-center gap-2">
        {passed ? (
          <CheckCircle2 className="size-4 text-primary" />
        ) : (
          <MessageSquareText className="size-4 text-chart-4" />
        )}
        <p className="text-xs font-semibold">
          {passed
            ? 'Idea reviewer found no blocking concerns'
            : `${review.commentCount} change${review.commentCount === 1 ? '' : 's'} requested`}
        </p>
      </div>
      <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{review.summary}</p>
      <p className="mt-1 text-[10px] text-muted-foreground">
        Reviewed {formatDate(review.completedAt)}
      </p>
    </div>
  );
}

export function ReviewerSummary({
  pendingAction,
  proposal,
  requestAgentReview,
  run,
  setReviewers
}: {
  pendingAction: string | null;
  proposal: NonNullable<ReturnType<typeof useTripVersion>['proposal']>;
  requestAgentReview: () => Promise<boolean>;
  run: (label: string, action: () => Promise<boolean>) => Promise<boolean>;
  setReviewers: (
    reviewers: Array<
      | { agentId: 'reviewer'; kind: 'agent'; name: string }
      | { kind: 'user'; name: string; userId: string }
    >
  ) => Promise<boolean>;
}) {
  const [reviewerQuery, setReviewerQuery] = useState('');
  const humanReviewers = proposal.reviewers.filter((reviewer) => reviewer.kind === 'user');
  const reviewerRequested = proposal.reviewers.some((reviewer) => reviewer.kind === 'agent');
  const reviewerOptions = filterReviewerOptions(proposal.availableReviewers, reviewerQuery);
  const toggleHumanReviewer = (reviewer: Reviewer) => {
    if (reviewer.kind !== 'user') return;
    void run('reviewers', () =>
      setReviewers(toggleReviewerSelection(proposal.reviewers, reviewer))
    );
  };

  return (
    <Shell.Card variant="well">
      <Shell.CardHeader>
        <IdeaSectionHeading
          className="min-w-0 flex-1 pr-2"
          description={reviewersDescription}
          title={reviewersTitle}
        />
        {proposal.canManageReviewers && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                aria-label="Ask people to review"
                disabled={pendingAction !== null}
                size={humanReviewers.length === 0 ? 'sm' : 'icon-sm'}
                variant="ghost"
              >
                <UserPlus />
                {humanReviewers.length === 0 ? 'Ask' : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 overflow-hidden p-0">
              <div className="border-b px-3 py-2.5">
                <p className="text-sm font-semibold">Ask people to review</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  People can comment and approve. The idea reviewer always runs automatically.
                </p>
              </div>
              <div className="border-b p-2">
                <SearchInput
                  aria-label="Filter reviewers"
                  onChange={(event) => setReviewerQuery(event.target.value)}
                  onKeyDown={(event) => event.stopPropagation()}
                  placeholder="Filter people"
                  value={reviewerQuery}
                />
              </div>
              <div className="max-h-64 overflow-y-auto p-1">
                {reviewerOptions.length === 0 ? (
                  <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                    No reviewers found
                  </p>
                ) : (
                  reviewerOptions.map((reviewer) => {
                    const selected = reviewerIsSelected(proposal.reviewers, reviewer);
                    const key = reviewerKey(reviewer);
                    return (
                      <MenuRow
                        aria-pressed={selected}
                        density="popover"
                        disabled={pendingAction !== null}
                        key={key}
                        onClick={() => toggleHumanReviewer(reviewer)}
                      >
                        <Avatar className="size-7">
                          <AvatarFallback className="text-[9px]">
                            {initials(reviewer.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{reviewer.name}</span>
                          <span className="block text-[11px] text-muted-foreground">
                            Group member
                          </span>
                        </span>
                        {selected && <Check className="size-4 text-primary" />}
                      </MenuRow>
                    );
                  })
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </Shell.CardHeader>

      {proposal.reviewers.length === 0 ? (
        <p className="px-3 py-3 text-xs leading-5 text-muted-foreground">{reviewersEmpty}</p>
      ) : (
        <ul className="divide-y">
          {proposal.reviewers.map((reviewer) => {
            const approved =
              reviewer.kind === 'user' &&
              proposal.approvals.some((approval) => approval.userId === reviewer.userId);
            return (
              <ReviewerRow
                approved={approved}
                canManage={proposal.canManageReviewers}
                disabled={pendingAction !== null}
                key={reviewerKey(reviewer)}
                onToggle={() => toggleHumanReviewer(reviewer)}
                reviewer={reviewer}
              />
            );
          })}
        </ul>
      )}

      {proposal.groamReview ? <GroamReview review={proposal.groamReview} /> : null}

      {reviewerRequested && proposal.status !== 'draft' && (
        <div className="border-t px-3 py-3">
          <Button
            className="w-full"
            disabled={pendingAction !== null || !proposal.canManageReviewers}
            onClick={() => void run('agent-review', requestAgentReview)}
            size="sm"
            variant="outline"
          >
            {pendingAction === 'agent-review' ? <Spinner /> : <Bot />}
            {proposal.groamReview ? 'Run idea review again' : 'Run idea review'}
          </Button>
        </div>
      )}
      {reviewerRequested && proposal.status === 'draft' && (
        <p className="border-t px-3 py-3 text-xs leading-5 text-muted-foreground">
          The idea reviewer runs automatically when you send this to the group.
        </p>
      )}
    </Shell.Card>
  );
}
