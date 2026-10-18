import { cn } from '@groam/ui/lib/utils';
import { CircleDot } from 'lucide-react';
import { memo, useEffect, useRef } from 'react';
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
import type { TripBoardIdea, TripBoardIdeaLink } from '@/types/trip-board';
import { TripBoardCard } from './trip-board-card';
import { useTripBoardContext } from './trip-board-context';
import { linkToneClass } from './trip-board-links';

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

/**
 * Scrolls the lane's own card list so `card` shows. Unlike `scrollIntoView` it never moves the
 * board sideways, which mid-drag would shift the lane under the pointer.
 */
function revealInLane(card: HTMLElement) {
  const list = card.closest<HTMLElement>('[data-lane-cards]');
  if (!list) return;
  const box = card.getBoundingClientRect();
  const view = list.getBoundingClientRect();
  if (box.top < view.top) list.scrollTop -= view.top - box.top;
  else if (box.bottom > view.bottom) list.scrollTop += box.bottom - view.bottom;
}

/** Names the issue the idea answers, in the hue its issue card's idea chip shares. */
function IssueChip({ link }: { link: TripBoardIdeaLink }) {
  return (
    <span
      className={cn(cardChip, linkToneClass(link.tone))}
      data-testid={testIds.tripBoardIdeaIssue}
    >
      <CircleDot aria-hidden />
      <span className="truncate" title={link.issueTitle}>
        {link.issueTitle ?? 'Linked issue'}
      </span>
    </span>
  );
}

/** Memoised like the issue cards, so a drag that only moves a slot never re-renders the ideas. */
export const TripBoardIdeaCard = memo(function TripBoardIdeaCard({
  highlighted = false,
  proposal
}: {
  /** Ringed while an issue it already answers is dragged over the Ideas lane. */
  highlighted?: boolean;
  proposal: TripBoardIdea;
}) {
  const { links, tripId, viewerUserId } = useTripBoardContext();
  const link = proposal.issueId ? links.get(proposal.issueId) : undefined;
  const card = useRef<HTMLElement>(null);
  useEffect(() => {
    if (highlighted && card.current) revealInLane(card.current);
  }, [highlighted]);
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
          {link ? <IssueChip link={link} /> : null}
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
      className={cn(highlighted && 'ring-2 ring-warning shadow-md')}
      data-highlighted={highlighted || undefined}
      data-idea-id={proposal.id}
      data-link-tone={link?.tone}
      data-idea-name={proposal.ideaName}
      data-status={proposal.status}
      data-testid={testIds.ideaRow}
      data-viewer-draft={draft || undefined}
      ref={card}
      title={proposal.title}
    />
  );
});
