import { describe, expect, test } from 'vite-plus/test';
import { boardLink, ideaItem, issueItem } from '@/features/trips/testing/trip-board-fixtures';
import type { TripBoardDragItem, TripBoardLane } from '@/types/trip-board';
import { tripBoardAnnouncements } from './trip-board-announcements';
import { cardData, laneData } from './trip-board-drag-data';

const node = (data: ReturnType<typeof cardData>) => ({ data: { current: data } });
const card = (item: TripBoardDragItem) => node(cardData(item));
const lane = (id: TripBoardLane) => node(laneData(id));

// dnd-kit hands the announcers whole events; these read only `active` and `over`.
const over = (item: TripBoardDragItem, target: TripBoardLane | null) =>
  tripBoardAnnouncements.onDragOver!({
    active: card(item),
    over: target ? lane(target) : null
  } as never);
const end = (item: TripBoardDragItem, target: TripBoardLane | null) =>
  tripBoardAnnouncements.onDragEnd!({
    active: card(item),
    over: target ? lane(target) : null
  } as never);

describe('tripBoardAnnouncements', () => {
  test('says why an issue that already has an open idea will not start another', () => {
    const item = issueItem({}, { link: boardLink('Hostel') });
    expect(over(item, 'review')).toBe(
      'issue-1 is over Ideas. This issue already has an idea. “Hostel” is still open for it. Continue there instead.'
    );
    expect(end(item, 'review')).toBe(
      'issue-1 not moved. This issue already has an idea. “Hostel” is still open for it. Continue there instead.'
    );
  });

  test('offers to start an idea for an issue without one', () => {
    expect(over(issueItem(), 'review')).toBe('issue-1 is over Ideas. Drop to start an idea.');
    expect(end(issueItem(), 'review')).toBe('Dropped issue-1. Drop to start an idea.');
  });

  test('reads a refusal without a heading as its reason alone', () => {
    expect(over(ideaItem(), 'agreed')).toBe(
      'idea-1 is over Agreed plan. Needs approvals before it can be applied.'
    );
  });

  test('says when the card is over no column, and that a cancel leaves it', () => {
    expect(over(issueItem(), null)).toBe('issue-1 is not over a column.');
    expect(end(issueItem(), null)).toBe('issue-1 stays where it was.');
  });

  test('announces the pick-up', () => {
    expect(tripBoardAnnouncements.onDragStart!({ active: card(issueItem()) } as never)).toBe(
      'Picked up issue-1. Use the arrow keys to choose a place.'
    );
  });
});
