import { cardChip } from '@groam/ui/lib/board-card';
import { IssueCard } from '@/features/issues/shared/issue-card';
import { testIds } from '@/lib/test-ids';
import type { TripBoardDragItem } from '@/types/trip-board';
import { TripBoardCard } from './trip-board-card';
import { linkToneClass, withLinkedIdea } from './trip-board-links';

/** The same card, picked up: a soft deep shadow, a slight tilt and a touch larger. */
const lifted =
  'cursor-grabbing border-border shadow-xl shadow-foreground/10 motion-safe:rotate-[1.5deg] motion-safe:scale-[1.02]';

/** The lifted copy that follows the pointer while a card is dragged. */
export function TripBoardDragPreview({ item }: { item: TripBoardDragItem }) {
  if (item.kind === 'issue') {
    return (
      <IssueCard
        className={lifted}
        data-testid={testIds.tripBoardDragPreview}
        ideaChipClassName={item.link ? linkToneClass(item.link.tone) : undefined}
        issue={withLinkedIdea(item.issue, item.link)}
      />
    );
  }
  return (
    <TripBoardCard
      className={lifted}
      data-testid={testIds.tripBoardDragPreview}
      chips={<span className={cardChip}>Idea</span>}
      title={item.idea.title}
    />
  );
}
