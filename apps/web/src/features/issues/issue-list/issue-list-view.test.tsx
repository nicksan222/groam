import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { WorkspaceIssue } from '@/features/issues/hooks/use-workspace-issues';
import { IssueListView } from './issue-list-view';

const state = vi.hoisted(() => ({
  isLoading: false,
  issues: [] as WorkspaceIssue[],
  loadMore: vi.fn(),
  status: 'Exhausted' as 'CanLoadMore' | 'Done' | 'Exhausted' | 'LoadingFirstPage' | 'LoadingMore'
}));

vi.mock('@groam/ui/ai/context/agent-context', () => ({
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

vi.mock('@tanstack/react-router', () => ({
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

afterEach(cleanup);

describe('IssueListView', () => {
  test('shows a labeled loading state while issues load', () => {
    state.isLoading = true;
    render(<IssueListView />);
    expect(screen.getByRole('status', { name: 'Loading issues…' })).toBeTruthy();
  });

  test('invites the group to create an issue when none exist', () => {
    render(<IssueListView />);
    expect(screen.getByTestId('empty-screen')).toBeTruthy();
    expect(screen.getByText('Nothing is blocking the group yet')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'New issue' })).toHaveLength(1);
    expect(screen.queryByText('Acme Labs')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Issues' })).toBeTruthy();
  });

  test('gives a way to reach trips when an issue cannot be created yet', () => {
    render(<IssueListView />);
    fireEvent.click(screen.getByRole('button', { name: 'New issue' }));
    expect(screen.getByRole('heading', { name: 'Start with a trip' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Go to trips' }).getAttribute('href')).toBe('/trips');
    expect(screen.queryByRole('button', { name: 'Create issue' })).toBeNull();
  });

  test('renders workspace issues with their trip names', () => {
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
    render(<IssueListView />);
    expect(screen.getByText('Coast day')).toBeTruthy();
    expect(screen.getAllByText(/Atlantic week/u)).toHaveLength(2);
    expect(screen.queryByText('Acme Labs')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Issues' })).toBeTruthy();
    expect(screen.getByLabelText('Search issues')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'New issue' })).toBeTruthy();
  });
});
