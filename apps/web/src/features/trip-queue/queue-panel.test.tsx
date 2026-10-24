import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import { useViewport } from '@groam/vitest-config/viewport';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { useTripCreateRequestStore } from '@/lib/stores/trip-create-request-store';
import { testIds } from '@/lib/test-ids';
import { QueuePanel } from './queue-panel';

const state = vi.hoisted(() => ({
  assign: vi.fn(),
  setDue: vi.fn(),
  setStatus: vi.fn(),
  create: vi.fn(),
  actions: { close: vi.fn(), create: vi.fn(), remove: vi.fn(), retract: vi.fn(), vote: vi.fn() },
  canLoadMore: false,
  ideas: [] as unknown[] | undefined,
  issues: [] as unknown[] | undefined,
  loadMore: vi.fn(),
  navigate: vi.fn(),
  polls: [] as unknown[],
  search: {} as Record<string, unknown>
}));

vi.mock('@/lib/navigation/router', async (importOriginal) => ({
  ...(await (await import('@/lib/testing/router-mock')).mockRouter(importOriginal, state.navigate)),
  useParams: () => ({ tripId: 'abc123' }),
  useSearch: <T,>(parse: (search: Record<string, unknown>) => T) => parse(state.search)
}));
vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useOptionalWorkspace: () => ({ session: { user: { id: 'user-alex' } } }),
  useWorkspace: () => ({
    activeOrganization: { members: [] },
    session: { user: { id: 'user-alex' } }
  })
}));
vi.mock('@/features/issues/hooks/use-issue-mutations', () => ({
  useIssueMutations: () => ({ assign: state.assign, setStatus: state.setStatus })
}));
vi.mock('./hooks/use-issue-due', () => ({ useIssueDue: () => state.setDue }));
vi.mock('@/features/trips/hooks/use-trip-issues', () => ({
  useTripIssues: (_tripId: unknown, enabled = true) => ({
    issues: enabled ? state.issues : undefined
  })
}));
vi.mock('@/features/trips/hooks/use-trip-versions', () => ({
  useTripVersions: (_tripId: unknown, enabled = true) => ({
    proposals: enabled ? state.ideas : undefined
  })
}));
vi.mock('@/features/polls/hooks/use-polls', () => ({
  usePollActions: () => state.actions
}));
vi.mock('@/features/issues/hooks/use-workspace-issues', () => ({
  useCreateIssue: () => state.create
}));
vi.mock('@/features/issues/shared/create-issue-dialog', () => ({
  CreateIssueDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid={testIds.createIssueDialog} /> : null
}));

const tripId = 'trip-1' as Id<'trips'>;
const trip = (archivedAt: null | number = null, canPropose = true) =>
  ({ archivedAt, id: tripId, permissions: { canPropose } }) as TripDetail;
const mine = { kind: 'user', name: 'Alex', userId: 'user-alex' };

const issue = (id: string, overrides: Record<string, unknown> = {}) => ({
  assignee: null,
  author: { name: 'Sam', userId: 'user-sam' },
  body: '',
  dueAt: null,
  id,
  idea: null,
  labels: [],
  status: 'open',
  title: `Issue ${id}`,
  updatedAt: 10,
  ...overrides
});
const idea = (id: string, overrides: Record<string, unknown> = {}) => ({
  author: { name: 'Sam', userId: 'user-sam' },
  canApprove: false,
  hasApproved: false,
  id,
  status: 'in_review',
  title: `Idea ${id}`,
  updatedAt: 20,
  workingTripId: 'working-1',
  ...overrides
});
const poll = (id: string, overrides: Record<string, unknown> = {}) => ({
  canClose: true,
  canDelete: false,
  canVote: true,
  closedAt: null,
  closesAt: null,
  createdAt: 1,
  createdBy: { kind: 'user', name: 'Ana' },
  discussionId: null,
  eligibleCount: 2,
  id,
  multiSelect: false,
  myOptionIds: [],
  question: `Poll ${id}`,
  status: 'open',
  tallies: [
    { count: 0, id: 'o1', label: 'Sushi' },
    { count: 0, id: 'o2', label: 'Tapas' }
  ],
  tripId,
  updatedAt: 30,
  votedCount: 0,
  voters: [],
  ...overrides
});

/** The polls the page opens once and hands to Polls. */
const feed = () => ({
  canLoadMore: state.canLoadMore,
  isLoading: false,
  loadMore: state.loadMore,
  polls: state.polls as never[]
});

const rows = () => page.getByTestId(testIds.queueRow);
const openSettled = () => page.getByRole('button', { name: /^Settled/u }).click();

beforeEach(() => {
  vi.clearAllMocks();
  state.canLoadMore = false;
  state.ideas = [];
  state.issues = [];
  state.polls = [];
  state.search = {};
  useTripCreateRequestStore.getState().clear();
});

describe('QueuePanel states', () => {
  test.each([
    [
      'issue',
      () => {
        state.issues = undefined;
      }
    ],
    [
      'idea',
      () => {
        state.ideas = undefined;
      }
    ]
  ] as const)('shows a labeled loading state until the %s list loads', async (kind, load) => {
    load();
    await render(<QueuePanel kind={kind} trip={trip()} />);
    await expect.element(page.getByRole('status', { name: 'Loading queue…' })).toBeVisible();
  });

  test.each([
    ['idea', 'No ideas yet'],
    ['issue', 'No issues yet'],
    ['poll', 'No polls yet']
  ] as const)('%s queue reads "%s" when empty', async (kind, headline) => {
    await render(<QueuePanel kind={kind} trip={trip()} />);
    await expect.element(page.getByText(headline)).toBeVisible();
  });

  test('an empty Ideas queue offers a new idea', async () => {
    const onStartIdea = vi.fn();
    await render(<QueuePanel kind="idea" onStartIdea={onStartIdea} trip={trip()} />);
    await page.getByRole('button', { name: 'New idea' }).click();
    expect(onStartIdea).toHaveBeenCalledOnce();
  });

  test('an empty Issues queue offers a new issue, which opens its dialog', async () => {
    await render(<QueuePanel kind="issue" trip={trip()} />);
    await page.getByRole('button', { name: 'New issue' }).click();
    await expect.element(page.getByTestId(testIds.createIssueDialog)).toBeInTheDocument();
  });

  test('an empty Polls queue offers a new poll, which opens its dialog', async () => {
    await render(<QueuePanel kind="poll" pollFeed={feed()} trip={trip()} />);
    await page.getByRole('button', { name: 'New poll' }).click();
    await expect.element(page.getByTestId(testIds.createPollDialog)).toBeVisible();
  });

  test('without permission to propose, Ideas offers nothing to start', async () => {
    await render(<QueuePanel kind="idea" onStartIdea={vi.fn()} trip={trip(null, false)} />);
    await expect.element(page.getByText('No ideas yet')).toBeVisible();
    await expect.element(page.getByRole('button', { name: /^New/ })).not.toBeInTheDocument();
  });

  test('on an archived trip an empty queue offers nothing to start', async () => {
    await render(<QueuePanel kind="issue" trip={trip(1)} />);
    await expect.element(page.getByText('No issues yet')).toBeVisible();
    await expect.element(page.getByRole('button', { name: /^New/ })).not.toBeInTheDocument();
  });
});

describe.each(['idea', 'issue', 'poll'] as const)('QueuePanel %s filter access', (kind) => {
  test.each(['empty', 'loading', 'populated'] as const)(
    'offers a visible filter opener for a %s list',
    async (listState) => {
      if (listState === 'loading') {
        state.ideas = undefined;
        state.issues = undefined;
      } else if (listState === 'populated') {
        state.ideas = [idea('a1')];
        state.issues = [issue('i1')];
        state.polls = [poll('p1')];
      }
      await render(
        <QueuePanel
          kind={kind}
          pollFeed={{ ...feed(), isLoading: listState === 'loading' }}
          trip={trip()}
        />
      );
      const footer = page.getByLabelText('Keyboard shortcuts');
      const opener = footer.getByRole('button', { exact: true, name: 'Filter' });
      expect(page.getByRole('button', { exact: true, name: 'Filter' }).elements()).toHaveLength(1);
      expect(footer.element().querySelector('[data-slot="list-controls"]')).not.toBeNull();
      await expect.element(opener).toBeVisible();
      await opener.click();
      await expect.element(page.getByRole('dialog')).toBeVisible();
      await expect.element(page.getByRole('combobox')).toBeVisible();
    }
  );
});

describe.each(['idea', 'issue', 'poll'] as const)('QueuePanel %s sorting', (kind) => {
  test('offers shared sorting and reorders the rows without changing the default turn groups', async () => {
    const entries = [
      { title: 'Alpha', updatedAt: 10 },
      { title: 'Bravo', updatedAt: 30 },
      { title: 'Charlie', updatedAt: 20 }
    ];
    state.ideas = entries.map((entry, index) => idea(`a${index}`, entry));
    state.issues = entries.map((entry, index) => issue(`i${index}`, entry));
    state.polls = entries.map(({ title: question, updatedAt }, index) =>
      poll(`p${index}`, { question, updatedAt })
    );
    await render(<QueuePanel kind={kind} pollFeed={feed()} trip={trip()} />);
    const titles = () =>
      rows()
        .elements()
        .map((row) => row.getAttribute('data-title'));
    const footer = page.getByLabelText('Keyboard shortcuts');
    const sort = footer.getByRole('button', {
      name: `Sort ${kind === 'idea' ? 'ideas' : kind === 'issue' ? 'issues' : 'polls'}`
    });
    await expect.element(sort).toBeVisible();
    await sort.click();
    await expect.element(page.getByRole('radio', { name: 'Your turn first' })).toBeChecked();
    await page.getByRole('radio', { name: 'Oldest first' }).click();
    await expect.poll(titles).toEqual(['Alpha', 'Charlie', 'Bravo']);
    await sort.click();
    await page.getByRole('radio', { name: 'Title A–Z' }).click();
    await expect.poll(titles).toEqual(['Alpha', 'Bravo', 'Charlie']);
    await sort.click();
    await page.getByRole('radio', { name: 'Newest first' }).click();
    await expect.poll(titles).toEqual(['Bravo', 'Charlie', 'Alpha']);
  });
});

describe('QueuePanel mobile controls', () => {
  test('the header sort request opens sorting while the footer stays hidden', async () => {
    await useViewport(390, 844);
    state.ideas = [idea('a1', { title: 'Bravo' }), idea('a2', { title: 'Alpha' })];
    await render(<QueuePanel kind="idea" trip={trip()} />);
    await expect.element(page.getByLabelText('Keyboard shortcuts')).not.toBeVisible();

    useTripCreateRequestStore.getState().request('sort');
    await expect.element(page.getByRole('radio', { name: 'Your turn first' })).toBeVisible();
    await page.getByRole('radio', { name: 'Title A–Z' }).click();
    await expect
      .poll(() =>
        rows()
          .elements()
          .map((row) => row.getAttribute('data-title'))
      )
      .toEqual(['Alpha', 'Bravo']);
  });

  test('the header search request opens List.Search while the footer stays hidden', async () => {
    await useViewport(390, 844);
    await render(<QueuePanel kind="idea" trip={trip()} />);
    await expect.element(page.getByLabelText('Keyboard shortcuts')).not.toBeVisible();

    useTripCreateRequestStore.getState().request('search');
    await expect.element(page.getByRole('dialog')).toBeVisible();
    await expect.element(page.getByRole('combobox')).toBeVisible();
  });
});

describe('QueuePanel rows', () => {
  beforeEach(() => {
    state.issues = [
      issue('i1', { assignee: mine, dueAt: 5_000 }),
      issue('i2', { status: 'closed' }),
      issue('i3')
    ];
    state.ideas = [idea('a1', { canApprove: true })];
    state.polls = [poll('p1')];
  });

  test('lists only its own kind, with no kind word or icon on the rows', async () => {
    await render(<QueuePanel kind="issue" trip={trip()} />);
    await expect.poll(() => rows().elements()).toHaveLength(2);
    expect(
      rows()
        .elements()
        .map((row) => row.getAttribute('data-kind'))
    ).toEqual(['issue', 'issue']);
    expect(rows().first().element().textContent).not.toContain('Idea');
  });

  test('groups open items by turn with counts, and links to the issue', async () => {
    await render(<QueuePanel kind="issue" trip={trip()} />);
    await expect.element(page.getByRole('heading', { name: 'Your turn · 1' })).toBeVisible();
    await expect
      .element(page.getByRole('heading', { name: 'Waiting on others · 1' }))
      .toBeVisible();
    expect(
      rows()
        .elements()
        .map((row) => row.hasAttribute('data-your-turn'))
    ).toEqual([true, false]);
    await expect
      .element(page.getByRole('link', { name: 'Issue i1' }))
      .toHaveAttribute('href', '/issues/i1');
  });

  test('ideas link to their comparison', async () => {
    await render(<QueuePanel kind="idea" trip={trip()} />);
    await expect
      .element(page.getByRole('link', { name: 'Idea a1' }))
      .toHaveAttribute('href', expect.stringContaining('/ideas/a1/compare'));
  });

  test('rows say the due date in words, and a week out it warns', async () => {
    state.issues = [
      issue('i1', {
        assignee: mine,
        dueAt: Date.now() + 3 * 86_400_000,
        updatedAt: Date.now() - 2 * 3_600_000
      })
    ];
    await render(<QueuePanel kind="issue" trip={trip()} />);
    const due = page.getByText(/^Decide by /u);
    await expect.element(due).toBeVisible();
    await expect.element(due).not.toHaveAttribute('data-overdue');
    expect(rows().first().element().querySelector('time')?.textContent).toMatch(
      /^(now|\d+[mhdw])$/u
    );
  });

  test('settled items sit under one Settled heading, folded until opened', async () => {
    await render(<QueuePanel kind="issue" trip={trip()} />);
    await expect.element(page.getByRole('heading', { name: 'Settled · 1' })).toBeVisible();
    await expect.element(page.getByRole('link', { name: 'Issue i2' })).not.toBeInTheDocument();
    await openSettled();
    await expect.element(page.getByRole('link', { name: 'Issue i2' })).toBeVisible();
  });

  test('a lone Your turn group still carries its heading', async () => {
    state.issues = [issue('i1', { assignee: mine })];
    await render(<QueuePanel kind="issue" trip={trip()} />);
    await expect.element(page.getByRole('heading', { name: 'Your turn · 1' })).toBeVisible();
    await expect
      .element(page.getByRole('heading', { name: /Waiting on others/u }))
      .not.toBeInTheDocument();
  });

  test('with nothing on the viewer, open items sit under a plain Open heading', async () => {
    state.issues = [issue('i3')];
    await render(<QueuePanel kind="issue" trip={trip()} />);
    await expect.poll(() => rows().elements()).toHaveLength(1);
    await expect.element(page.getByRole('heading', { name: 'Open · 1' })).toBeVisible();
    await expect.element(page.getByRole('heading', { name: /Your turn/u })).not.toBeInTheDocument();
  });

  test('a poll expands inline without repeating its question, and routes votes to it', async () => {
    state.actions.vote.mockResolvedValue(true);
    await render(<QueuePanel kind="poll" pollFeed={feed()} trip={trip()} />);
    await expect.element(page.getByTestId(testIds.pollCard)).not.toBeInTheDocument();
    const title = page.getByRole('button', { name: 'Poll p1' });
    await title.click();
    await expect.element(title).toHaveAttribute('aria-expanded', 'true');
    await expect.element(page.getByText('No votes yet')).toBeVisible();
    await expect
      .poll(() => page.getByRole('heading', { name: 'Poll p1' }).elements())
      .toHaveLength(0);
    await page
      .getByRole('article', { name: 'Poll: Poll p1' })
      .getByRole('radio', { name: /Tapas/ })
      .click();
    expect(state.actions.vote).toHaveBeenCalledWith('p1', ['o2']);
  });

  test('a poll that belongs to a chat links to it', async () => {
    state.polls = [poll('p1', { discussionId: 'chat-1' })];
    await render(<QueuePanel kind="poll" pollFeed={feed()} trip={trip()} />);
    await page.getByRole('button', { name: 'Poll p1' }).click();
    await expect
      .element(page.getByRole('link', { name: 'In chat' }))
      .toHaveAttribute('href', '/chat/chat-1');
  });

  test('on an archived trip nothing waits on the viewer and a poll offers neither vote nor close', async () => {
    state.polls = [poll('p1', { canClose: false, canVote: false, myOptionIds: ['o1'] })];
    await render(<QueuePanel kind="poll" pollFeed={feed()} trip={trip(1)} />);
    await expect.element(page.getByRole('heading', { name: /Your turn/ })).not.toBeInTheDocument();
    expect(
      rows()
        .elements()
        .filter((row) => row.hasAttribute('data-your-turn'))
    ).toHaveLength(0);
    await page.getByRole('button', { name: 'Poll p1' }).click();
    await expect.element(page.getByRole('radio', { name: /Tapas/ })).toBeDisabled();
    await expect.element(page.getByText('This trip is archived.')).toBeVisible();
    await expect.element(page.getByTestId(testIds.pollClose)).not.toBeInTheDocument();
    await expect.element(page.getByTestId(testIds.pollRetract)).not.toBeInTheDocument();
  });

  test('a search narrows the list by title', async () => {
    await render(<QueuePanel kind="issue" trip={trip()} />);
    await userEvent.keyboard('k');
    await page.getByRole('combobox').fill('Issue i1');
    await userEvent.keyboard('{Enter}');
    await expect.poll(() => rows().elements()).toHaveLength(1);
    await expect.element(page.getByRole('button', { name: 'Edit filter' })).toBeVisible();
  });
});

describe('QueuePanel older polls', () => {
  beforeEach(() => {
    state.canLoadMore = true;
  });

  test('are offered under Polls and load on demand', async () => {
    await render(<QueuePanel kind="poll" pollFeed={feed()} trip={trip()} />);
    await page.getByRole('button', { name: 'Show older polls' }).click();
    expect(state.loadMore).toHaveBeenCalledOnce();
  });

  test.each(['idea', 'issue'] as const)('are not offered under %s', async (kind) => {
    await render(<QueuePanel kind={kind} trip={trip()} />);
    await expect
      .element(page.getByRole('button', { name: 'Show older polls' }))
      .not.toBeInTheDocument();
  });
});

describe('QueuePanel Show filter', () => {
  beforeEach(() => {
    state.issues = [issue('i1')];
  });

  test('there is no Show or kind control', async () => {
    await render(<QueuePanel kind="issue" trip={trip()} />);
    await expect.element(page.getByRole('group', { name: 'Show' })).not.toBeInTheDocument();
    await expect.element(page.getByText('Ideas', { exact: true })).not.toBeInTheDocument();
  });
});

describe('QueuePanel creation requests', () => {
  test('the header asking for an issue opens the issue dialog', async () => {
    await render(<QueuePanel kind="issue" trip={trip()} />);
    useTripCreateRequestStore.getState().request('issue');
    await expect.element(page.getByTestId(testIds.createIssueDialog)).toBeInTheDocument();
  });

  test('the header asking for a poll opens the poll dialog', async () => {
    await render(<QueuePanel kind="poll" pollFeed={feed()} trip={trip()} />);
    useTripCreateRequestStore.getState().request('poll');
    await expect.element(page.getByTestId(testIds.createPollDialog)).toBeVisible();
  });
});

describe('QueuePanel wording and chips', () => {
  test('names the viewer "you", and says when an issue is unassigned', async () => {
    state.issues = [
      issue('i1', { assignee: mine }),
      issue('i2', { author: { name: 'Alex', userId: 'user-alex' } }),
      issue('i3')
    ];
    await render(<QueuePanel kind="issue" trip={trip()} />);
    await expect.element(page.getByText('Assigned to you')).toBeVisible();
    await expect.element(page.getByText('Unassigned · opened by you')).toBeVisible();
    await expect.element(page.getByText('Unassigned · opened by Sam')).toBeVisible();
  });

  test('ideas say who made them, and where they came from', async () => {
    state.ideas = [
      idea('a1', {
        author: { name: 'Alex', userId: 'user-alex' },
        issueId: 'i1',
        status: 'in_review'
      })
    ];
    await render(<QueuePanel kind="idea" trip={trip()} />);
    await expect.element(page.getByText('By you · from an issue')).toBeVisible();
  });

  test('marks a mandatory issue with a chip', async () => {
    state.issues = [issue('i1', { labels: ['mandatory'] }), issue('i2')];
    await render(<QueuePanel kind="issue" trip={trip()} />);
    await expect
      .poll(() => page.getByRole('img', { name: 'Mandatory' }).elements())
      .toHaveLength(1);
  });

  test('an overdue issue says so with its date', async () => {
    state.issues = [issue('i1', { dueAt: Date.now() - 3 * 86_400_000 })];
    await render(<QueuePanel kind="issue" trip={trip()} />);
    await expect.element(page.getByText(/Overdue · /u)).toBeVisible();
  });

  test("a single group of open items still has its heading when the rows are the viewer's", async () => {
    state.issues = [issue('i1', { assignee: mine }), issue('i2', { assignee: mine })];
    await render(<QueuePanel kind="issue" trip={trip()} />);
    await expect.poll(() => rows().elements()).toHaveLength(2);
    await expect.element(page.getByRole('heading', { name: 'Your turn · 2' })).toBeVisible();
    await expect.poll(() => page.getByRole('heading', { level: 2 }).elements()).toHaveLength(1);
  });

  test('Clear filter appears with a filter', async () => {
    state.issues = [issue('i1')];
    await render(<QueuePanel kind="issue" trip={trip()} />);
    const clear = page.getByRole('button', { name: /clear/iu });
    await expect.element(clear).not.toBeInTheDocument();
    await userEvent.keyboard('k');
    await page.getByRole('combobox').fill('Issue');
    await userEvent.keyboard('{Enter}');
    await expect.element(clear).toBeVisible();
  });

  test('the whole row of a poll opens it, not only its title', async () => {
    state.polls = [poll('p1')];
    await render(<QueuePanel kind="poll" pollFeed={feed()} trip={trip()} />);
    // The title button stretches over the row, so a click on the excerpt reaches it.
    const excerpt = page.getByText('No votes yet');
    await excerpt.click({ force: true });
    await expect.element(page.getByTestId(testIds.pollCard)).toBeVisible();
    await excerpt.click({ force: true });
    await expect.element(page.getByTestId(testIds.pollCard)).not.toBeInTheDocument();
  });

  test('the creator deletes a poll from its card after a confirmation', async () => {
    state.polls = [poll('p1', { canDelete: true })];
    state.actions.remove.mockResolvedValue(true);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    await render(<QueuePanel kind="poll" pollFeed={feed()} trip={trip()} />);
    await page.getByRole('button', { name: 'Poll p1' }).click();
    await page.getByRole('button', { name: 'Poll actions' }).click();
    await page.getByTestId(testIds.pollDelete).click();
    expect(confirm).toHaveBeenCalled();
    expect(state.actions.remove).toHaveBeenCalledWith('p1');
  });

  test('without permission the card offers no delete', async () => {
    state.polls = [poll('p1', { canDelete: false })];
    await render(<QueuePanel kind="poll" pollFeed={feed()} trip={trip()} />);
    await page.getByRole('button', { name: 'Poll p1' }).click();
    await expect
      .element(page.getByRole('button', { name: 'Poll actions' }))
      .not.toBeInTheDocument();
  });
});

describe('QueuePanel ledger', () => {
  test('an issue row carries its excerpt and assignee', async () => {
    state.issues = [
      issue('i1', {
        assignee: mine,
        body: 'The cruise  eats\nthe whole day'
      })
    ];
    await render(<QueuePanel kind="issue" trip={trip()} />);
    await expect.element(page.getByText('The cruise eats the whole day')).toBeVisible();
    await expect.element(page.getByRole('img', { name: 'Assignee: Alex' })).toBeVisible();
    await expect.element(page.getByText('Your turn.', { exact: false })).toBeInTheDocument();
  });

  test('an unassigned issue shows an empty avatar and a linked idea shows its chip', async () => {
    state.issues = [issue('i1', { idea: { id: 'idea-1', title: 'Douro by train' } })];
    await render(<QueuePanel kind="issue" trip={trip()} />);
    await expect.element(page.getByRole('img', { name: 'Assignee: nobody' })).toBeVisible();
    await expect.element(page.getByText('Douro by train')).toBeVisible();
  });

  test('a group folds away from its bar and opens again', async () => {
    state.issues = [issue('i1', { assignee: mine }), issue('i3')];
    await render(<QueuePanel kind="issue" trip={trip()} />);
    await expect.poll(() => rows().elements()).toHaveLength(2);
    const bar = page.getByRole('button', { name: 'Your turn · 1' });
    await expect.element(bar).toHaveAttribute('aria-expanded', 'true');
    await bar.click();
    await expect.element(bar).toHaveAttribute('aria-expanded', 'false');
    await expect.poll(() => rows().elements()).toHaveLength(1);
    await expect.element(page.getByRole('heading', { name: 'Your turn · 1' })).toBeVisible();
    await bar.click();
    await expect.poll(() => rows().elements()).toHaveLength(2);
  });

  const search = async (query: string) => {
    await userEvent.keyboard('k');
    await page.getByRole('combobox').fill(query);
    await userEvent.keyboard('{Enter}');
    // K is ignored while focus is still in the closing dialog, so the next search waits for it.
    await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
  };

  test('is:mandatory narrows to mandatory issues and the bar clears it', async () => {
    state.issues = [issue('i1', { labels: ['mandatory'] }), issue('i2')];
    await render(<QueuePanel kind="issue" trip={trip()} />);
    await expect.poll(() => rows().elements()).toHaveLength(2);
    await search('is:mandatory');
    await expect.poll(() => rows().elements()).toHaveLength(1);
    await page.getByRole('button', { name: 'Clear filter' }).click();
    await expect.poll(() => rows().elements()).toHaveLength(2);
  });

  test('the dialog offers domain filters for Issues and Ideas', async () => {
    state.issues = [issue('i1')];
    state.ideas = [idea('a1')];
    const view = await render(<QueuePanel kind="issue" trip={trip()} />);
    await userEvent.keyboard('k');
    await expect.element(page.getByRole('option', { name: /assignee:me/u })).toBeVisible();
    await expect.element(page.getByRole('option', { name: /is:mandatory/u })).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
    await view.rerender(<QueuePanel key="idea" kind="idea" trip={trip()} />);
    await page.getByRole('button', { name: 'Filter' }).click();
    await expect.element(page.getByRole('combobox')).toBeVisible();
    await expect.element(page.getByRole('option', { name: /status:in_review/u })).toBeVisible();
    await expect.element(page.getByRole('option', { name: /author:me/u })).toBeVisible();
  });

  test('idea filters combine status, author and title, reveal settled matches, and clear', async () => {
    state.ideas = [
      idea('a1', { author: mine, title: 'Train to Porto' }),
      idea('a2', { title: 'Train to Lisbon' }),
      idea('a3', { author: mine, status: 'merged', title: 'Train to Madrid' })
    ];
    await render(<QueuePanel kind="idea" trip={trip()} />);
    await search('status:in_review author:me Train');
    await expect.poll(() => rows().elements()).toHaveLength(1);
    await expect.element(page.getByRole('link', { name: 'Train to Porto' })).toBeVisible();
    await search('status:merged');
    await expect.element(page.getByRole('link', { name: 'Train to Madrid' })).toBeVisible();
    await page.getByRole('button', { name: 'Clear filter' }).click();
    await expect.element(page.getByRole('link', { name: 'Train to Porto' })).toBeVisible();
    await expect.element(page.getByRole('link', { name: 'Train to Lisbon' })).toBeVisible();
  });

  test('idea filters reject unknown status values and can narrow by whose turn', async () => {
    state.ideas = [idea('a1', { canApprove: true }), idea('a2')];
    await render(<QueuePanel kind="idea" trip={trip()} />);
    await search('is:your-turn');
    await expect.poll(() => rows().elements()).toHaveLength(1);
    await expect.element(page.getByRole('link', { name: 'Idea a1' })).toBeVisible();
    await search('status:unknown');
    await expect.element(page.getByText('No ideas match status:unknown')).toBeVisible();
  });

  test('assignee: filters to you, a teammate, or nobody, from typed words or the hints', async () => {
    const sam = { kind: 'user', name: 'Sam', userId: 'user-sam' };
    state.issues = [issue('i1', { assignee: mine }), issue('i2', { assignee: sam }), issue('i3')];
    await render(<QueuePanel kind="issue" trip={trip()} />);
    await expect.poll(() => rows().elements()).toHaveLength(3);
    await search('assignee:me');
    await expect.poll(() => rows().elements()).toHaveLength(1);
    await expect.element(rows().first()).toHaveAttribute('data-title', 'Issue i1');
    await search('assignee:sam');
    await expect.element(rows().first()).toHaveAttribute('data-title', 'Issue i2');
    await search('assignee:unassigned');
    await expect.element(rows().first()).toHaveAttribute('data-title', 'Issue i3');
    await userEvent.keyboard('k');
    await page.getByRole('combobox').fill('assignee:');
    await expect.element(page.getByRole('option', { name: /assignee:sam/u })).toBeVisible();
  });

  test('a title-only search with no match keeps its own copy', async () => {
    state.issues = [issue('i1')];
    await render(<QueuePanel kind="issue" trip={trip()} />);
    await search('zzz');
    await expect.element(page.getByText('No matches for “zzz”')).toBeVisible();
  });

  test('an empty filter shows example values; the count reads N of M', async () => {
    state.issues = [issue('i1', { assignee: mine }), issue('i2')];
    await render(<QueuePanel kind="issue" trip={trip()} />);
    await userEvent.keyboard('k');
    await expect.element(page.getByRole('option', { name: /assignee:me/u })).toBeVisible();
    await expect.element(page.getByRole('option', { name: /assignee:unassigned/u })).toBeVisible();
    await expect.element(page.getByRole('option', { name: /is:mandatory/u })).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
    await search('assignee:me');
    await expect.element(page.getByText('1 of 2 issues')).toBeVisible();
  });

  test('searching shows settled rows that matched, even when settled is the only group', async () => {
    state.issues = [issue('i1', { status: 'closed' }), issue('i2', { status: 'closed' })];
    await render(<QueuePanel kind="issue" trip={trip()} />);
    await expect.poll(() => rows().elements()).toHaveLength(2);
    await search('Issue i1');
    await expect.poll(() => rows().elements()).toHaveLength(1);
  });

  test('a search unfolds Settled, and clearing it folds Settled again', async () => {
    state.issues = [issue('i1'), issue('i2', { status: 'closed' })];
    await render(<QueuePanel kind="issue" trip={trip()} />);
    await expect.poll(() => rows().elements()).toHaveLength(1);
    await search('Issue');
    await expect.poll(() => rows().elements()).toHaveLength(2);
    await page.getByRole('button', { name: 'Clear filter' }).click();
    await expect.poll(() => rows().elements()).toHaveLength(1);
  });

  test('group headers fold only while folding applies: never while searching or with only Settled', async () => {
    state.issues = [issue('i1'), issue('i2', { status: 'closed' })];
    await render(<QueuePanel kind="issue" trip={trip()} />);
    const toggle = page.getByRole('button', { name: /^Settled/u });
    await expect.element(toggle).toHaveAttribute('aria-expanded', 'false');
    await search('Issue');
    await expect.element(page.getByRole('heading', { name: 'Settled · 1' })).toBeVisible();
    await expect.element(toggle).not.toBeInTheDocument();
    await expect.element(page.getByRole('link', { name: 'Issue i2' })).toBeVisible();
    // Clearing the search finds the fold state untouched: Settled is folded as before.
    await page.getByRole('button', { name: 'Clear filter' }).click();
    await expect.element(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  test('a queue of only Settled rows has no fold toggle', async () => {
    state.issues = [issue('i1', { status: 'closed' })];
    await render(<QueuePanel kind="issue" trip={trip()} />);
    await expect.element(page.getByRole('heading', { name: 'Settled · 1' })).toBeVisible();
    await expect.element(page.getByRole('button', { name: /^Settled/u })).not.toBeInTheDocument();
    await expect.element(page.getByRole('link', { name: 'Issue i1' })).toBeVisible();
  });

  test('the add-question row sits after the open groups and before Settled', async () => {
    state.issues = [issue('i1'), issue('i2', { status: 'closed' })];
    await render(<QueuePanel kind="issue" trip={trip()} />);
    const add = page.getByRole('textbox', { name: 'Add a question' });
    await expect.element(add).toBeVisible();
    const body = add.element().closest('[data-slot="queue-ledger"]');
    const order = [...(body?.querySelectorAll('h2, input') ?? [])].map(
      (node) => node.textContent || node.getAttribute('aria-label')
    );
    expect(order).toEqual(['Open · 1', 'Add a question', 'Settled · 1']);
  });

  test('teammates who share a name get distinct assignee values', async () => {
    const sam = (userId: string) => ({ kind: 'user', name: 'Sam', userId });
    state.issues = [
      issue('i1', { assignee: sam('user-sam-1') }),
      issue('i2', { assignee: sam('user-sam-2') })
    ];
    await render(<QueuePanel kind="issue" trip={trip()} />);
    await userEvent.keyboard('k');
    await page.getByRole('combobox').fill('assignee:s');
    await expect
      .element(page.getByRole('option', { name: /assignee:sam\b/u }).first())
      .toBeVisible();
    await expect.element(page.getByRole('option', { name: /assignee:sam-2/u })).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
    await search('assignee:sam-2');
    await expect.poll(() => rows().elements()).toHaveLength(1);
    await expect.element(rows().first()).toHaveAttribute('data-title', 'Issue i2');
  });

  test('an unknown is: value matches nothing', async () => {
    state.issues = [issue('i1', { labels: ['mandatory'] })];
    await render(<QueuePanel kind="issue" trip={trip()} />);
    await search('is:bogus');
    await expect.element(page.getByText('No issues match is:bogus')).toBeVisible();
  });

  test('filters with no match say so', async () => {
    state.issues = [issue('i1')];
    await render(<QueuePanel kind="issue" trip={trip()} />);
    await search('assignee:me');
    await expect.element(page.getByText('No issues match assignee:me')).toBeVisible();
    await expect.element(page.getByText('Remove a filter, or clear the search.')).toBeVisible();
  });

  test('Add a question creates a title-only issue on Enter, keeps focus, and Escape lets go', async () => {
    state.issues = [issue('i1')];
    state.create.mockResolvedValue('issue-9');
    await render(<QueuePanel kind="issue" trip={trip()} />);
    const input = page.getByRole('textbox', { name: 'Add a question' });
    await userEvent.type(input, '  Which airline?{Enter}');
    expect(state.create).toHaveBeenCalledWith(tripId, 'Which airline?', '');
    await expect.element(input).toHaveValue('');
    await expect.element(input).toHaveFocus();
    await userEvent.type(input, '{Enter}');
    expect(state.create).toHaveBeenCalledOnce();
    await userEvent.keyboard('{Escape}');
    await expect.element(input).not.toHaveFocus();
  });

  test.each([
    ['Ideas', 'idea', null],
    ['an archived trip', 'issue', 1]
  ] as const)('Add a question is not offered on %s', async (_name, kind, archivedAt) => {
    state.issues = [issue('i1')];
    state.ideas = [idea('a1')];
    await render(<QueuePanel kind={kind} trip={trip(archivedAt)} />);
    await expect.poll(() => rows().elements()).toHaveLength(1);
    await expect
      .element(page.getByRole('textbox', { name: 'Add a question' }))
      .not.toBeInTheDocument();
  });

  test.each([
    ['no votes', [], 'No votes yet'],
    [
      'a leader',
      [
        { count: 4, id: 'o1', label: 'Cervejaria Ramiro' },
        { count: 2, id: 'o2', label: 'Time Out Market' }
      ],
      'Cervejaria Ramiro leads 4–2'
    ],
    [
      'a tie',
      [
        { count: 3, id: 'o1', label: 'A' },
        { count: 3, id: 'o2', label: 'B' }
      ],
      'Tied at 3'
    ]
  ] as const)('a poll with %s reads "%s"', async (_name, tallies, text) => {
    state.polls = [poll('p1', { tallies: tallies.length ? tallies : poll('x').tallies })];
    await render(<QueuePanel kind="poll" pollFeed={feed()} trip={trip()} />);
    await expect
      .element(page.getByText(text === 'No votes yet' ? 'No votes yet' : text))
      .toBeVisible();
  });
});

describe('QueuePanel keyboard ledger', () => {
  const manageable = (id: string, updatedAt: number) =>
    issue(id, { canAssign: true, canManage: true, updatedAt });
  const cursorTitle = () =>
    rows()
      .elements()
      .find((row) => row.hasAttribute('data-cursor'))
      ?.getAttribute('data-title');

  test('the arrow keys move the cursor and focus its title; Enter opens a poll', async () => {
    state.polls = [poll('p1', { updatedAt: 20 }), poll('p2', { updatedAt: 10 })];
    await render(<QueuePanel kind="poll" pollFeed={feed()} trip={trip()} />);
    await expect.poll(() => rows().elements()).toHaveLength(2);
    await userEvent.keyboard('{ArrowDown}');
    await expect.poll(cursorTitle).toBe('Poll p1');
    await expect.element(page.getByRole('button', { name: 'Poll p1' })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    await expect.poll(cursorTitle).toBe('Poll p2');
    await userEvent.keyboard('{ArrowUp}');
    await expect.poll(cursorTitle).toBe('Poll p1');
    await userEvent.keyboard('{Enter}');
    await expect.element(page.getByTestId(testIds.pollCard)).toBeVisible();
  });

  test('the cursor skips folded groups', async () => {
    state.issues = [
      issue('i1', { assignee: mine, updatedAt: 30 }),
      issue('i2', { updatedAt: 20 }),
      issue('i3', { updatedAt: 10 })
    ];
    await render(<QueuePanel kind="issue" trip={trip()} />);
    await page.getByRole('button', { name: 'Your turn · 1' }).click();
    await userEvent.keyboard('{ArrowDown}');
    await expect.poll(cursorTitle).toBe('Issue i2');
  });

  test('keys typed into the search box are left alone', async () => {
    state.issues = [manageable('i1', 20), manageable('i2', 10)];
    await render(<QueuePanel kind="issue" trip={trip()} />);
    await userEvent.keyboard('k');
    await userEvent.type(page.getByRole('combobox'), 'kx');
    await expect.element(page.getByRole('combobox')).toHaveValue('kx');
    await expect.poll(cursorTitle).toBeUndefined();
    await expect.element(page.getByTestId(testIds.queuePanel)).not.toHaveTextContent('selected');
  });

  test('K opens the search, the footer hint does too, and C focuses the add-question input', async () => {
    state.issues = [manageable('i1', 20)];
    await render(<QueuePanel kind="issue" trip={trip()} />);
    await userEvent.keyboard('c');
    await expect.element(page.getByRole('textbox', { name: 'Add a question' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await userEvent.keyboard('k');
    await expect.element(page.getByRole('combobox')).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await expect.element(page.getByRole('combobox')).not.toBeInTheDocument();
    await page.getByRole('button', { exact: true, name: 'Filter' }).click();
    await expect.element(page.getByRole('combobox')).toHaveFocus();
  });

  test('the clickable footer hints do what their keys do; the plain ones are not buttons', async () => {
    state.issues = [manageable('i1', 20)];
    await render(<QueuePanel kind="issue" trip={trip()} />);
    const footer = page.getByLabelText('Keyboard shortcuts');
    await expect.element(footer.getByRole('button', { name: /new/u })).toBeVisible();
    await expect.element(footer.getByRole('button', { name: /move/u })).not.toBeInTheDocument();
    await footer.getByRole('button', { name: /new/u }).click();
    await expect.element(page.getByRole('textbox', { name: 'Add a question' })).toHaveFocus();
  });

  test('Ideas offer no C new hint', async () => {
    state.ideas = [idea('a1')];
    await render(<QueuePanel kind="idea" trip={trip()} />);
    const footer = page.getByLabelText('Keyboard shortcuts');
    await expect.element(footer.getByRole('button', { exact: true, name: 'Filter' })).toBeVisible();
    await expect.element(footer.getByRole('button', { name: /new/u })).not.toBeInTheDocument();
  });

  test('the header asking for search opens it', async () => {
    await render(<QueuePanel kind="issue" trip={trip()} />);
    useTripCreateRequestStore.getState().request('search');
    await expect.element(page.getByRole('combobox')).toBeVisible();
  });

  test('X selects rows, the batch Status applies to each, and Esc clears the selection', async () => {
    state.issues = [manageable('i1', 20), manageable('i2', 10)];
    state.setStatus.mockResolvedValue(true);
    await render(<QueuePanel kind="issue" trip={trip()} />);
    await userEvent.keyboard('{ArrowDown}x{ArrowDown}x');
    await expect.element(page.getByText('2 selected')).toBeVisible();
    await expect
      .element(page.getByRole('checkbox', { name: 'Select Issue i1' }))
      .toHaveAttribute('aria-checked', 'true');
    await userEvent.keyboard('{Escape}');
    await expect.element(page.getByText('2 selected')).not.toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    // The cursor stays on the last row, so walk back up first.
    await userEvent.keyboard('{ArrowUp}x{ArrowDown}x');
    await page.getByRole('button', { name: 'Status' }).click();
    await page.getByRole('menuitem', { name: 'Done' }).click();
    await expect.poll(() => state.setStatus.mock.calls).toHaveLength(2);
    expect(state.setStatus).toHaveBeenCalledWith('i1', 'closed');
    expect(state.setStatus).toHaveBeenCalledWith('i2', 'closed');
    await expect.element(page.getByText('2 selected')).not.toBeInTheDocument();
  });

  test('issues the viewer cannot manage have no checkbox', async () => {
    state.issues = [issue('i1')];
    await render(<QueuePanel kind="issue" trip={trip()} />);
    await expect.poll(() => rows().elements()).toHaveLength(1);
    await expect.element(page.getByRole('checkbox')).not.toBeInTheDocument();
  });

  test('the bottom bar shows shared sort and filter controls', async () => {
    state.issues = [manageable('i1', 20)];
    await render(<QueuePanel kind="issue" trip={trip()} />);
    const footer = page.getByLabelText('Keyboard shortcuts');
    await expect.element(footer).toBeVisible();
    await expect.element(footer.getByRole('button', { name: 'Sort issues' })).toBeVisible();
    await expect.element(footer.getByRole('button', { exact: true, name: 'Filter' })).toBeVisible();
  });

  test('an archived trip keeps sort and filter controls', async () => {
    state.issues = [manageable('i1', 20)];
    await render(<QueuePanel kind="issue" trip={trip(1)} />);
    await expect.poll(() => rows().elements()).toHaveLength(1);
    await expect.element(page.getByLabelText('Keyboard shortcuts')).toBeInTheDocument();
    await expect.element(page.getByText('move')).not.toBeInTheDocument();
  });
});

describe('QueuePanel expanded poll', () => {
  const open = async (overrides: Record<string, unknown> = {}) => {
    state.polls = [poll('p1', overrides)];
    state.actions.vote.mockResolvedValue(true);
    await render(<QueuePanel kind="poll" pollFeed={feed()} trip={trip()} />);
    // A lone closed poll is the only group, so Settled shows open without a toggle.
    await page.getByRole('button', { name: 'Poll p1' }).click();
  };

  test('clicking an option votes for it, and shows counts and shares', async () => {
    await open({
      tallies: [
        { count: 4, id: 'o1', label: 'Sushi' },
        { count: 3, id: 'o2', label: 'Tapas' }
      ],
      votedCount: 7
    });
    await expect.element(page.getByText('4 · 57%')).toBeVisible();
    await page.getByRole('radio', { name: /Tapas/ }).click();
    expect(state.actions.vote).toHaveBeenCalledWith('p1', ['o2']);
  });

  test('a multi-select toggles choices on and off', async () => {
    await open({ multiSelect: true, myOptionIds: ['o1'] });
    await page.getByRole('checkbox', { name: /Tapas/ }).click();
    expect(state.actions.vote).toHaveBeenLastCalledWith('p1', ['o1', 'o2']);
    state.actions.retract.mockResolvedValue(true);
    await page.getByRole('checkbox', { name: /Sushi/ }).click();
    expect(state.actions.vote).toHaveBeenCalled();
  });

  test('a poll stays open after a vote moves it out of Your turn', async () => {
    state.polls = [poll('p1')];
    const view = await render(<QueuePanel kind="poll" pollFeed={feed()} trip={trip()} />);
    await page.getByRole('button', { name: 'Poll p1' }).click();
    await expect.element(page.getByRole('radio', { name: /Tapas/ })).toBeVisible();
    state.polls = [poll('p1', { myOptionIds: ['o2'] })];
    await view.rerender(<QueuePanel kind="poll" pollFeed={feed()} trip={trip()} />);
    await expect.element(page.getByRole('heading', { name: /Your turn/ })).not.toBeInTheDocument();
    await expect.element(page.getByRole('radio', { name: /Tapas/ })).toBeChecked();
  });

  test('a viewer who voted can remove the vote', async () => {
    state.actions.retract.mockResolvedValue(true);
    await open({ myOptionIds: ['o1'] });
    await page.getByRole('button', { name: 'Remove my vote' }).click();
    expect(state.actions.retract).toHaveBeenCalledWith('p1');
  });

  test('a closed poll is read-only and marks its winner', async () => {
    await open({
      canClose: false,
      status: 'closed',
      tallies: [
        { count: 3, id: 'o1', label: 'Sushi' },
        { count: 1, id: 'o2', label: 'Tapas' }
      ],
      votedCount: 4
    });
    await expect.element(page.getByRole('radio', { name: /Tapas/ })).toBeDisabled();
    await expect.element(page.getByText('Winner')).toBeVisible();
    await expect.element(page.getByTestId(testIds.pollClose)).not.toBeInTheDocument();
  });
});
