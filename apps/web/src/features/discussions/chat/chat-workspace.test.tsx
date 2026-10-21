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

vi.mock('@groam/ai/ui/context/agent-context', () => ({
  useSetAgentContext: vi.fn()
}));

vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
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
      <div>thread</div>
    </ChatWorkspace>
  );
  await expect.element(page.getByText('No chats yet')).toBeInTheDocument();
  await expect.element(page.getByText('Your messages')).toBeInTheDocument();
  expect(page.getByRole('button', { name: 'New chat' }).elements()).toHaveLength(1);
});

test('lists chats and keeps the thread pane empty until one is open', async () => {
  state.discussions = [
    {
      id: 'discussion-1',
      lastMessage: { authorName: 'Ada', text: 'Airport rides?' },
      members: [{ image: null, name: 'Ada', userId: 'user-a' }],
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
  await expect.element(page.getByText('Italy dates')).toBeInTheDocument();
  await expect.element(page.getByText('Ada: Airport rides?')).toBeInTheDocument();
  await expect.element(page.getByText('thread')).not.toBeInTheDocument();
  await expect.element(page.getByText('Your messages')).toBeInTheDocument();
});

test('renders the open thread when a discussion is selected', async () => {
  state.params = { discussionId: 'discussion-1' };
  state.discussions = [
    {
      id: 'discussion-1',
      lastMessage: null,
      members: [{ image: null, name: 'Ada', userId: 'user-a' }],
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
});

test('finds chats by trip or participant and recovers from no matches', async () => {
  state.discussions = [
    {
      id: 'discussion-1',
      lastMessage: null,
      members: [{ image: null, name: 'Ada', userId: 'user-a' }],
      threadId: 'thread-1',
      title: 'Airport rides',
      tripName: 'Rome weekend',
      updatedAt: Date.now()
    } as DiscussionListItem,
    {
      id: 'discussion-2',
      lastMessage: null,
      members: [{ image: null, name: 'Grace', userId: 'user-b' }],
      threadId: 'thread-2',
      title: 'Packing list',
      tripName: null,
      updatedAt: Date.now()
    } as DiscussionListItem
  ];
  await render(
    <ChatWorkspace>
      <div>thread</div>
    </ChatWorkspace>
  );
  const search = page.getByRole('searchbox', { name: 'Search chats' });
  await search.fill('rome');
  await expect.element(page.getByRole('link', { name: 'Airport rides' })).toBeVisible();
  await expect.element(page.getByRole('link', { name: 'Packing list' })).not.toBeInTheDocument();
  await search.fill('Grace');
  await expect.element(page.getByRole('link', { name: 'Packing list' })).toBeVisible();
  await search.fill('no match');
  await expect.element(page.getByText(/No chats match/)).toBeVisible();
  await search.fill('');
  await expect.element(page.getByRole('link', { name: 'Airport rides' })).toBeVisible();
  await expect.element(page.getByRole('link', { name: 'Packing list' })).toBeVisible();
});
