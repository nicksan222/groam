import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { dashboardRun } from '@/features/dashboard/testing/dashboard-activity-fixtures';
import { testIds } from '@/lib/test-ids';
import { AgentWaitsSection } from './agent-waits-section';

const state = vi.hoisted(() => ({ isLoading: false, waiting: [] as unknown[] }));
vi.mock('@/features/dashboard/hooks/use-dashboard-runs', () => ({
  useDashboardRuns: () => ({ activity: [], isLoading: state.isLoading, waiting: state.waiting })
}));
vi.mock('@tanstack/react-router', async () => {
  const { mockRouterTargets } = await import('@/lib/testing/router-mock');
  return mockRouterTargets();
});

beforeEach(() => {
  state.isLoading = false;
  state.waiting = [];
});

describe('AgentWaitsSection', () => {
  test('is hidden without waiting runs', async () => {
    await render(<AgentWaitsSection />);
    await expect.element(page.getByTestId(testIds.dashboardAgentWaits)).not.toBeInTheDocument();
  });

  test('is hidden while loading', async () => {
    state.isLoading = true;
    state.waiting = [dashboardRun({ status: 'waiting' })];
    await render(<AgentWaitsSection />);
    await expect.element(page.getByTestId(testIds.dashboardAgentWaits)).not.toBeInTheDocument();
  });

  test('lists waiting runs linked to the run page with their status', async () => {
    state.waiting = [
      dashboardRun({ id: 'run-9' as never, status: 'waiting', title: 'Approve spend' })
    ];
    await render(<AgentWaitsSection />);
    await expect.element(page.getByText('Agents waiting on you')).toBeVisible();
    const row = page.getByTestId(testIds.dashboardAgentWaitsRow);
    await expect.element(row).toHaveAttribute('href', '/agents/reviewer/run-9');
    await expect.element(row.getByText('Approve spend')).toBeVisible();
    await expect.element(row.getByText('Waiting')).toBeVisible();
  });
});
