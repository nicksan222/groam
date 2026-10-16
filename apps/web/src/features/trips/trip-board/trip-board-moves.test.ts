import type { Id } from '@groam/backend/data-model';
import { describe, expect, test } from 'vite-plus/test';
import type { IssueStatus } from '@/types/issues';
import type { IssueCondition, IssueListItem, WorkspaceIssue } from '@/types/issues';
import type {
  TripBoardIdea,
  TripBoardIdeaItem,
  TripBoardIssue,
  TripBoardIssueItem,
  TripBoardRights
} from '@/types/trip-board';
import { tripBoardLaneOrder, tripBoardLanes } from './trip-board-lanes';
import { decideMove, decideTransfer, isDraggable, itemLane } from './trip-board-moves';

const autoCondition = (
  met = false,
  refusal = met ? 'Settled by the trip.' : 'Closes once the trip has a destination.'
) =>
  ({
    check: 'destination',
    kind: 'auto',
    label: 'The trip has a destination',
    met,
    refusal
  }) satisfies IssueCondition;

const manualCondition = (label = 'Flights confirmed') =>
  ({ kind: 'manual', label, met: null }) satisfies IssueCondition;

const listItem = {
  assignee: null,
  author: { name: 'Alex Morgan', userId: 'user-alex' },
  canAssign: true,
  canManage: true,
  condition: null,
  dueAt: null,
  id: 'issue-1' as Id<'tripIssues'>,
  idea: null,
  labels: [],
  rank: 0,
  status: 'open',
  title: 'Coast day',
  updatedAt: Date.UTC(2026, 7, 17)
} satisfies Omit<IssueListItem, 'tripName'>;

const workspaceIssue = (over: Partial<WorkspaceIssue> = {}): WorkspaceIssue => ({
  ...listItem,
  body: 'Add a coast day near Lisbon.',
  closedAt: null,
  tripId: 'trip-1' as Id<'trips'>,
  tripName: 'Atlantic week',
  ...over
});

/** A board issue; `id` doubles as the title so tests can find the card by name. */
const boardIssue = (id: string, over: Partial<TripBoardIssue> = {}): TripBoardIssue =>
  workspaceIssue({ id: id as Id<'tripIssues'>, title: id, ...over });

const boardIdea = (id: string, over: Partial<TripBoardIdea> = {}): TripBoardIdea => ({
  author: { name: 'Sam', userId: 'user-sam' },
  baseUpdatedAt: 0,
  canApprove: false,
  canMerge: false,
  conflictCount: 0,
  feedbackCount: 0,
  hasApproved: false,
  id: id as Id<'tripProposals'>,
  ideaName: id,
  issueId: null,
  status: 'in_review',
  submittedAt: null,
  title: id,
  unresolvedFeedbackCount: 0,
  updatedAt: Date.now(),
  workingTripId: 'trip-work' as Id<'trips'>,
  ...over
});

/** A lifted issue card; pass `archived` or `canPropose` to change what the viewer may do. */
const issueItem = (
  over: Partial<TripBoardIssue> = {},
  { archived = false, canPropose = true }: Partial<TripBoardRights> = {}
): TripBoardIssueItem => ({
  archived,
  canPropose,
  issue: boardIssue('issue-1', over),
  kind: 'issue'
});

const ideaItem = (
  over: Partial<TripBoardIdea> = {},
  { archived = false, canPropose = true }: Partial<TripBoardRights> = {}
): TripBoardIdeaItem => ({ archived, canPropose, idea: boardIdea('idea-1', over), kind: 'idea' });

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
    const condition = autoCondition(false);
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
    const condition = autoCondition(true);
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
