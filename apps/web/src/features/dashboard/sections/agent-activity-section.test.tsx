import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { dashboardRun } from '@/features/dashboard/testing/dashboard-activity-fixtures';
import { testIds } from '@/lib/test-ids';
import { AgentActivitySection } from './agent-activity-section';

const state = vi.hoisted(() => ({ activity: [] as unknown[], isLoading: false }));
vi.mock('@/features/dashboard/hooks/use-dashboard-runs', () => ({
  useDashboardRuns: () => ({ activity: state.activity, isLoading: state.isLoading, waiting: [] })
}));
vi.mock('@/lib/navigation/router', async () => {
  const { mockRouterTargets } = await import('@/lib/testing/router-mock');
  return mockRouterTargets();
});

beforeEach(() => {
  state.activity = [];
  state.isLoading = false;
});

describe('AgentActivitySection', () => {
  test('is hidden when empty or loading', async () => {
    await render(<AgentActivitySection />);
    await expect.element(page.getByTestId(testIds.dashboardAgentActivity)).not.toBeInTheDocument();
  });

  test('is hidden while loading', async () => {
    state.isLoading = true;
    state.activity = [dashboardRun()];
    await render(<AgentActivitySection />);
    await expect.element(page.getByTestId(testIds.dashboardAgentActivity)).not.toBeInTheDocument();
  });

  test('shows the agent, what it is doing, status and a link per run', async () => {
    state.activity = [
      dashboardRun({ id: 'run-1' as never }),
      dashboardRun({ id: 'run-2' as never, status: 'complete', title: 'Packing list' })
    ];
    await render(<AgentActivitySection />);
    const rows = page.getByTestId(testIds.dashboardAgentActivityRow);
    expect(rows.elements()).toHaveLength(2);
    await expect.element(rows.first()).toHaveAttribute('href', '/agents/reviewer/run-1');
    await expect.element(rows.first().getByText('Comparing hotels')).toBeVisible();
    await expect.element(page.getByText('Running')).toBeVisible();
    await expect.element(page.getByText('Done')).toBeVisible();
  });

  test('links See all to the agents page', async () => {
    state.activity = [dashboardRun()];
    await render(<AgentActivitySection />);
    await expect
      .element(page.getByRole('link', { name: 'See all' }))
      .toHaveAttribute('href', '/agents');
  });
});
