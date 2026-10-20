import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { WorkspaceIdea } from '@/features/ideas/hooks/use-workspace-ideas';
import { IdeaListView } from './idea-list-view';

const state = vi.hoisted(() => ({
  viewerCanLoadMore: false,
  viewerLoadingMore: false,
  viewerLoadMore: vi.fn(),
  isLoading: false,
  loadMore: vi.fn(),
  proposals: [] as WorkspaceIdea[],
  status: 'Exhausted' as 'CanLoadMore' | 'Done' | 'Exhausted' | 'LoadingFirstPage' | 'LoadingMore'
}));

vi.mock('@groam/ai/ui/context/agent-context', () => ({
  useSetAgentContext: () => undefined
}));

vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useWorkspace: () => ({
    activeOrganization: { id: 'org-acme', name: 'Acme Labs' },
    session: { user: { id: 'user-alex' } }
  })
}));

vi.mock('@/features/trips/hooks/use-trips', () => ({
  useTrips: () => ({
    isLoading: false,
    trips: []
  })
}));

vi.mock('@/features/ideas/hooks/use-workspace-ideas', () => ({
  useCreateIdea: () => vi.fn(),
  useViewerOpenIdeas: () => ({
    canLoadMore: state.viewerCanLoadMore,
    isLoadingMore: state.viewerLoadingMore,
    loadMore: state.viewerLoadMore,
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

vi.mock('@/lib/navigation/router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/navigation/router')>()),
  Link: ({ children, to }: { children?: ReactNode; to: string }) => <a href={to}>{children}</a>,
  useNavigate: () => vi.fn()
}));

beforeEach(() => {
  vi.clearAllMocks();
  state.isLoading = false;
  state.viewerCanLoadMore = false;
  state.viewerLoadingMore = false;
  state.proposals = [];
  state.loadMore = vi.fn();
  state.status = 'Exhausted';
});

describe('IdeaListView', () => {
  test('shows a labeled loading state while ideas load', async () => {
    state.isLoading = true;
    await render(<IdeaListView />);
    await expect.element(page.getByRole('status', { name: 'Loading ideas…' })).toBeInTheDocument();
  });

  test('invites the group to start an idea when none exist', async () => {
    await render(<IdeaListView />);
    await expect.element(page.getByTestId('empty-screen')).toBeInTheDocument();
    await expect.element(page.getByText('Start an idea')).toBeInTheDocument();
    await expect.element(page.getByText('Acme Labs')).not.toBeInTheDocument();
    await expect.element(page.getByTestId('ideas-title')).toBeInTheDocument();
    expect(page.getByText(/idea until the group reviews/u).elements().length).toBeGreaterThan(0);
    expect(page.getByRole('button', { name: 'New idea' }).elements()).toHaveLength(1);
    await expect
      .element(page.getByRole('button', { name: 'Delete draft' }))
      .not.toBeInTheDocument();
  });

  test('renders workspace ideas with their trip names', async () => {
    state.proposals = [
      {
        author: { name: 'Alex Morgan', userId: 'user-alex' },
        ideaName: 'coast-day',
        id: 'idea-1' as WorkspaceIdea['id'],
        reviewRequested: false,
        sourceTripId: 'trip-1' as WorkspaceIdea['sourceTripId'],
        sourceTripName: 'Atlantic week',
        status: 'in_review',
        title: 'Add a coast day',
        updatedAt: Date.UTC(2026, 7, 17),
        workingTripId: 'working-1' as WorkspaceIdea['workingTripId']
      }
    ];
    await render(<IdeaListView />);
    await expect.element(page.getByText('Acme Labs')).not.toBeInTheDocument();
    await expect.element(page.getByTestId('ideas-title')).toBeInTheDocument();
    await expect.element(page.getByText('Add a coast day')).toBeInTheDocument();
    expect(page.getByText('Atlantic week').elements()).toHaveLength(1);
    await expect.element(page.getByText('In review')).toBeInTheDocument();
    await expect.element(page.getByText('Coast day')).not.toBeInTheDocument();
    await expect
      .element(page.getByRole('link', { name: 'Open' }))
      .toHaveAttribute('href', '/trips/$tripId/ideas/$proposalId/$view');
    await expect
      .element(page.getByRole('button', { name: 'Delete draft' }))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByRole('button', { name: 'Close without applying' }))
      .not.toBeInTheDocument();
  });

  test('pins the viewer’s draft to the top of the workspace list', async () => {
    state.proposals = [
      {
        author: { name: 'Alex Morgan', userId: 'user-alex' },
        ideaName: 'coast-day',
        id: 'idea-review' as WorkspaceIdea['id'],
        reviewRequested: false,
        sourceTripId: 'trip-1' as WorkspaceIdea['sourceTripId'],
        sourceTripName: 'Atlantic week',
        status: 'in_review',
        title: 'Add a coast day',
        updatedAt: Date.UTC(2026, 7, 18),
        workingTripId: 'working-2' as WorkspaceIdea['workingTripId']
      },
      {
        author: { name: 'Alex Morgan', userId: 'user-alex' },
        ideaName: 'extra-night',
        id: 'idea-1' as WorkspaceIdea['id'],
        reviewRequested: false,
        sourceTripId: 'trip-1' as WorkspaceIdea['sourceTripId'],
        sourceTripName: 'Atlantic week',
        status: 'draft',
        title: 'Extend the stay',
        updatedAt: Date.UTC(2026, 7, 17),
        workingTripId: 'working-1' as WorkspaceIdea['workingTripId']
      }
    ];
    await render(<IdeaListView />);
    await expect.element(page.getByLabelText('Your pending idea')).not.toBeInTheDocument();
    await expect.element(page.getByText('Your draft')).toBeInTheDocument();
    await expect
      .element(page.getByRole('button', { name: 'Continue editing' }))
      .toBeInTheDocument();
    await expect.element(page.getByTestId('idea-continue')).toBeInTheDocument();
    await expect
      .element(page.getByRole('button', { name: 'Delete draft' }))
      .not.toBeInTheDocument();
    const titles = page
      .getByRole('heading', { level: 4 })
      .elements()
      .map((heading) => heading.textContent);
    expect(titles[0]).toBe('Extend the stay');
    await expect.element(page.getByText('Your draft')).toBeVisible();
  });
});

test('offers pending-idea continuation even when no accessible ideas have loaded', async () => {
  state.viewerCanLoadMore = true;
  await render(<IdeaListView />);
  expect(state.viewerLoadMore).not.toHaveBeenCalled();
  await expect.element(page.getByTestId('empty-screen')).not.toBeInTheDocument();
  await expect.element(page.getByText('No open ideas.', { exact: true })).not.toBeInTheDocument();
  await page.getByRole('button', { name: 'Load more of your open ideas' }).click();
  expect(state.viewerLoadMore).toHaveBeenCalledTimes(1);
});

test('disables pending-idea continuation while the next page is loading', async () => {
  state.viewerLoadingMore = true;
  await render(<IdeaListView />);
  await expect
    .element(page.getByRole('button', { name: 'Loading your open ideas…' }))
    .toBeDisabled();
});

test('keeps workspace continuation visible after an empty filtered page without claiming the list is empty', async () => {
  state.status = 'CanLoadMore';
  await render(<IdeaListView />);
  await expect.element(page.getByRole('button', { name: 'Load more ideas' })).toBeVisible();
  await expect.element(page.getByTestId('empty-screen')).not.toBeInTheDocument();
  await expect.element(page.getByText('No open ideas.', { exact: true })).not.toBeInTheDocument();
  await expect.element(page.getByText('No ideas yet.', { exact: true })).not.toBeInTheDocument();
  await page.getByRole('button', { name: 'Load more ideas' }).click();
  expect(state.loadMore).toHaveBeenCalledWith(25);
});
