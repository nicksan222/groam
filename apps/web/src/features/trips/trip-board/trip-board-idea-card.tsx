import { cn } from '@groam/ui/lib/utils';
import {
  isViewerDraft,
  pendingIdeaContinueLabel
} from '@/features/ideas/hooks/viewer-pending-idea';
import { ideaOpen } from '@/features/ideas/idea-glossary';
import { ideaOpenHref } from '@/features/ideas/idea-href';
import { ideaPrimaryAction, ideaStatusLabel } from '@/features/ideas/idea-status';
import {
  cardChip,
  cardChipInteractive,
  cardChipTone,
  cardStretchedLink
} from '@/features/issues/shared/card-style';
import { relativeTripDate } from '@/features/trips/trip-list/trip-list-order';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';
import type { TripBoardIdea } from '@/types/trip-board';
import { TripBoardCard } from './trip-board-card';
import { useTripBoardContext } from './trip-board-context';

/** Where an idea in review stands for the viewer, in a word or two and a tone. */
function standing(idea: TripBoardIdea) {
  if (idea.status === 'conflicted')
    return { text: 'Needs an update', tone: cardChipTone.destructive };
  if (idea.status !== 'in_review') return null;
  if (idea.canMerge) return { text: 'Ready to apply', tone: cardChipTone.success };
  if (idea.canApprove && !idea.hasApproved)
    return { text: 'Needs your vote', tone: cardChipTone.primary };
  return { text: 'Waiting for votes', tone: undefined };
}

function StatusChip({ idea }: { idea: TripBoardIdea }) {
  const conflicts = idea.status === 'conflicted' ? idea.conflictCount : 0;
  return (
    <span
      className={cn(
        cardChip,
        'shrink-0 font-bold uppercase tracking-wide',
        idea.status === 'conflicted' && cardChipTone.destructive
      )}
    >
      {ideaStatusLabel(idea.status)}
      {conflicts > 0 ? ` · ${conflicts} ${conflicts === 1 ? 'conflict' : 'conflicts'}` : null}
    </span>
  );
}

export function TripBoardIdeaCard({ proposal }: { proposal: TripBoardIdea }) {
  const { tripId, viewerUserId } = useTripBoardContext();
  const draft = isViewerDraft(proposal, viewerUserId);
  const href = ideaOpenHref(
    {
      author: proposal.author,
      id: proposal.id,
      sourceTripId: tripId,
      status: proposal.status,
      workingTripId: proposal.workingTripId
    },
    viewerUserId
  );
  const actionLabel =
    ideaPrimaryAction({ author: proposal.author, status: proposal.status }, viewerUserId)?.label ??
    ideaOpen;
  const note = standing(proposal);
  const openThreads = proposal.unresolvedFeedbackCount;

  return (
    <TripBoardCard
      aside={<StatusChip idea={proposal} />}
      chips={
        <>
          {note ? <span className={cn(cardChip, note.tone)}>{note.text}</span> : null}
          <span className={cardChip}>
            <span className="truncate">
              {draft ? 'Your draft' : `by ${proposal.author.name}`} · updated{' '}
              {relativeTripDate(proposal.updatedAt)}
            </span>
          </span>
          {openThreads > 0 ? (
            <span className={cardChip}>
              {openThreads} open {openThreads === 1 ? 'thread' : 'threads'}
            </span>
          ) : null}
          <Link
            className={cn(
              cardChip,
              cardChipInteractive,
              draft ? cardChipTone.primary : 'text-foreground',
              // An action reads as a link, not a status lozenge.
              'font-medium normal-case tracking-normal',
              cardStretchedLink
            )}
            data-testid={draft ? testIds.ideaContinue : testIds.ideaView}
            params={href.params}
            search={'search' in href ? href.search : {}}
            to={href.to}
          >
            {draft ? pendingIdeaContinueLabel('draft') : actionLabel}
          </Link>
        </>
      }
      data-idea-id={proposal.id}
      data-idea-name={proposal.ideaName}
      data-status={proposal.status}
      data-testid={testIds.ideaRow}
      data-viewer-draft={draft || undefined}
      title={proposal.title}
    />
  );
}
