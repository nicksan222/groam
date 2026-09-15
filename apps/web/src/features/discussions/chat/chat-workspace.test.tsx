import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type { DiscussionListItem } from '@/features/discussions/hooks/use-discussions';
import { ChatWorkspace } from './chat-workspace';

const state = vi.hoisted(() => ({
  discussions: [] as DiscussionListItem[],
  isLoading: false,
  params: {} as { discussionId?: string }
}));

vi.mock('@groam/ui/ai/context/agent-context', () => ({
  useSetAgentContext: vi.fn()
}));

vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useWorkspace: () => ({
    activeOrganization: { id: 'org-1', name: 'Acme Labs' }
  })
}));

vi.mock('@tanstack/react-router', () => ({
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

afterEach(cleanup);

beforeEach(() => {
  state.discussions = [];
  state.isLoading = false;
  state.params = {};
});

test('shows an empty inbox when the group has no chats', () => {
  render(
    <ChatWorkspace>
      <div>thread</div>
    </ChatWorkspace>
  );
  expect(screen.getByText('No chats yet')).toBeTruthy();
  expect(screen.getByText('Your messages')).toBeTruthy();
  expect(screen.getAllByRole('button', { name: 'New chat' })).toHaveLength(1);
});

test('lists chats and keeps the thread pane empty until one is open', () => {
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
  render(
    <ChatWorkspace>
      <div>thread</div>
    </ChatWorkspace>
  );
  expect(screen.getByText('Italy dates')).toBeTruthy();
  expect(screen.getByText('Ada: Airport rides?')).toBeTruthy();
  expect(screen.queryByText('thread')).toBeNull();
  expect(screen.getByText('Your messages')).toBeTruthy();
});

test('renders the open thread when a discussion is selected', () => {
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
  render(
    <ChatWorkspace>
      <div>thread</div>
    </ChatWorkspace>
  );
  expect(screen.getByText('thread')).toBeTruthy();
});
