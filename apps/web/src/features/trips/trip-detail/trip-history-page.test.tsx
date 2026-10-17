import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { testIds } from '@/lib/test-ids';
import { TripHistoryPage } from './trip-history-page';

vi.mock('@tanstack/react-router', async () => {
  const { mockRouterTargets } = await import('@/lib/testing/router-mock');
  return mockRouterTargets();
});

test('shows the history table without a subpage header or back link', async () => {
  await render(<TripHistoryPage trip={{ activity: [] } as unknown as TripDetail} />);
  await expect.element(page.getByTestId(testIds.tripHistoryPage)).toBeInTheDocument();
  await expect.element(page.getByRole('heading', { name: 'Trip history' })).not.toBeInTheDocument();
  await expect.element(page.getByText('Back to board')).not.toBeInTheDocument();
});
