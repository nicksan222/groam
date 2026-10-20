import { Button } from '@groam/ui/components/button';
import { RecordListBadge } from '@groam/ui/components/record-list-badge';
import { RecordListItem } from '@groam/ui/components/record-list-item';
import { recordListTitleClassName } from '@groam/ui/lib/record-list';
import {
  ArrowRight,
  GitMerge,
  GitPullRequest,
  GitPullRequestClosed,
  GitPullRequestDraft,
  MessageCircle,
  TriangleAlert
} from 'lucide-react';
import {
  isViewerDraft,
  pendingIdeaContinueLabel
} from '@/features/ideas/hooks/viewer-pending-idea';
import { ideaOpen } from '@/features/ideas/idea-glossary';
import { ideaOpenHref } from '@/features/ideas/idea-href';
import { ideaStatusLabel } from '@/features/ideas/idea-status';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';
import type { IdeaRecordListItem } from '@/types/ideas';

const statusIcons = {
  closed: GitPullRequestClosed,
  conflicted: TriangleAlert,
  draft: GitPullRequestDraft,
  in_review: GitPullRequest,
  merged: GitMerge
} as const;
const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
export function IdeaListRow({
  onActivate,
  onTitleActivate,
  proposal,
  showTripName,
  viewerUserId
}: {
  onActivate: () => void;
  onTitleActivate?: () => void;
  proposal: IdeaRecordListItem;
  showTripName: boolean;
  viewerUserId?: string | null;
}) {
  const Icon = statusIcons[proposal.status];
  const draft = isViewerDraft(proposal, viewerUserId);
  const href = ideaOpenHref(proposal, viewerUserId);
  const search = 'search' in href ? href.search : {};
  return (
    <RecordListItem
      data-idea-id={proposal.id}
      data-idea-name={proposal.ideaName}
      data-status={proposal.status}
      data-testid={testIds.ideaRow}
      data-viewer-draft={draft || undefined}
      icon={<Icon aria-hidden className="text-muted-foreground" />}
      title={
        <h4 className="min-w-0" title={proposal.title}>
          {draft || onTitleActivate ? (
            <Button
              className={recordListTitleClassName}
              onClick={onTitleActivate ?? onActivate}
              unstyled
            >
              {proposal.title}
            </Button>
          ) : (
            <Link
              className={recordListTitleClassName}
              params={href.params}
              search={search}
              to={href.to}
            >
              {proposal.title}
            </Link>
          )}
        </h4>
      }
      metadata={
        <>
          <RecordListBadge>
            {draft ? 'Your draft' : ideaStatusLabel(proposal.status)}
          </RecordListBadge>
          <span className="min-w-0 truncate">
            {showTripName && proposal.sourceTripName ? (
              <>
                <span className="font-medium">{proposal.sourceTripName}</span>
                <span aria-hidden className="mx-1.5">
                  ·
                </span>
              </>
            ) : null}
            started by <span>{proposal.author.name}</span>
            {proposal.updatedAt != null ? (
              <>
                <span aria-hidden className="mx-1.5">
                  ·
                </span>
                <time
                  dateTime={new Date(proposal.updatedAt).toISOString()}
                  title={new Date(proposal.updatedAt).toLocaleString()}
                >
                  updated {dateFormatter.format(proposal.updatedAt)}
                </time>
              </>
            ) : null}
          </span>
        </>
      }
      badges={
        proposal.reviewRequested && proposal.status === 'in_review' ? (
          <RecordListBadge className="gap-1.5">
            <MessageCircle aria-hidden />
            Review requested
          </RecordListBadge>
        ) : undefined
      }
      trailing={
        draft ? (
          <Button
            className="gap-1.5 text-muted-foreground hover:bg-muted/20 hover:text-foreground"
            data-testid={testIds.ideaContinue}
            onClick={onActivate}
            size="sm"
            variant="ghost"
          >
            {pendingIdeaContinueLabel('draft')}
            <ArrowRight aria-hidden />
          </Button>
        ) : (
          <Button
            asChild
            className="gap-1.5 text-muted-foreground hover:bg-muted/20 hover:text-foreground"
            data-testid={testIds.ideaView}
            size="sm"
            variant="ghost"
          >
            <Link params={href.params} search={search} to={href.to}>
              {ideaOpen}
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        )
      }
    />
  );
}
