import { isIdeaYourTurn, isIssueYourTurn } from '@groam/backend/convex/modules/travel/turn';
import type { Id } from '@groam/backend/data-model';
import { parseListSearch } from '@groam/ui/components/list';
import { describe, expect, test } from 'vite-plus/test';
import type { Poll } from '@/types/polls';
import type { QueueItem, QueueKind } from '@/types/queue';
import { issueAssignees } from './queue-issue-filters';
import {
  buildQueueItems,
  compareQueueItems,
  type QueueIdea,
  type QueueIssue,
  filterQueueItems
} from './queue-items';
import { pollLeader } from './queue-poll-leader';
import { queueSearchFilters } from './queue-search-filters';

const tripId = 'trip-1' as Id<'trips'>;

/** The real path of a search: parse once with the queue's keys, then filter with its slug map. */
function search(items: QueueItem[], kind: QueueKind, query = '') {
  const filters = queueSearchFilters(kind, items);
  return filterQueueItems(items, {
    parsed: parseListSearch(query, filters.keys),
    slugs: filters.slugs
  });
}
const viewer = 'user-alex';

function issue(overrides: Partial<Omit<QueueIssue, 'id'>> & { id: string }): QueueIssue {
  return {
    assignee: null,
    author: { name: 'Sam', userId: 'user-sam' },
    dueAt: null,
    labels: [],
    status: 'open',
    title: `Issue ${overrides.id}`,
    updatedAt: 100,
    ...overrides
  } as unknown as QueueIssue;
}

function idea(overrides: Partial<Omit<QueueIdea, 'id'>> & { id: string }): QueueIdea {
  return {
    author: { name: 'Sam', userId: 'user-sam' },
    canApprove: false,
    hasApproved: false,
    status: 'in_review',
    title: `Idea ${overrides.id}`,
    updatedAt: 100,
    workingTripId: 'working-1',
    ...overrides
  } as unknown as QueueIdea;
}

function poll(overrides: Partial<Omit<Poll, 'id'>> & { id: string }): Poll {
  return {
    canVote: true,
    closesAt: null,
    createdBy: { kind: 'user', name: 'Sam' },
    discussionId: null,
    myOptionIds: [],
    question: `Poll ${overrides.id}`,
    status: 'open',
    updatedAt: 100,
    ...overrides
  } as unknown as Poll;
}

const build = (input: {
  archived?: boolean;
  ideas?: QueueIdea[];
  issues?: QueueIssue[];
  polls?: Poll[];
}) =>
  buildQueueItems({
    archived: false,
    ideas: [],
    issues: [],
    polls: [],
    tripId,
    viewerUserId: viewer,
    ...input
  });

const mine = { kind: 'user', name: 'Alex', userId: viewer } as const;

describe('your turn', () => {
  test.each([
    ['an open issue assigned to the viewer', { assignee: mine, status: 'open' }, true],
    [
      'an in-progress issue assigned to the viewer',
      { assignee: mine, status: 'in_progress' },
      true
    ],
    ['a resolved issue assigned to the viewer', { assignee: mine, status: 'closed' }, false],
    ['an issue assigned to someone else', { assignee: { ...mine, userId: 'x' } }, false],
    [
      'an issue assigned to an agent',
      { assignee: { agentId: 'issue', kind: 'agent', name: 'G' } },
      false
    ],
    ['an unassigned issue', {}, false]
  ] as const)('%s', (_name, overrides, expected) => {
    expect(isIssueYourTurn(issue({ id: 'i', ...overrides } as never), viewer)).toBe(expected);
    expect(build({ issues: [issue({ id: 'i', ...overrides } as never)] })[0]?.yourTurn).toBe(
      expected
    );
  });

  test.each([
    ['an idea in review the viewer can approve', { canApprove: true }, true],
    [
      'an idea in review the viewer already approved',
      { canApprove: true, hasApproved: true },
      false
    ],
    ['an idea in review the viewer cannot approve', {}, false],
    ['the viewer’s own draft', { author: { name: 'Alex', userId: viewer }, status: 'draft' }, true],
    [
      'the viewer’s own conflicted idea',
      { author: { name: 'Alex', userId: viewer }, status: 'conflicted' },
      true
    ],
    ['the viewer’s own idea in review', { author: { name: 'Alex', userId: viewer } }, false],
    [
      'the viewer’s own idea in review that can be applied',
      { author: { name: 'Alex', userId: viewer }, canMerge: true },
      true
    ],
    ['someone else’s idea in review that can be applied', { canMerge: true }, false],
    ['an applied idea', { canApprove: true, status: 'merged' }, false]
  ] as const)('%s', (_name, overrides, expected) => {
    expect(isIdeaYourTurn(idea({ id: 'a', ...overrides } as never), viewer)).toBe(expected);
  });

  test('a poll waits on the viewer until they vote, and never when they cannot vote', () => {
    const items = build({
      polls: [
        poll({ id: 'fresh' }),
        poll({ id: 'voted', myOptionIds: ['o1'] }),
        poll({ id: 'locked', canVote: false })
      ]
    });
    expect(items.map((item) => [item.id, item.yourTurn])).toEqual([
      ['fresh', true],
      ['voted', false],
      ['locked', false]
    ]);
  });

  test('on an archived trip nothing waits on the viewer', () => {
    const items = build({
      archived: true,
      ideas: [idea({ canApprove: true, id: 'a' })],
      issues: [issue({ assignee: mine, id: 'i' })],
      polls: [poll({ id: 'p' })]
    });
    expect(items.map((item) => item.yourTurn)).toEqual([false, false, false]);
  });
});

describe('merging', () => {
  test('hides other travelers’ drafts but keeps the viewer’s own', () => {
    const items = build({
      ideas: [
        idea({ author: { name: 'Sam', userId: 'user-sam' }, id: 'theirs', status: 'draft' }),
        idea({ author: { name: 'Alex', userId: viewer }, id: 'mine', status: 'draft' })
      ]
    });
    expect(items.map((item) => item.id)).toEqual(['mine']);
    expect(items[0]?.status.label).toBe('Your draft');
  });

  test('normalises each kind with its link, owner, and due date', () => {
    const items = build({
      ideas: [idea({ id: 'a', updatedAt: 3 })],
      issues: [issue({ assignee: { ...mine, userId: 'x' }, dueAt: 50, id: 'i', updatedAt: 2 })],
      polls: [poll({ closesAt: 70, id: 'p', updatedAt: 1 })]
    });
    const byKind = Object.fromEntries(items.map((item) => [item.kind, item]));
    expect(byKind.issue).toMatchObject({
      dueAt: 50,
      href: { params: { issueId: 'i' }, to: '/issues/$issueId' },
      who: 'Assigned to Alex'
    });
    expect(byKind.idea).toMatchObject({ who: 'By Sam' });
    expect(byKind.idea).toMatchObject({ href: { to: '/trips/$tripId/ideas/$proposalId/$view' } });
    expect(byKind.poll).toMatchObject({ dueAt: 70, who: 'Asked by Sam' });
    expect(byKind.poll).not.toHaveProperty('href');
    expect(byKind.poll?.status).toEqual({ label: 'Voting', tone: 'info' });
  });

  test('a resolved issue keeps no due date', () => {
    const [item] = build({ issues: [issue({ dueAt: 50, id: 'i', status: 'closed' })] });
    expect(item).not.toHaveProperty('dueAt');
  });

  test('a closed poll has no due date', () => {
    const [item] = build({ polls: [poll({ closesAt: 70, id: 'p', status: 'closed' })] });
    expect(item).not.toHaveProperty('dueAt');
    expect(item?.settled).toBe(true);
  });
});

describe('ordering', () => {
  test('your turn first, soonest due before undated, then most recently updated', () => {
    const items = build({
      issues: [
        issue({ assignee: mine, dueAt: 900, id: 'late', updatedAt: 1 }),
        issue({ assignee: mine, dueAt: 200, id: 'soon', updatedAt: 1 }),
        issue({ assignee: mine, id: 'undated-new', updatedAt: 50 }),
        issue({ assignee: mine, id: 'undated-old', updatedAt: 10 }),
        issue({ id: 'other-new', updatedAt: 500 }),
        issue({ id: 'other-old', updatedAt: 5 })
      ]
    });
    expect(items.map((item) => item.id)).toEqual([
      'soon',
      'late',
      'undated-new',
      'undated-old',
      'other-new',
      'other-old'
    ]);
  });

  test('a dated item waiting on the viewer outranks an undated one, however new', () => {
    const items = build({
      issues: [
        issue({ assignee: mine, id: 'undated', updatedAt: 999 }),
        issue({ assignee: mine, dueAt: 5, id: 'dated', updatedAt: 1 })
      ]
    });
    expect(items.map((item) => item.id)).toEqual(['dated', 'undated']);
  });

  test('interleaves the kinds by recency once nothing waits on the viewer', () => {
    const items = build({
      ideas: [idea({ id: 'a', updatedAt: 20 })],
      issues: [issue({ id: 'i', updatedAt: 30 })],
      polls: [poll({ canVote: false, id: 'p', updatedAt: 10 })]
    });
    expect(items.map((item) => item.kind)).toEqual(['issue', 'idea', 'poll']);
  });
});

describe('filters', () => {
  const items = build({
    ideas: [
      idea({ id: 'review', status: 'in_review' }),
      idea({ id: 'applied', status: 'merged' }),
      idea({ id: 'closed', status: 'closed' })
    ],
    issues: [
      issue({ assignee: mine, id: 'mine' }),
      issue({ id: 'done', status: 'closed' }),
      issue({ id: 'wont', status: 'wont_do' })
    ],
    polls: [poll({ id: 'open' }), poll({ id: 'closed-poll', status: 'closed' })]
  });
  const ids = (list: QueueItem[]) => list.map((item) => item.id).toSorted();

  test('lists open and settled items together', () => {
    expect(ids(search(items, 'issue'))).toEqual(
      ['applied', 'closed', 'closed-poll', 'done', 'mine', 'open', 'review', 'wont'].toSorted()
    );
  });

  test('a search matches titles, ignoring case', () => {
    expect(ids(search(items, 'idea', ' REVIEW '))).toEqual(['review']);
    expect(ids(search(items, 'idea', 'nothing like it'))).toEqual([]);
  });
});

describe('compareQueueItems', () => {
  const at = (updatedAt: number, yourTurn = false, dueAt?: number) => ({
    ...(dueAt === undefined ? {} : { dueAt }),
    updatedAt,
    yourTurn
  });

  test('puts the viewer first, then dated before undated and soonest first, then the latest change', () => {
    const sorted = [at(9), at(1, true), at(1, true, 20), at(1, true, 10), at(5)].toSorted(
      compareQueueItems
    );
    expect(sorted).toEqual([at(1, true, 10), at(1, true, 20), at(1, true), at(9), at(5)]);
  });
});

describe('row facts', () => {
  const sam = { kind: 'user', name: 'Sam', userId: 'user-sam' } as const;
  const agent = { agentId: 'agent-1', kind: 'agent', name: 'Planner' } as const;

  test('an issue carries one-line excerpt, assignee, mandatory flag, and idea', () => {
    const [item] = build({
      issues: [
        issue({
          assignee: mine,
          body: 'Line one\n  and   two',
          id: 'a',
          idea: { id: 'idea-1', status: 'draft', title: 'Douro by train', workingTripId: 'w' },
          labels: ['mandatory']
        } as never)
      ]
    });
    expect(item).toMatchObject({
      assignedToViewer: true,
      assigneeKey: 'user:user-alex',
      excerpt: 'Line one and two',
      ideaTitle: 'Douro by train',
      mandatory: true,
      person: { kind: 'user', mine: true, name: 'Alex' }
    });
  });

  test('an issue with no body reads its who phrase, and an agent keeps its own key', () => {
    const [item] = build({ issues: [issue({ assignee: agent, body: ' ', id: 'a' } as never)] });
    expect(item).toMatchObject({
      assigneeKey: 'agent:agent-1',
      excerpt: 'Assigned to Planner',
      person: { kind: 'agent', mine: false, name: 'Planner' }
    });
  });

  test('assignee: and is: words narrow issues, and the rest is title text', () => {
    const items = build({
      issues: [
        issue({
          assignee: mine,
          id: 'mine',
          labels: ['mandatory'],
          title: 'Book flights'
        } as never),
        issue({ assignee: sam, id: 'sam' } as never),
        issue({ id: 'none' } as never)
      ]
    });
    const pick = (query: string) =>
      search(items, 'issue', query)
        .map((item) => item.id)
        .toSorted();
    expect(pick('is:mandatory')).toEqual(['mine']);
    expect(pick('assignee:me')).toEqual(['mine']);
    expect(pick('assignee:sam')).toEqual(['sam']);
    expect(pick('assignee:me assignee:sam')).toEqual(['mine', 'sam']);
    expect(pick('assignee:unassigned')).toEqual(['none']);
    expect(pick('assignee:me flights')).toEqual(['mine']);
    expect(pick('assignee:me assignee:')).toEqual(['mine']);
  });

  test('assignee choices list everyone but the viewer, by name', () => {
    const items = build({
      issues: [
        issue({ assignee: mine, id: 'a' } as never),
        issue({ assignee: sam, id: 'b' } as never),
        issue({ assignee: agent, id: 'c' } as never)
      ]
    });
    expect(issueAssignees(items)).toEqual([
      { key: 'agent:agent-1', name: 'Planner' },
      { key: 'user:user-sam', name: 'Sam' }
    ]);
  });
});

describe('pollLeader', () => {
  const tallied = (status: string, ...counts: number[]) =>
    ({
      status,
      tallies: counts.map((count, index) => ({ count, id: `o${index}`, label: `Option ${index}` }))
    }) as unknown as Poll;

  test.each([
    [tallied('open', 0, 0), 'No votes yet'],
    [tallied('open', 4, 2), 'Option 0 leads 4–2'],
    [tallied('open', 1, 3), 'Option 1 leads 3–1'],
    [tallied('open', 3, 3), 'Tied at 3'],
    [tallied('open', 2), 'Option 0 leads 2–0'],
    [tallied('closed', 5, 1), 'Option 0 won 5–1']
  ])('%#', (poll, expected) => {
    expect(pollLeader(poll)).toBe(expected);
  });
});

describe('queue search facets', () => {
  test('a named assignee is offered by an accent-free value and described by full name', () => {
    const ana = { kind: 'user', name: 'Ana Martínez', userId: 'user-ana' } as const;
    const items = build({
      issues: [issue({ assignee: ana, id: 'a' } as never), issue({ id: 'b' } as never)]
    });
    const assignee = queueSearchFilters('issue', items).facets.find(
      (facet) => facet.key === 'assignee'
    );
    expect(assignee?.values).toContainEqual({
      description: 'Assigned to Ana Martínez',
      value: 'ana-martinez'
    });
    expect(search(items, 'issue', 'assignee:ana-martinez').map((item) => item.id)).toEqual(['a']);
  });

  test('authors with the same name have distinct stable values', () => {
    const items = build({
      ideas: [
        idea({ id: 'a', author: { name: 'Sam', userId: 'sam-a' } }),
        idea({ id: 'b', author: { name: 'Sam', userId: 'sam-b' } })
      ]
    });
    expect(search(items, 'idea', 'author:sam-2').map((item) => item.id)).toEqual(['b']);
  });

  test('repeated statuses match any value; separate keys combine', () => {
    const items = build({
      ideas: [
        idea({ id: 'a', status: 'draft', author: { name: 'Alex', userId: viewer } }),
        idea({ id: 'b', status: 'merged', author: { name: 'Alex', userId: viewer } }),
        idea({ id: 'c', status: 'closed' })
      ]
    });
    expect(
      search(items, 'idea', 'status:draft status:merged author:me')
        .map((item) => item.id)
        .toSorted()
    ).toEqual(['a', 'b']);
  });

  test('polls filter by lifecycle, turn and unknown values', () => {
    const items = build({
      polls: [poll({ id: 'p1' }), poll({ id: 'p2', status: 'closed', canVote: false })]
    });
    const matching = (query: string) => search(items, 'poll', query).map((item) => item.id);
    expect(matching('status:closed is:settled')).toEqual(['p2']);
    expect(matching('is:your-turn')).toEqual(['p1']);
    expect(matching('status:unknown')).toEqual([]);
  });
});
