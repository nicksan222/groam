import { SidebarProvider } from '@groam/ui/components/sidebar';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { DiscussionListItem } from '@/features/discussions/hooks/use-discussions';
import { resetSidebarChromeStore, useSidebarChromeStore } from '@/lib/stores/sidebar-chrome-store';
import { ChatsSidebarNav } from './chats-sidebar-nav';

const state = vi.hoisted(() => ({
  discussions: [] as DiscussionListItem[],
  isLoading: false,
  pathname: '/chat'
}));

vi.mock('@/lib/navigation/router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/navigation/router')>()),
  Link: ({ children, to, ...props }: { children?: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useLocation: () => ({
    hash: '',
    pathname: state.pathname,
    search: '',
    searchParams: new URLSearchParams()
  }),
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

async function renderNav() {
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
});

test('offers a new chat item when the inbox is empty', async () => {
  await renderNav();
  await expect.element(page.getByRole('button', { name: 'New chat' })).not.toBeInTheDocument();
  await page.getByText('New chat').click();
  await expect
    .element(
      page.getByText(
        'Start a shared conversation with people in your group. Mention @groam if you want AI help in the thread.'
      )
    )
    .toBeInTheDocument();
});

test('collapses listed chats from the parent action without leaving the index link', async () => {
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

  await renderNav();
  await expect.element(page.getByText('Chat 1')).toBeInTheDocument();
  await expect.element(page.getByRole('link', { name: 'Chat' })).toHaveAttribute('href', '/chat');

  await page.getByRole('link', { name: 'Chat' }).click();
  await expect.element(page.getByText('Chat 1')).toBeInTheDocument();

  await page.getByRole('button', { name: 'Collapse chat' }).click();
  await expect.element(page.getByText('Chat 1')).not.toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Expand chat' })).toBeInTheDocument();
});

test('lists chats and can reveal more than the first page', async () => {
  state.discussions = Array.from({ length: 6 }, (_, index) => ({
    id: `discussion-${index}`,
    lastMessage: null,
    members: [],
    threadId: `thread-${index}`,
    title: `Chat ${index + 1}`,
    updatedAt: index
  })) as unknown as DiscussionListItem[];

  await renderNav();
  await expect.element(page.getByText('Chat 1')).toBeInTheDocument();
  await expect.element(page.getByText('Chat 5')).toBeInTheDocument();
  await expect.element(page.getByText('Chat 6')).not.toBeInTheDocument();

  await page.getByText('Load more').click();
  await expect.element(page.getByText('Chat 6')).toBeInTheDocument();
});
