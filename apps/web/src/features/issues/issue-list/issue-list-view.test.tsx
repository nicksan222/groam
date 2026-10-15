import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { WorkspaceIssue } from '@/features/issues/hooks/use-workspace-issues';
import { IssueListView } from './issue-list-view';

const state = vi.hoisted(() => ({
  isLoading: false,
  issues: [] as WorkspaceIssue[],
  loadMore: vi.fn(),
  status: 'Exhausted' as 'CanLoadMore' | 'Done' | 'Exhausted' | 'LoadingFirstPage' | 'LoadingMore'
}));

vi.mock('@groam/ai/ui/context/agent-context', () => ({
  useSetAgentContext: () => undefined
}));

vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useWorkspace: () => ({
    activeOrganization: { id: 'org-acme', name: 'Acme Labs' }
  })
}));

vi.mock('@/features/trips/hooks/use-trips', () => ({
  useTrips: () => ({
    isLoading: false,
    trips: []
  })
}));

vi.mock('@/features/issues/hooks/use-workspace-issues', () => ({
  useCreateIssue: () => vi.fn(),
  useWorkspaceIssues: () => ({
    isLoading: state.isLoading,
    issues: state.issues,
    loadMore: state.loadMore,
    status: state.status
  })
}));

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  Link: ({ children, to }: { children?: ReactNode; to: string }) => <a href={to}>{children}</a>,
  useNavigate: () => vi.fn()
}));

beforeEach(() => {
  vi.clearAllMocks();
  state.isLoading = false;
  state.issues = [];
  state.loadMore = vi.fn();
  state.status = 'Exhausted';
});

describe('IssueListView', () => {
  test('shows a labeled loading state while issues load', async () => {
    state.isLoading = true;
    await render(<IssueListView />);
    await expect.element(page.getByRole('status', { name: 'Loading issues…' })).toBeInTheDocument();
  });

  test('invites the group to create an issue when none exist', async () => {
    await render(<IssueListView />);
    await expect.element(page.getByTestId('empty-screen')).toBeInTheDocument();
    await expect.element(page.getByText('Nothing is blocking the group yet')).toBeInTheDocument();
    expect(page.getByRole('button', { name: 'New issue' }).elements()).toHaveLength(1);
    await expect.element(page.getByText('Acme Labs')).not.toBeInTheDocument();
    await expect.element(page.getByRole('heading', { name: 'Issues' })).toBeInTheDocument();
  });

  test('gives a way to reach trips when an issue cannot be created yet', async () => {
    await render(<IssueListView />);
    await page.getByRole('button', { name: 'New issue' }).click();
    await expect
      .element(page.getByRole('heading', { name: 'Start with a trip' }))
      .toBeInTheDocument();
    await expect
      .element(page.getByRole('link', { name: 'Go to trips' }))
      .toHaveAttribute('href', '/trips');
    await expect
      .element(page.getByRole('button', { name: 'Create issue' }))
      .not.toBeInTheDocument();
  });

  test('renders workspace issues with their trip names', async () => {
    state.issues = [
      {
        assignee: null,
        author: { name: 'Alex Morgan', userId: 'user-alex' },
        body: 'Add a coast day.',
        closedAt: null,
        dueAt: null,
        id: 'issue-1' as WorkspaceIssue['id'],
        idea: null,
        status: 'open',
        title: 'Coast day',
        tripId: 'trip-1' as WorkspaceIssue['tripId'],
        tripName: 'Atlantic week',
        updatedAt: Date.UTC(2026, 7, 17)
      }
    ];
    await render(<IssueListView />);
    await expect.element(page.getByText('Coast day')).toBeInTheDocument();
    expect(page.getByText(/Atlantic week/u).elements()).toHaveLength(2);
    await expect.element(page.getByText('Acme Labs')).not.toBeInTheDocument();
    await expect.element(page.getByRole('heading', { name: 'Issues' })).toBeInTheDocument();
    await expect.element(page.getByLabelText('Search issues')).toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'New issue' })).toBeInTheDocument();
  });
});
