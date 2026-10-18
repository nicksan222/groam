import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { dashboardResearch } from '@/features/dashboard/testing/dashboard-activity-fixtures';
import { testIds } from '@/lib/test-ids';
import { ResearchSection } from './research-section';

const state = vi.hoisted(() => ({ isLoading: false, research: [] as unknown[] }));
vi.mock('@/features/dashboard/hooks/use-dashboard-research', () => ({
  useDashboardResearch: () => state
}));
vi.mock('@tanstack/react-router', async () => {
  const { mockRouterTargets } = await import('@/lib/testing/router-mock');
  return mockRouterTargets();
});

beforeEach(() => {
  state.isLoading = false;
  state.research = [];
});

describe('ResearchSection', () => {
  test('is hidden when empty or loading', async () => {
    await render(<ResearchSection />);
    await expect.element(page.getByTestId(testIds.dashboardResearch)).not.toBeInTheDocument();
    state.isLoading = true;
    state.research = [dashboardResearch()];
    await render(<ResearchSection />);
    await expect.element(page.getByTestId(testIds.dashboardResearch)).not.toBeInTheDocument();
  });

  test('links each thread to its research page with the last message', async () => {
    state.research = [dashboardResearch()];
    await render(<ResearchSection />);
    const row = page.getByTestId(testIds.dashboardResearchRow);
    await expect.element(row).toHaveAttribute('href', '/trips/trip-1/research/rsabc');
    await expect.element(row.getByText('Train options')).toBeVisible();
    await expect.element(row.getByText('Lea: Found a cheaper train')).toBeVisible();
    await expect.element(row.getByRole('img', { name: 'Unread' })).not.toBeInTheDocument();
  });

  test('marks unread threads with a dot', async () => {
    state.research = [dashboardResearch({ lastMessage: null, unread: true })];
    await render(<ResearchSection />);
    await expect.element(page.getByRole('img', { name: 'Unread' })).toBeVisible();
  });
});
