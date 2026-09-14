import { SidebarProvider } from '@groam/ui/components/sidebar';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { resetSidebarChromeStore, useSidebarChromeStore } from '@/lib/stores/sidebar-chrome-store';
import { stubMatchMedia } from '@/testing/stub-match-media';
import type { WorkspaceIssue } from './hooks/use-workspace-issues';
import { IssuesSidebarNav } from './issues-sidebar-nav';

const state = vi.hoisted(() => ({
  isLoading: false,
  issues: [] as WorkspaceIssue[],
  loadMore: vi.fn(),
  params: {} as Record<string, unknown>,
  pathname: '/issues',
  status: 'Exhausted' as 'CanLoadMore' | 'Done' | 'Exhausted' | 'LoadingFirstPage' | 'LoadingMore',
  trips: [] as Array<{ archivedAt: null; id: string; name: string }>
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children?: ReactNode; to: string }) => <a href={to}>{children}</a>,
  useLocation: () => ({ pathname: state.pathname }),
  useNavigate: () => vi.fn(),
  useParams: () => state.params
}));

vi.mock('./hooks/use-workspace-issues', () => ({
  useCreateIssue: () => vi.fn(),
  useWorkspaceIssues: () => ({
    isLoading: state.isLoading,
    issues: state.issues,
    loadMore: state.loadMore,
    status: state.status
  })
}));

vi.mock('@/features/trips/hooks/use-trips', () => ({
  useTrips: () => ({
    isLoading: false,
    trips: state.trips
  })
}));

function issue(
  value: Partial<WorkspaceIssue> & Pick<WorkspaceIssue, 'id' | 'title'>
): WorkspaceIssue {
  return {
    assignee: null,
    author: { name: 'Alex Morgan', userId: 'user-alex' },
    body: 'Add a coast day.',
    closedAt: null,
    dueAt: null,
    idea: null,
    status: 'open',
    tripId: 'trip-1' as WorkspaceIssue['tripId'],
    tripName: 'Atlantic week',
    updatedAt: 1,
    ...value
  };
}

function renderNav() {
  return render(
    <SidebarProvider>
      <ul>
        <IssuesSidebarNav />
      </ul>
    </SidebarProvider>
  );
}

beforeEach(() => {
  resetSidebarChromeStore();
  useSidebarChromeStore.getState().setSectionOpen('issues', true);
  vi.clearAllMocks();
  state.isLoading = false;
  state.issues = [];
  state.loadMore = vi.fn();
  state.params = {};
  state.pathname = '/issues';
  state.status = 'Exhausted';
  state.trips = [];
  stubMatchMedia();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test('offers a new issue item when the inbox is empty', () => {
  renderNav();
  expect(screen.queryByRole('button', { name: 'New issue' })).toBeNull();
  fireEvent.click(screen.getByText('New issue'));
  expect(screen.getByText('Start with a trip')).toBeTruthy();
});

test('collapses listed issues from the parent action without leaving the index link', () => {
  state.issues = [
    issue({
      id: 'issue-1' as WorkspaceIssue['id'],
      title: 'Issue 1'
    })
  ];

  renderNav();
  expect(screen.getByText('Issue 1')).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Issues' }).getAttribute('href')).toBe('/issues');

  fireEvent.click(screen.getByRole('link', { name: 'Issues' }));
  expect(screen.getByText('Issue 1')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Collapse issues' }));
  expect(screen.queryByText('Issue 1')).toBeNull();
  expect(screen.getByRole('button', { name: 'Expand issues' })).toBeTruthy();
});

test('lists open issues and can reveal more than the first page', () => {
  state.issues = Array.from({ length: 6 }, (_, index) =>
    issue({
      id: `issue-${index}` as WorkspaceIssue['id'],
      title: `Issue ${index + 1}`
    })
  );

  renderNav();
  expect(screen.getByText('Issue 1')).toBeTruthy();
  expect(screen.queryByText('Issue 6')).toBeNull();
  fireEvent.click(screen.getByText('Load more'));
  expect(screen.getByText('Issue 6')).toBeTruthy();
});
