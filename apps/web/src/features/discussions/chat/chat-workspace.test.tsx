import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { DiscussionListItem } from '@/features/discussions/hooks/use-discussions';
import { ChatWorkspace } from './chat-workspace';

const state = vi.hoisted(() => ({
  discussions: [] as DiscussionListItem[],
  isLoading: false,
  params: {} as { discussionId?: string }
}));

vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useOptionalWorkspace: () => null,
  useWorkspace: () => ({
    activeOrganization: { id: 'org-1', name: 'Acme Labs' }
  })
}));

vi.mock('@/lib/navigation/router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/navigation/router')>()),
  Link: ({ children, to, ...props }: { children?: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
  useParams: () => state.params
}));

vi.mock('@/features/discussions/hooks/use-discussions', () => ({
  useCreateDiscussion: () => ({ createDiscussion: vi.fn() }),
  useRenameDiscussion: () => ({ renameDiscussion: vi.fn() }),
  useDiscussionRoster: () => ({ isLoading: false, members: [] }),
  useDiscussions: () => ({
    discussions: state.discussions,
    isLoading: state.isLoading
  })
}));

vi.mock('@/features/trips/hooks/use-trips', () => ({
  useTrips: () => ({ trips: [] })
}));

beforeEach(() => {
  state.discussions = [];
  state.isLoading = false;
  state.params = {};
});

test('shows an empty inbox when the group has no chats', async () => {
  await render(
    <ChatWorkspace>
      <div>inbox pane</div>
    </ChatWorkspace>
  );
  await expect.element(page.getByText('No chats yet')).toBeInTheDocument();
  await expect.element(page.getByText('inbox pane')).toBeInTheDocument();
  expect(page.getByRole('button', { name: 'New chat' }).elements()).toHaveLength(1);
  await expect
    .element(page.getByText('Every conversation in the group, trip chats included.'))
    .toBeVisible();
});

test('lists chats beside the pane the route renders', async () => {
  state.discussions = [
    {
      id: 'discussion-1',
      lastMessage: { authorName: 'Ada', text: 'Airport rides?' },
      members: [{ image: null, name: 'Ada', userId: 'user-a' }],
      tripId: null,
      threadId: 'thread-1',
      title: 'Italy dates',
      updatedAt: Date.now()
    } as DiscussionListItem
  ];
  await render(
    <ChatWorkspace>
      <div>inbox pane</div>
    </ChatWorkspace>
  );
  await expect.element(page.getByText('Italy dates')).toBeInTheDocument();
  await expect.element(page.getByText('Ada: Airport rides?')).toBeInTheDocument();
  await expect.element(page.getByText('inbox pane')).toBeInTheDocument();
});

test('renders the open thread when a discussion is selected', async () => {
  state.params = { discussionId: 'discussion-1' };
  state.discussions = [
    {
      createdBy: { name: 'Ada', userId: 'user-a' },
      id: 'discussion-1',
      lastMessage: null,
      shortId: 'disabc',
      members: [{ image: null, name: 'Ada', userId: 'user-a' }],
      tripId: null,
      threadId: 'thread-1',
      title: 'Italy dates',
      updatedAt: Date.now()
    } as DiscussionListItem
  ];
  await render(
    <ChatWorkspace>
      <div>thread</div>
    </ChatWorkspace>
  );
  await expect.element(page.getByText('thread')).toBeInTheDocument();
  await expect.element(page.getByTestId('chat-heading')).toHaveTextContent('Italy dates');
  await expect.element(page.getByTestId('chats-title')).not.toBeInTheDocument();
});

function chat(id: string, title: string, member: string, tripId: string | null) {
  return {
    id,
    lastMessage: null,
    members: [{ image: null, name: member, userId: `user-${member}` }],
    threadId: `thread-${id}`,
    title,
    tripId,
    tripName: tripId ? 'Rome weekend' : null,
    updatedAt: Date.now()
  } as DiscussionListItem;
}

test('lists trip chats alongside the group chats that belong to no trip', async () => {
  state.discussions = [
    chat('discussion-1', 'Airport rides', 'Ada', 'trip-1'),
    chat('discussion-2', 'Packing list', 'Grace', null)
  ];
  await render(
    <ChatWorkspace>
      <div>thread</div>
    </ChatWorkspace>
  );
  await expect.element(page.getByRole('link', { name: 'Packing list' })).toBeVisible();
  await expect.element(page.getByRole('link', { name: 'Airport rides' })).toBeVisible();
});

test('finds chats by participant and recovers from no matches', async () => {
  state.discussions = [
    chat('discussion-1', 'Airport rides', 'Ada', null),
    chat('discussion-2', 'Packing list', 'Grace', null)
  ];
  await render(
    <ChatWorkspace>
      <div>thread</div>
    </ChatWorkspace>
  );
  const search = page.getByRole('searchbox', { name: 'Search chats' });
  await search.fill('Grace');
  await expect.element(page.getByRole('link', { name: 'Packing list' })).toBeVisible();
  await expect.element(page.getByRole('link', { name: 'Airport rides' })).not.toBeInTheDocument();
  await search.fill('no match');
  await expect.element(page.getByText(/No chats match/)).toBeVisible();
  await search.fill('');
  await expect.element(page.getByRole('link', { name: 'Airport rides' })).toBeVisible();
  await expect.element(page.getByRole('link', { name: 'Packing list' })).toBeVisible();
});
