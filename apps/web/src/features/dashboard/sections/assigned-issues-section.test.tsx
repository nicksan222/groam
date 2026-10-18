import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { dashboardIssue } from '@/features/dashboard/testing/dashboard-activity-fixtures';
import { testIds } from '@/lib/test-ids';
import { AssignedIssuesSection } from './assigned-issues-section';

const state = vi.hoisted(() => ({ assigned: [] as unknown[], isLoading: false }));
vi.mock('@/features/dashboard/hooks/use-dashboard-issues', () => ({
  useDashboardIssues: () => ({ assigned: state.assigned, isLoading: state.isLoading, open: [] })
}));
vi.mock('@tanstack/react-router', async () => {
  const { mockRouterTargets } = await import('@/lib/testing/router-mock');
  return mockRouterTargets();
});

beforeEach(() => {
  state.assigned = [];
  state.isLoading = false;
});

describe('AssignedIssuesSection', () => {
  test('is hidden when empty', async () => {
    await render(<AssignedIssuesSection />);
    await expect.element(page.getByTestId(testIds.dashboardAssignedIssues)).not.toBeInTheDocument();
  });

  test('is hidden while loading', async () => {
    state.isLoading = true;
    state.assigned = [dashboardIssue()];
    await render(<AssignedIssuesSection />);
    await expect.element(page.getByTestId(testIds.dashboardAssignedIssues)).not.toBeInTheDocument();
  });

  test('links each issue to its detail with the shared status badge', async () => {
    state.assigned = [dashboardIssue({ id: 'issue-7' as never, title: 'Book the ferry' })];
    await render(<AssignedIssuesSection />);
    const row = page.getByTestId(testIds.dashboardAssignedIssuesRow);
    await expect.element(row).toHaveAttribute('href', '/issues/issue-7');
    await expect.element(row.getByText('Book the ferry')).toBeVisible();
    await expect.element(row.getByText('To decide')).toBeVisible();
    await expect
      .element(page.getByRole('link', { name: 'See all' }))
      .toHaveAttribute('href', '/issues');
  });
});
