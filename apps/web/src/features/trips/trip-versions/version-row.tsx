import type { Id } from '@groam/backend/data-model';
import { Button } from '@groam/ui/components/button';
import { cn } from '@groam/ui/lib/utils';
import {
  isViewerDraft,
  pendingIdeaContinueLabel,
  viewerDraftHighlightClass
} from '@/features/ideas/hooks/viewer-pending-idea';
import { ideaOpen } from '@/features/ideas/idea-glossary';
import { ideaOpenHref } from '@/features/ideas/idea-href';
import { ideaRowPurpose } from '@/features/ideas/idea-list/idea-page-copy';
import { ideaPrimaryAction } from '@/features/ideas/idea-status';
import { IdeaStatusBadge } from '@/features/ideas/idea-status-badge';
import type { useTripVersions } from '@/features/trips/hooks/use-trip-versions';
import { formatDate } from '@/features/trips/hooks/version-format';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';
import { VersionStatusIcon } from './version-status-icon';

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
    <article
      className={cn(
        'flex h-full w-full flex-col gap-4 px-4 py-3 sm:flex-row sm:items-center',
        draft && viewerDraftHighlightClass
      )}
      data-idea-id={proposal.id}
      data-idea-name={proposal.ideaName}
      data-status={proposal.status}
      data-testid={testIds.ideaRow}
      data-viewer-draft={draft || undefined}
    >
      <VersionStatusIcon status={proposal.status} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="truncate text-sm font-semibold">{proposal.title}</h4>
          <IdeaStatusBadge conflictCount={proposal.conflictCount} status={proposal.status} />
        </div>
        {purpose ? <p className="mt-1 text-xs text-muted-foreground">{purpose}</p> : null}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>by {proposal.author.name}</span>
          <span>updated {formatDate(proposal.updatedAt)}</span>
          {proposal.feedbackCount > 0 && (
            <span>
              {proposal.unresolvedFeedbackCount}/{proposal.feedbackCount} open threads
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-2 self-end sm:self-auto">
        {draft ? (
          <Button data-testid={testIds.ideaContinue} onClick={onOpenCopy} size="sm">
            {pendingIdeaContinueLabel('draft')}
          </Button>
        ) : (
          <Button asChild data-testid={testIds.ideaView} size="sm" variant="outline">
            <Link
              onClick={onOpen}
              params={href.params}
              search={'search' in href ? href.search : {}}
              to={href.to}
            >
              {actionLabel}
            </Link>
          </Button>
        )}
      </div>
    </article>
  );
}
