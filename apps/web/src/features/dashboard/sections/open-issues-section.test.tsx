import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { dashboardIssue } from '@/features/dashboard/testing/dashboard-activity-fixtures';
import { testIds } from '@/lib/test-ids';
import { OpenIssuesSection } from './open-issues-section';

const state = vi.hoisted(() => ({ isLoading: false, open: [] as unknown[] }));
vi.mock('@/features/dashboard/hooks/use-dashboard-issues', () => ({
  useDashboardIssues: () => ({ assigned: [], isLoading: state.isLoading, open: state.open })
}));
vi.mock('@tanstack/react-router', async () => {
  const { mockRouterTargets } = await import('@/lib/testing/router-mock');
  return mockRouterTargets();
});

beforeEach(() => {
  state.isLoading = false;
  state.open = [];
});

describe('OpenIssuesSection', () => {
  test('is hidden when empty', async () => {
    await render(<OpenIssuesSection />);
    await expect.element(page.getByTestId(testIds.dashboardOpenIssues)).not.toBeInTheDocument();
  });

  test('is hidden while loading', async () => {
    state.isLoading = true;
    state.open = [dashboardIssue()];
    await render(<OpenIssuesSection />);
    await expect.element(page.getByTestId(testIds.dashboardOpenIssues)).not.toBeInTheDocument();
  });

  test('shows trip, assignee fallback, status and detail links', async () => {
    state.open = [
      dashboardIssue({ id: 'issue-1' as never, status: 'in_progress', title: 'Pick a hotel' }),
      dashboardIssue({ id: 'issue-2' as never, title: 'Choose a day trip' })
    ];
    await render(<OpenIssuesSection />);
    const rows = page.getByTestId(testIds.dashboardOpenIssuesRow);
    expect(rows.elements()).toHaveLength(2);
    await expect.element(rows.first()).toHaveAttribute('href', '/issues/issue-1');
    await expect.element(page.getByText('In progress')).toBeVisible();
    await expect.element(page.getByText('Atlantic week · Unassigned').first()).toBeVisible();
    await expect
      .element(page.getByRole('link', { name: 'See all' }))
      .toHaveAttribute('href', '/issues');
  });
});
