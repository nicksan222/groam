import { ArrowRight, Clock3, MapPin, MessageCircle, UserRound } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { RecordListBadge } from '@groam/ui/components/record-list-badge';
import { RecordListItem } from '@groam/ui/components/record-list-item';
import { recordListWrappedTitleClassName } from '@groam/ui/lib/record-list';
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

const statusBadgeClassName = {
  closed: '',
  conflicted: 'border-warning/25 bg-warning/10 text-warning-foreground',
  draft: '',
  in_review: 'border-info/25 bg-info/10 text-info-foreground',
  merged: 'border-success/25 bg-success/10 text-success-foreground'
} as const satisfies Record<IdeaRecordListItem['status'], string>;
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
  const draft = isViewerDraft(proposal, viewerUserId);
  const href = ideaOpenHref(proposal, viewerUserId);
  const search = 'search' in href ? href.search : {};
  return (
    <RecordListItem
      wrapTitle
      data-idea-id={proposal.id}
      data-idea-name={proposal.ideaName}
      data-status={proposal.status}
      data-testid={testIds.ideaRow}
      data-viewer-draft={draft || undefined}
      title={
        <h4 className="min-w-0" title={proposal.title}>
          {draft || onTitleActivate ? (
            <Button
              className={recordListWrappedTitleClassName}
              onClick={onTitleActivate ?? onActivate}
              unstyled
            >
              {proposal.title}
            </Button>
          ) : (
            <Link
              className={recordListWrappedTitleClassName}
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
        <RecordListBadge className={statusBadgeClassName[proposal.status]}>
          <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" />
          {draft ? 'Your draft' : ideaStatusLabel(proposal.status)}
        </RecordListBadge>
      }
      description={
        <span className="flex h-6 min-w-0 items-center gap-1.5">
          {showTripName && proposal.sourceTripName ? (
            <RecordListBadge
              className="min-w-0 max-w-[50%] shrink gap-1.5"
              title={proposal.sourceTripName}
            >
              <MapPin aria-hidden className="shrink-0" />
              <span className="truncate">{proposal.sourceTripName}</span>
            </RecordListBadge>
          ) : null}
          <RecordListBadge
            className="min-w-0 shrink gap-1.5"
            title={`Started by ${proposal.author.name}`}
          >
            <UserRound aria-hidden className="shrink-0" />
            <span className="truncate">
              <span className="sr-only">started by </span>
              <span>{proposal.author.name}</span>
            </span>
          </RecordListBadge>
          {proposal.updatedAt != null ? (
            <RecordListBadge className="hidden shrink-0 gap-1.5 @xl/record:inline-flex">
              <Clock3 aria-hidden />
              <time
                dateTime={new Date(proposal.updatedAt).toISOString()}
                title={new Date(proposal.updatedAt).toLocaleString()}
              >
                updated {dateFormatter.format(proposal.updatedAt)}
              </time>
            </RecordListBadge>
          ) : null}
        </span>
      }
      badges={
        <>
          {proposal.reviewRequested && proposal.status === 'in_review' ? (
            <RecordListBadge className="gap-1.5 border-info/25 bg-info/10 text-info-foreground">
              <MessageCircle aria-hidden />
              Review requested
            </RecordListBadge>
          ) : null}
          <span className="hidden @md/record:inline-flex">
            {draft ? (
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
            )}
          </span>
        </>
      }
    />
  );
}
