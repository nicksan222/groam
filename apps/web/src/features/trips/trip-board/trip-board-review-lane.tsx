import { SortableContext } from '@dnd-kit/sortable';
import { Plus } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { ideaCreateCta } from '@/features/ideas/idea-glossary';
import { testIds } from '@/lib/test-ids';
import type { TripBoardIdea, TripBoardIdeaItem } from '@/types/trip-board';
import { TripBoardCardSlot } from './trip-board-card-slot';
import { useTripBoardContext } from './trip-board-context';
import { useTripBoardDrag } from './trip-board-drag-state';
import { TripBoardFooterLink } from './trip-board-footer-link';
import { TripBoardIdeaCard } from './trip-board-idea-card';
import { TripBoardLane } from './trip-board-lane';
import { decideTransfer, isDraggable } from './trip-board-moves';

/** Ideas keep the order they were proposed in, so lifting one never reshuffles the lane. */
const keepOrder = () => null;

/** Ideas waiting for the group. Only ones in review can be lifted, toward Agreed plan to apply. */
export function TripBoardReviewLane({
  appliedCount,
  ideas,
  onStartIdea,
  startingIdea
}: {
  appliedCount: number;
  ideas: TripBoardIdea[] | undefined;
  onStartIdea: (() => void) | undefined;
  startingIdea: boolean;
}) {
  const { rights } = useTripBoardContext();
  const { item, target } = useTripBoardDrag();
  // An issue its open ideas already answer, held over this lane: point at those ideas.
  const lifted = item?.kind === 'issue' && target?.lane === 'review' ? item : null;
  const decision = lifted ? decideTransfer(lifted, 'review') : null;
  const answering =
    decision?.outcome === 'refused' && decision.tone === 'warning' ? lifted?.issue.id : undefined;
  const lifts = (ideas ?? []).map((idea): TripBoardIdeaItem => ({ ...rights, idea, kind: 'idea' }));
  const canStart = Boolean(onStartIdea) && rights.canPropose && !rights.archived;
  return (
    <TripBoardLane
      count={ideas?.length}
      empty="No ideas yet. Ideas are how the group proposes changes to this shared plan."
      footer={
        <>
          {canStart ? (
            <Button
              data-testid={testIds.startIdea}
              disabled={startingIdea}
              onClick={onStartIdea}
              size="sm"
            >
              <Plus />
              {ideaCreateCta}
            </Button>
          ) : null}
          {appliedCount > 0 ? (
            <span
              className="min-w-0 truncate text-xs text-muted-foreground"
              title={`${appliedCount} applied so far`}
            >
              {appliedCount} applied
            </span>
          ) : null}
          <TripBoardFooterLink section="ideas">All ideas</TripBoardFooterLink>
        </>
      }
      lane="review"
    >
      <SortableContext
        items={lifts.filter(isDraggable).map(({ idea }) => idea.id)}
        strategy={keepOrder}
      >
        {lifts.map((lift) => (
          <TripBoardCardSlot item={lift} key={lift.idea.id}>
            <TripBoardIdeaCard
              highlighted={answering !== undefined && lift.idea.issueId === answering}
              proposal={lift.idea}
            />
          </TripBoardCardSlot>
        ))}
      </SortableContext>
    </TripBoardLane>
  );
}
