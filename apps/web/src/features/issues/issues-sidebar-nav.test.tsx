import { SidebarProvider } from '@groam/ui/components/sidebar';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { workspaceIssue } from '@/features/issues/issue-fixtures';
import { resetSidebarChromeStore, useSidebarChromeStore } from '@/lib/stores/sidebar-chrome-store';
import type { WorkspaceIssue } from '@/types/issues';
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

vi.mock('@/features/issues/hooks/use-generate-rule', () => ({ useGenerateRule: () => vi.fn() }));
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
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

async function renderNav() {
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
});

test('offers a new issue item when the inbox is empty', async () => {
  await renderNav();
  await expect.element(page.getByRole('button', { name: 'New issue' })).not.toBeInTheDocument();
  await page.getByText('New issue').click();
  await expect.element(page.getByText('Start with a trip')).toBeInTheDocument();
});

test('collapses listed issues from the parent action without leaving the index link', async () => {
  state.issues = [
    workspaceIssue({
      id: 'issue-1' as WorkspaceIssue['id'],
      title: 'Issue 1'
    })
  ];

  await renderNav();
  await expect.element(page.getByText('Issue 1')).toBeInTheDocument();
  await expect
    .element(page.getByRole('link', { name: 'Issues' }))
    .toHaveAttribute('href', '/issues');

  await page.getByRole('link', { name: 'Issues' }).click();
  await expect.element(page.getByText('Issue 1')).toBeInTheDocument();

  await page.getByRole('button', { name: 'Collapse issues' }).click();
  await expect.element(page.getByText('Issue 1')).not.toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Expand issues' })).toBeInTheDocument();
});

test('lists open issues and can reveal more than the first page', async () => {
  state.issues = Array.from({ length: 6 }, (_, index) =>
    workspaceIssue({
      id: `issue-${index}` as WorkspaceIssue['id'],
      title: `Issue ${index + 1}`
    })
  );

  await renderNav();
  await expect.element(page.getByText('Issue 1')).toBeInTheDocument();
  await expect.element(page.getByText('Issue 6')).not.toBeInTheDocument();
  await page.getByText('Load more').click();
  await expect.element(page.getByText('Issue 6')).toBeInTheDocument();
});
