import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { useTripCreateRequestStore } from '@/lib/stores/trip-create-request-store';
import { testIds } from '@/lib/test-ids';
import { ActiveTripSection } from './active-trip-section';

vi.mock('@/lib/navigation/router', async (importOriginal) => ({
  ...(await (await import('@/lib/testing/router-mock')).mockRouter(importOriginal)),
  useParams: () => ({ tripId: 'abc123' }),
  useSearch: <T,>(parse: (search: Record<string, unknown>) => T) => parse({})
}));
vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useOptionalWorkspace: () => ({ session: { user: { id: 'user-alex' } } }),
  useWorkspace: () => ({ session: { user: { id: 'user-alex' } } })
}));
vi.mock('@/features/trips/hooks/use-trip-issues', () => ({
  useTripIssues: (_tripId: unknown, enabled = true) => ({ issues: enabled ? [] : undefined })
}));
vi.mock('@/features/trips/hooks/use-trip-versions', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/trips/hooks/use-trip-versions')>()),
  useTripVersions: (_tripId: unknown, enabled = true) => ({
    proposals: enabled ? [] : undefined
  })
}));
vi.mock('@/features/polls/hooks/use-polls', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/polls/hooks/use-polls')>()),
  usePollActions: () => ({ close: vi.fn(), create: vi.fn(), remove: vi.fn(), retract: vi.fn() })
}));
vi.mock('@/features/issues/shared/create-issue-dialog', () => ({
  CreateIssueDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid={testIds.createIssueDialog} /> : null
}));

const trip = {
  archivedAt: null,
  id: 'trip-1',
  name: 'Atlantic week',
  permissions: { canPropose: true }
} as unknown as TripDetail;
const feed = { canLoadMore: false, isLoading: false, loadMore: vi.fn(), polls: [] };

test('switching between Ideas, Issues, and Polls starts each queue fresh', async () => {
  const view = await render(<ActiveTripSection section="ideas" trip={trip} />);
  await userEvent.keyboard('k');
  await page.getByRole('combobox').fill('beach');
  await userEvent.keyboard('{Enter}');
  await expect
    .element(page.getByRole('button', { name: 'Edit filter' }))
    .toHaveTextContent('beach');

  await view.rerender(<ActiveTripSection section="issues" trip={trip} />);
  await expect.element(page.getByRole('button', { name: 'Edit filter' })).not.toBeInTheDocument();

  await userEvent.keyboard('k');
  await page.getByRole('combobox').fill('flights');
  await userEvent.keyboard('{Enter}');
  await view.rerender(<ActiveTripSection pollFeed={feed} section="polls" trip={trip} />);
  await expect.element(page.getByRole('button', { name: 'Edit filter' })).not.toBeInTheDocument();
});

test('a dialog opened on Issues does not follow the traveler to Polls', async () => {
  const view = await render(<ActiveTripSection section="issues" trip={trip} />);
  useTripCreateRequestStore.getState().request('issue');
  await expect.element(page.getByTestId(testIds.createIssueDialog)).toBeInTheDocument();

  await view.rerender(<ActiveTripSection pollFeed={feed} section="polls" trip={trip} />);
  await expect.element(page.getByTestId(testIds.createIssueDialog)).not.toBeInTheDocument();
  await expect.element(page.getByTestId(testIds.createPollDialog)).not.toBeInTheDocument();
});
