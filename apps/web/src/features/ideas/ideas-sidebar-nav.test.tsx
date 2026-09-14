import { SidebarProvider } from '@groam/ui/components/sidebar';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type { WorkspaceIdea } from '@/features/ideas/hooks/use-workspace-ideas';
import { resetSidebarChromeStore, useSidebarChromeStore } from '@/lib/stores/sidebar-chrome-store';
import { stubMatchMedia } from '@/testing/stub-match-media';
import { IdeasSidebarNav } from './ideas-sidebar-nav';

const state = vi.hoisted(() => ({
  isLoading: false,
  loadMore: vi.fn(),
  params: {} as Record<string, unknown>,
  pathname: '/ideas',
  proposals: [] as WorkspaceIdea[],
  status: 'CanLoadMore' as 'CanLoadMore' | 'Done' | 'LoadingFirstPage' | 'LoadingMore'
}));

vi.mock('@tanstack/react-router', () => ({
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

function renderNav() {
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
  stubMatchMedia();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test('shows browse trips when there are no open ideas and nothing left to fetch', () => {
  state.proposals = [
    proposal({
      id: 'closed' as WorkspaceIdea['id'],
      status: 'closed',
      title: 'Archived idea'
    })
  ];
  state.status = 'Done';

  renderNav();
  expect(screen.getByText('Browse trips')).toBeTruthy();
  expect(screen.queryByText('Load more')).toBeNull();
});

test('offers load more when the first fetched page only contains closed ideas', () => {
  state.proposals = [
    proposal({
      id: 'closed' as WorkspaceIdea['id'],
      status: 'closed',
      title: 'Archived idea'
    })
  ];
  state.status = 'CanLoadMore';

  renderNav();
  expect(screen.queryByText('Browse trips')).toBeNull();
  expect(screen.getByText('Load more')).toBeTruthy();

  fireEvent.click(screen.getByText('Load more'));
  expect(state.loadMore).toHaveBeenCalledWith(5);
});

test('lists open ideas and highlights the active working draft route', () => {
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

  renderNav();
  fireEvent.click(screen.getByRole('button', { name: 'Expand ideas' }));
  expect(screen.getByText('Your draft: Extend Lisbon stay')).toBeTruthy();
  expect(screen.getByText('Share the coast day')).toBeTruthy();
  const labels = screen
    .getAllByRole('link')
    .map((link) => link.textContent)
    .filter((text) => text === 'Your draft: Extend Lisbon stay' || text === 'Share the coast day');
  expect(labels[0]).toBe('Your draft: Extend Lisbon stay');
  expect(
    screen.getByText('Your draft: Extend Lisbon stay').closest('a')?.getAttribute('data-active')
  ).toBe('true');
  expect(
    screen.getByText('Your draft: Extend Lisbon stay').closest('[data-viewer-draft="true"]')
      ?.className
  ).toContain('bg-primary/5');
  expect(screen.getByText('Ideas').closest('a')?.getAttribute('href')).toBe('/ideas');
  expect(screen.getByText('Ideas').closest('a')?.getAttribute('data-active')).toBe('false');
});

test('highlights the ideas index on /ideas', () => {
  state.status = 'Done';
  renderNav();
  expect(screen.getByText('Ideas').closest('a')?.getAttribute('data-active')).toBe('true');
});

test('collapses listed ideas from the parent action without leaving the index link', () => {
  state.proposals = [
    proposal({
      id: 'draft' as WorkspaceIdea['id'],
      status: 'draft',
      title: 'Extend Lisbon stay'
    })
  ];
  state.status = 'Done';

  renderNav();
  expect(screen.getByText('Your draft: Extend Lisbon stay')).toBeTruthy();
  expect(screen.getByText('Ideas').closest('a')?.getAttribute('href')).toBe('/ideas');

  fireEvent.click(screen.getByText('Ideas'));
  expect(screen.getByText('Your draft: Extend Lisbon stay')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Collapse ideas' }));
  expect(screen.queryByText('Your draft: Extend Lisbon stay')).toBeNull();
  expect(screen.getByRole('button', { name: 'Expand ideas' })).toBeTruthy();
});
