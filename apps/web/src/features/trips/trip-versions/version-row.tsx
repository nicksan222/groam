import type { Id } from '@groam/backend/data-model';
import {
  ArrowRight,
  GitMerge,
  GitPullRequest,
  GitPullRequestClosed,
  GitPullRequestDraft,
  TriangleAlert
} from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { RecordListBadge } from '@groam/ui/components/record-list-badge';
import { RecordListItem } from '@groam/ui/components/record-list-item';
import { recordListTitleClassName } from '@groam/ui/lib/record-list';
import {
  isViewerDraft,
  pendingIdeaContinueLabel
} from '@/features/ideas/hooks/viewer-pending-idea';
import { ideaOpen } from '@/features/ideas/idea-glossary';
import { ideaOpenHref } from '@/features/ideas/idea-href';
import { ideaRowPurpose } from '@/features/ideas/idea-list/idea-page-copy';
import { ideaPrimaryAction, ideaStatusLabel } from '@/features/ideas/idea-status';
import type { useTripVersions } from '@/features/trips/hooks/use-trip-versions';
import { formatDate } from '@/features/trips/hooks/version-format';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';
const statusIcons = {
  closed: GitPullRequestClosed,
  conflicted: TriangleAlert,
  draft: GitPullRequestDraft,
  in_review: GitPullRequest,
  merged: GitMerge
} as const;

export function VersionRow({
  onOpen,
  onOpenCopy,
  proposal,
  sourceTripId,
  viewerUserId
}: {
  onOpen: () => void;
  onOpenCopy: () => void;
  proposal: NonNullable<ReturnType<typeof useTripVersions>['proposals']>[number];
  sourceTripId: Id<'trips'>;
  viewerUserId?: string | null;
}) {
  const draft = isViewerDraft(proposal, viewerUserId);
  const Icon = statusIcons[proposal.status];
  const purpose = ideaRowPurpose(proposal.status, draft);
  const href = ideaOpenHref(
    {
      author: proposal.author,
      id: proposal.id,
      sourceTripId,
      status: proposal.status,
      workingTripId: proposal.workingTripId
    },
    viewerUserId
  );
  const primary = ideaPrimaryAction(
    { author: proposal.author, status: proposal.status },
    viewerUserId
  );
  const actionLabel = primary?.label ?? ideaOpen;
  return (
    <RecordListItem
      data-idea-id={proposal.id}
      data-idea-name={proposal.ideaName}
      data-status={proposal.status}
      data-testid={testIds.ideaRow}
      data-viewer-draft={draft || undefined}
      icon={<Icon aria-hidden className="text-muted-foreground" />}
      title={
        <h4 title={proposal.title}>
          {draft ? (
            <Button className={recordListTitleClassName} onClick={onOpenCopy} unstyled>
              {proposal.title}
            </Button>
          ) : (
            <Link className={recordListTitleClassName} onClick={onOpen} {...href}>
              {proposal.title}
            </Link>
          )}
        </h4>
      }
      metadata={
        <RecordListBadge>{draft ? 'Your draft' : ideaStatusLabel(proposal.status)}</RecordListBadge>
      }
      description={
        <span className="min-w-0 truncate" title={purpose ?? undefined}>
          <span>by {proposal.author.name}</span>
          <span aria-hidden className="mx-1.5">
            ·
          </span>
          <time dateTime={new Date(proposal.updatedAt).toISOString()}>
            updated {formatDate(proposal.updatedAt)}
          </time>
          {purpose ? (
            <>
              <span aria-hidden className="mx-1.5">
                ·
              </span>
              <span>{purpose}</span>
            </>
          ) : null}
        </span>
      }
      badges={
        <>
          {proposal.status === 'conflicted' && proposal.conflictCount > 0 ? (
            <RecordListBadge>
              {proposal.conflictCount} conflict{proposal.conflictCount === 1 ? '' : 's'}
            </RecordListBadge>
          ) : null}
          {proposal.feedbackCount > 0 ? (
            <RecordListBadge>
              {proposal.unresolvedFeedbackCount}/{proposal.feedbackCount} open threads
            </RecordListBadge>
          ) : null}
        </>
      }
      trailing={
        draft ? (
          <Button
            className="gap-1.5 text-muted-foreground"
            data-testid={testIds.ideaContinue}
            onClick={onOpenCopy}
            size="sm"
            variant="ghost"
          >
            {pendingIdeaContinueLabel('draft')}
            <ArrowRight aria-hidden />
          </Button>
        ) : (
          <Button
            asChild
            className="gap-1.5 text-muted-foreground"
            data-testid={testIds.ideaView}
            size="sm"
            variant="ghost"
          >
            <Link {...href} onClick={onOpen}>
              {actionLabel}
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        )
      }
    />
  );
}
