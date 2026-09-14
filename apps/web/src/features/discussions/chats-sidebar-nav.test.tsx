import { SidebarProvider } from '@groam/ui/components/sidebar';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type { DiscussionListItem } from '@/features/discussions/hooks/use-discussions';
import { resetSidebarChromeStore, useSidebarChromeStore } from '@/lib/stores/sidebar-chrome-store';
import { stubMatchMedia } from '@/testing/stub-match-media';
import { ChatsSidebarNav } from './chats-sidebar-nav';

const state = vi.hoisted(() => ({
  discussions: [] as DiscussionListItem[],
  isLoading: false,
  pathname: '/chat'
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: { children?: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useLocation: () => ({ pathname: state.pathname }),
  useNavigate: () => vi.fn(),
  useParams: () => ({})
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

function renderNav() {
  return render(
    <SidebarProvider>
      <ul>
        <ChatsSidebarNav />
      </ul>
    </SidebarProvider>
  );
}

beforeEach(() => {
  resetSidebarChromeStore();
  useSidebarChromeStore.getState().setSectionOpen('chat', true);
  vi.clearAllMocks();
  state.discussions = [];
  state.isLoading = false;
  state.pathname = '/chat';
  stubMatchMedia();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test('offers a new chat item when the inbox is empty', () => {
  renderNav();
  expect(screen.queryByRole('button', { name: 'New chat' })).toBeNull();
  fireEvent.click(screen.getByText('New chat'));
  expect(
    screen.getByText(
      'Start a shared conversation with people in your group. Mention @groam if you want AI help in the thread.'
    )
  ).toBeTruthy();
});

test('collapses listed chats from the parent action without leaving the index link', () => {
  state.discussions = [
    {
      id: 'discussion-1',
      lastMessage: null,
      members: [],
      threadId: 'thread-1',
      title: 'Chat 1',
      updatedAt: 1
    }
  ] as unknown as DiscussionListItem[];

  renderNav();
  expect(screen.getByText('Chat 1')).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Chat' }).getAttribute('href')).toBe('/chat');

  fireEvent.click(screen.getByRole('link', { name: 'Chat' }));
  expect(screen.getByText('Chat 1')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Collapse chat' }));
  expect(screen.queryByText('Chat 1')).toBeNull();
  expect(screen.getByRole('button', { name: 'Expand chat' })).toBeTruthy();
});

test('lists chats and can reveal more than the first page', () => {
  state.discussions = Array.from({ length: 6 }, (_, index) => ({
    id: `discussion-${index}`,
    lastMessage: null,
    members: [],
    threadId: `thread-${index}`,
    title: `Chat ${index + 1}`,
    updatedAt: index
  })) as unknown as DiscussionListItem[];

  renderNav();
  expect(screen.getByText('Chat 1')).toBeTruthy();
  expect(screen.getByText('Chat 5')).toBeTruthy();
  expect(screen.queryByText('Chat 6')).toBeNull();

  fireEvent.click(screen.getByText('Load more'));
  expect(screen.getByText('Chat 6')).toBeTruthy();
});
