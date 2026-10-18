import { SidebarProvider } from '@groam/ui/components/sidebar';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { WorkspaceIdea } from '@/features/ideas/hooks/use-workspace-ideas';
import { resetSidebarChromeStore, useSidebarChromeStore } from '@/lib/stores/sidebar-chrome-store';
import { testIds } from '@/lib/test-ids';
import { IdeasSidebarNav } from './ideas-sidebar-nav';

const state = vi.hoisted(() => ({
  isLoading: false,
  loadMore: vi.fn(),
  params: {} as Record<string, unknown>,
  pathname: '/ideas',
  proposals: [] as WorkspaceIdea[],
  status: 'CanLoadMore' as 'CanLoadMore' | 'Done' | 'LoadingFirstPage' | 'LoadingMore'
}));

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  Link: ({ children, to, ...props }: { children?: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useLocation: () => ({ pathname: state.pathname }),
  useParams: () => state.params
}));

vi.mock('@/features/ideas/hooks/use-workspace-ideas', () => ({
  useViewerOpenIdeas: () => ({
    isLoading: false,
    proposals: state.proposals.filter((proposal) => proposal.status === 'draft')
  }),
  useWorkspaceIdeas: () => ({
    isLoading: state.isLoading,
    loadMore: state.loadMore,
    proposals: state.proposals,
    status: state.status
  })
}));

vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useOptionalWorkspace: () => ({
    session: { user: { id: 'user' } }
  })
}));

function proposal(
  value: Partial<WorkspaceIdea> & Pick<WorkspaceIdea, 'id' | 'status' | 'title'>
): WorkspaceIdea {
  return {
    author: { name: 'Test Owner', userId: 'user' },
    ideaName: 'bright-fox',
    reviewRequested: false,
    sourceTripId: 'trip-source' as WorkspaceIdea['sourceTripId'],
    sourceTripName: 'Summer trip',
    updatedAt: 1,
    workingTripId: 'trip-working' as WorkspaceIdea['workingTripId'],
    ...value
  };
}

async function renderNav() {
  return render(
    <SidebarProvider>
      <ul>
        <IdeasSidebarNav />
      </ul>
    </SidebarProvider>
  );
}

beforeEach(() => {
  resetSidebarChromeStore();
  useSidebarChromeStore.getState().setSectionOpen('ideas', true);
  vi.clearAllMocks();
  state.isLoading = false;
  state.loadMore = vi.fn();
  state.params = {};
  state.pathname = '/ideas';
  state.proposals = [];
  state.status = 'CanLoadMore';
});

test('shows browse trips when there are no open ideas and nothing left to fetch', async () => {
  state.proposals = [
    proposal({
      id: 'closed' as WorkspaceIdea['id'],
      status: 'closed',
      title: 'Archived idea'
    })
  ];
  state.status = 'Done';

  await renderNav();
  await expect.element(page.getByText('Browse trips')).toBeInTheDocument();
  await expect.element(page.getByText('Load more')).not.toBeInTheDocument();
});

test('offers load more when the first fetched page only contains closed ideas', async () => {
  state.proposals = [
    proposal({
      id: 'closed' as WorkspaceIdea['id'],
      status: 'closed',
      title: 'Archived idea'
    })
  ];
  state.status = 'CanLoadMore';

  await renderNav();
  await expect.element(page.getByText('Browse trips')).not.toBeInTheDocument();
  await expect.element(page.getByText('Load more')).toBeInTheDocument();

  await page.getByText('Load more').click();
  expect(state.loadMore).toHaveBeenCalledWith(5);
});

test('lists open ideas and highlights the active working draft route', async () => {
  useSidebarChromeStore.getState().setSectionOpen('ideas', false);
  state.proposals = [
    proposal({
      id: 'review' as WorkspaceIdea['id'],
      status: 'in_review',
      title: 'Share the coast day'
    }),
    proposal({
      id: 'draft' as WorkspaceIdea['id'],
      status: 'draft',
      title: 'Extend Lisbon stay'
    })
  ];
  state.params = { tripId: 'trip-working' };
  state.pathname = '/trips/trip-working/overview';
  state.status = 'Done';

  await renderNav();
  await page.getByRole('button', { name: 'Expand ideas' }).click();
  await expect.element(page.getByText('Your draft: Extend Lisbon stay')).toBeInTheDocument();
  await expect.element(page.getByText('Share the coast day')).toBeInTheDocument();
  const labels = page
    .getByRole('link')
    .elements()
    .map((link) => link.textContent)
    .filter((text) => text === 'Your draft: Extend Lisbon stay' || text === 'Share the coast day');
  expect(labels[0]).toBe('Your draft: Extend Lisbon stay');
  const draftLink = page.getByRole('link', { name: 'Your draft: Extend Lisbon stay' });
  await expect.element(draftLink).toHaveAttribute('data-active', 'true');
  await expect.element(draftLink).toHaveClass('bg-primary/5');
  await expect.element(page.getByTestId(testIds.navIdeas)).toHaveAttribute('href', '/ideas');
  await expect.element(page.getByTestId(testIds.navIdeas)).toHaveAttribute('data-active', 'false');
});

test('highlights the ideas index on /ideas', async () => {
  state.status = 'Done';
  await renderNav();
  await expect.element(page.getByTestId(testIds.navIdeas)).toHaveAttribute('data-active', 'true');
});

test('collapses listed ideas from the parent action without leaving the index link', async () => {
  state.proposals = [
    proposal({
      id: 'draft' as WorkspaceIdea['id'],
      status: 'draft',
      title: 'Extend Lisbon stay'
    })
  ];
  state.status = 'Done';

  await renderNav();
  await expect.element(page.getByText('Your draft: Extend Lisbon stay')).toBeInTheDocument();
  await expect.element(page.getByTestId(testIds.navIdeas)).toHaveAttribute('href', '/ideas');

  await page.getByTestId(testIds.navIdeas).click();
  await expect.element(page.getByText('Your draft: Extend Lisbon stay')).toBeInTheDocument();

  await page.getByRole('button', { name: 'Collapse ideas' }).click();
  await expect.element(page.getByText('Your draft: Extend Lisbon stay')).not.toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Expand ideas' })).toBeInTheDocument();
});
