import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import type { ComposerCommand } from '@/types/discussions';
import type { Poll } from '@/types/polls';
import { DiscussionThreadWithPolls } from './discussion-thread-with-polls';

const state = vi.hoisted(() => ({
  actions: { close: vi.fn(), create: vi.fn(), retract: vi.fn(), vote: vi.fn() },
  polls: [] as Poll[]
}));

vi.mock('@/features/polls/hooks/use-polls', () => ({
  useDiscussionPolls: () => ({ polls: state.polls }),
  usePollActions: () => state.actions
}));

vi.mock('./discussion-thread-body', () => ({
  DiscussionThreadBody: (props: {
    commands: ComposerCommand[];
    events: Array<{ content: ReactNode; key: string }>;
  }) => (
    <div>
      {props.events.map((event) => (
        <div key={event.key}>{event.content}</div>
      ))}
      <button onClick={() => props.commands[0]?.run?.('')} type="button">
        /poll
      </button>
    </div>
  )
}));

const discussionId = 'd1' as Id<'discussions'>;
const pollId = 'p1' as Id<'polls'>;

beforeEach(() => {
  vi.clearAllMocks();
  state.polls = [
    {
      canClose: true,
      canVote: true,
      closedAt: null,
      closesAt: null,
      createdAt: 5,
      createdBy: { kind: 'agent', name: 'Groam' },
      discussionId,
      eligibleCount: 3,
      id: pollId,
      multiSelect: false,
      myOptionIds: [],
      question: 'Dinner?',
      status: 'open',
      tallies: [
        { count: 0, id: 'o1', label: 'Sushi' },
        { count: 0, id: 'o2', label: 'Tapas' }
      ],
      tripId: null,
      votedCount: 0,
      voters: []
    } satisfies Poll
  ];
});

test('renders linked polls in the thread and routes card actions', async () => {
  state.actions.vote.mockResolvedValue(true);
  state.actions.close.mockResolvedValue(true);
  await render(<DiscussionThreadWithPolls discussionId={discussionId} threadId="t1" />);
  await expect.element(page.getByRole('article', { name: 'Poll: Dinner?' })).toBeVisible();
  await page.getByRole('radio', { name: /Sushi/ }).click();
  expect(state.actions.vote).toHaveBeenCalledWith(pollId, ['o1']);
  await page.getByTestId(testIds.pollClose).click();
  expect(state.actions.close).toHaveBeenCalledWith(pollId);
});

test('/poll opens the dialog and creates the poll in this chat', async () => {
  state.actions.create.mockResolvedValue('p2');
  await render(<DiscussionThreadWithPolls discussionId={discussionId} threadId="t1" />);
  await page.getByRole('button', { name: '/poll' }).click();
  await expect.element(page.getByTestId(testIds.createPollDialog)).toBeVisible();
  await userEvent.fill(page.getByLabelText('Question'), 'Lunch?');
  await userEvent.fill(page.getByLabelText('Option 1'), 'Pizza');
  await userEvent.fill(page.getByLabelText('Option 2'), 'Salad');
  await page.getByRole('button', { name: 'Create poll' }).click();
  expect(state.actions.create).toHaveBeenCalledWith(
    expect.objectContaining({ discussionId, options: ['Pizza', 'Salad'], question: 'Lunch?' })
  );
  await expect.element(page.getByTestId(testIds.createPollDialog)).not.toBeInTheDocument();
});
