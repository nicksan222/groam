import { describe, expect, test } from 'vite-plus/test';
import { manualCondition, starterCondition } from '@/features/issues/issue-condition-fixtures';
import {
  boardIssue,
  boardLink,
  issueItem,
  ideaItem
} from '@/features/trips/testing/trip-board-fixtures';
import type { IssueStatus } from '@/types/issues';
import { tripBoardLaneOrder, tripBoardLanes } from './trip-board-lanes';
import { decideMove, decideTransfer, isDraggable, itemLane } from './trip-board-moves';

const issueLanes: IssueStatus[] = ['open', 'in_progress', 'closed', 'wont_do'];

describe('decideMove for issues', () => {
  test.each(issueLanes.flatMap((from) => issueLanes.map((to) => [from, to] as const)))(
    'from %s to %s',
    (from, to) => {
      expect(decideMove(issueItem({ status: from }), to)).toEqual({
        move: {
          issue: boardIssue('issue-1', { status: from }),
          kind: 'moveIssue',
          label: from === to ? 'Reorder' : expect.any(String),
          status: to
        },
        outcome: 'allowed'
      });
    }
  );

  test('words each move from the lane it enters', () => {
    const label = (to: IssueStatus) => {
      const decision = decideMove(issueItem({ status: 'open' }), to);
      return decision.outcome === 'allowed' ? decision.move.label : null;
    };
    expect(label('closed')).toBe('Mark done');
    expect(label('in_progress')).toBe(`Move to ${tripBoardLanes.in_progress.title}`);
    expect(label('wont_do')).toBe(`Move to ${tripBoardLanes.wont_do.title}`);
  });

  test.each(['open', 'in_progress'] as const)('starts an idea from %s', (from) => {
    expect(decideMove(issueItem({ status: from }), 'review')).toEqual({
      move: { issueId: 'issue-1', kind: 'startIdea', label: 'Drop to start an idea' },
      outcome: 'allowed'
    });
  });

  test.each(['closed', 'wont_do'] as const)('cannot start an idea from %s', (from) => {
    expect(decideMove(issueItem({ status: from }), 'review')).toEqual({ outcome: 'unavailable' });
  });

  test('warns instead of starting a second idea for an issue an open idea answers', () => {
    expect(decideMove(issueItem({}, { link: boardLink('Hostel') }), 'review')).toEqual({
      heading: 'This issue already has an idea',
      outcome: 'refused',
      reason: '“Hostel” is still open for it. Continue there instead',
      tone: 'warning'
    });
  });

  test('warns from the lane pairing, not the newest idea, which may be closed', () => {
    const closed = {
      id: 'idea-new',
      status: 'closed',
      title: 'Camping',
      workingTripId: 'trip-work'
    };
    const item = issueItem({ idea: closed } as never, { link: boardLink('Hostel') });
    expect(decideMove(item, 'review')).toMatchObject({ outcome: 'refused', tone: 'warning' });
  });

  test.each(['merged', 'closed', 'in_review'] as const)(
    'starts a fresh idea when no open idea in the lane answers it (newest is %s)',
    (status) => {
      const idea = { id: 'idea-1', status, title: 'Hostel', workingTripId: 'trip-work' };
      expect(decideMove(issueItem({ idea } as never), 'review')).toMatchObject({
        outcome: 'allowed'
      });
    }
  );

  test('warns before checking propose rights: the open idea is the useful answer', () => {
    const item = issueItem({}, { canPropose: false, link: boardLink() });
    expect(decideMove(item, 'review')).toMatchObject({ tone: 'warning' });
  });

  test.each(['closed', 'wont_do'] as const)(
    'stays unavailable for a %s issue even with an open idea',
    (status) => {
      expect(decideMove(issueItem({ status }, { link: boardLink() }), 'review')).toEqual({
        outcome: 'unavailable'
      });
    }
  );

  test('lets an issue with an open idea still move between issue lanes', () => {
    expect(decideMove(issueItem({}, { link: boardLink() }), 'in_progress')).toMatchObject({
      outcome: 'allowed'
    });
  });

  test('refuses an idea without propose rights', () => {
    expect(decideMove(issueItem({}, { canPropose: false }), 'review')).toEqual({
      outcome: 'refused',
      reason: 'You can’t start ideas on this trip'
    });
  });

  test('never drops on the agreed plan', () => {
    expect(decideMove(issueItem(), 'agreed')).toEqual({ outcome: 'unavailable' });
  });

  test('refuses moves between issue lanes without manage rights', () => {
    expect(decideMove(issueItem({ canManage: false }), 'closed')).toEqual({
      outcome: 'refused',
      reason: 'You can’t move this issue'
    });
  });

  test('keeps auto-condition issues out of Done and Won’t do until the condition is met', () => {
    const condition = starterCondition(false);
    for (const lane of ['closed', 'wont_do'] as const) {
      expect(decideMove(issueItem({ condition }), lane)).toEqual({
        outcome: 'refused',
        reason: condition.refusal
      });
    }
    expect(decideMove(issueItem({ condition }), 'in_progress').outcome).toBe('allowed');
    expect(decideMove(issueItem({ condition }), 'open').outcome).toBe('allowed');
    expect(decideMove(issueItem({ condition: manualCondition() }), 'closed').outcome).toBe(
      'allowed'
    );
    expect(decideMove(issueItem({ condition, status: 'closed' }), 'open').outcome).toBe('allowed');
  });

  test('keeps a settled auto-condition issue in Done, even from Done to Won’t do', () => {
    const condition = starterCondition(true);
    for (const lane of ['open', 'in_progress', 'wont_do'] as const) {
      expect(decideMove(issueItem({ condition, status: 'closed' }), lane)).toEqual({
        outcome: 'refused',
        reason: condition.refusal
      });
    }
    expect(decideMove(issueItem({ condition, status: 'closed' }), 'closed').outcome).toBe(
      'allowed'
    );
  });

  test('lets a Mandatory starter issue reorder and move like any other', () => {
    const mandatory = { labels: ['mandatory' as const] };
    expect(decideMove(issueItem(mandatory), 'open')).toMatchObject({
      move: { label: 'Reorder' },
      outcome: 'allowed'
    });
    expect(decideMove(issueItem(mandatory), 'in_progress').outcome).toBe('allowed');
  });
});

describe('decideMove for ideas', () => {
  test('applies an approved idea on the agreed plan', () => {
    expect(decideMove(ideaItem({ canMerge: true }), 'agreed')).toEqual({
      move: { kind: 'applyIdea', label: 'Apply', proposalId: 'idea-1' },
      outcome: 'allowed'
    });
  });

  test('refuses an idea that still needs approvals', () => {
    expect(decideMove(ideaItem(), 'agreed')).toEqual({
      outcome: 'refused',
      reason: 'Needs approvals before it can be applied'
    });
  });

  test.each(['review', ...issueLanes] as const)('is not a target for ideas: %s', (lane) => {
    expect(decideMove(ideaItem({ canMerge: true }), lane)).toEqual({ outcome: 'unavailable' });
  });
});

describe('decideTransfer', () => {
  test('is unavailable in the card’s own lane, even where a reorder is allowed', () => {
    expect(decideMove(issueItem(), 'open').outcome).toBe('allowed');
    expect(decideTransfer(issueItem(), 'open')).toEqual({ outcome: 'unavailable' });
    expect(decideTransfer(ideaItem(), 'review')).toEqual({ outcome: 'unavailable' });
  });

  test('decides like the rulebook for any other lane', () => {
    expect(decideTransfer(issueItem(), 'closed')).toEqual(decideMove(issueItem(), 'closed'));
  });
});

describe('isDraggable and itemLane', () => {
  test('lets managers and proposers lift issues, but not on archived trips', () => {
    expect(isDraggable(issueItem())).toBe(true);
    expect(isDraggable(issueItem({ canManage: false }))).toBe(true);
    expect(isDraggable(issueItem({ canManage: false }, { canPropose: false }))).toBe(false);
    expect(isDraggable(issueItem({}, { archived: true }))).toBe(false);
  });

  test('lets only ideas in review be lifted, and not on archived trips', () => {
    expect(isDraggable(ideaItem())).toBe(true);
    expect(isDraggable(ideaItem({ status: 'draft' }))).toBe(false);
    expect(isDraggable(ideaItem({ status: 'conflicted' }))).toBe(false);
    expect(isDraggable(ideaItem({}, { archived: true }))).toBe(false);
  });

  test('puts issues in their status lane and ideas in review', () => {
    expect(itemLane(issueItem({ status: 'wont_do' }))).toBe('wont_do');
    expect(itemLane(ideaItem())).toBe('review');
  });

  test('lanes read left to right', () => {
    expect(tripBoardLaneOrder).toEqual([
      'agreed',
      'review',
      'open',
      'in_progress',
      'closed',
      'wont_do'
    ]);
  });
});
