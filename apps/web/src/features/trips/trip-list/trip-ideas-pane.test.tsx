import { render } from '@groam/vitest-config/react';
import type { ComponentProps } from 'react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripListItem, WorkspaceTripProposal } from '@/features/trips/hooks/use-trips';
import { TripIdeasPane } from './trip-ideas-pane';

vi.mock('@/features/workspace/navigation/router', () => ({
  CanonicalLink: ({
    children,
    params,
    to,
    ...rest
  }: ComponentProps<'a'> & { params?: Record<string, string>; search?: unknown; to: string }) => (
    <a href={String(to).replace('$tripId', params?.tripId ?? '')} {...rest}>
      {children}
    </a>
  ),
  Link: ({
    children,
    params,
    search: _search,
    to,
    ...rest
  }: ComponentProps<'a'> & { params?: Record<string, string>; search?: unknown; to: string }) => (
    <a href={String(to).replace(/\$(\w+)/gu, (_, key: string) => params?.[key] ?? '')} {...rest}>
      {children}
    </a>
  )
}));

function makeTrip(overrides: Partial<TripListItem> = {}): TripListItem {
  return {
    archivedAt: null,
    coverUrl: null,
    dateNotes: null,
    destination: null,
    favorite: false,
    id: 'trip-1',
    lastUpdatedAt: 1,
    name: 'Atlantic week',
    nextAction: 'Continue planning',
    outstandingActionCount: 0,
    ...overrides
  } as unknown as TripListItem;
}

function makeIdea(overrides: Record<string, unknown> = {}): WorkspaceTripProposal {
  return {
    author: { name: 'Alex Morgan', userId: 'user-alex' },
    id: 'idea-1',
    reviewRequested: false,
    sourceTripId: 'trip-1',
    sourceTripName: 'Atlantic week',
    status: 'in_review',
    title: 'Add a coast day',
    updatedAt: 1,
    workingTripId: 'working-1',
    ...overrides
  } as unknown as WorkspaceTripProposal;
}

describe('TripIdeasPane', () => {
  test('shows loading copy while ideas load', async () => {
    await render(<TripIdeasPane isLoading items={[]} />);
    await expect.element(page.getByText(/Loading ideas…/u)).toBeVisible();
    await expect.element(page.getByText('Gathering the latest updates')).toBeVisible();
  });

  test('invites a new idea when there are none', async () => {
    await render(<TripIdeasPane isLoading={false} items={[]} trip={makeTrip()} />);
    await expect.element(page.getByText('0 open')).toBeVisible();
    await expect.element(page.getByText('0 applied')).toBeVisible();
    await expect.element(page.getByText('A little room for your next idea.')).toBeVisible();
  });

  test('counts open and applied ideas and features the first open one', async () => {
    await render(
      <TripIdeasPane
        isLoading={false}
        items={[
          makeIdea({ id: 'a', title: 'Add a coast day' }),
          makeIdea({ id: 'b', status: 'draft', title: 'Try a ferry' }),
          makeIdea({ id: 'c', status: 'merged', title: 'Old idea' })
        ]}
        trip={makeTrip()}
      />
    );
    await expect.element(page.getByText('2 open')).toBeVisible();
    await expect.element(page.getByText('1 applied')).toBeVisible();
    await expect.element(page.getByText('Add a coast day')).toBeVisible();
    await expect.element(page.getByText('Try a ferry')).not.toBeInTheDocument();
  });

  test('prefers an idea waiting on your review', async () => {
    await render(
      <TripIdeasPane
        isLoading={false}
        items={[
          makeIdea({ id: 'a', title: 'Add a coast day' }),
          makeIdea({ id: 'b', reviewRequested: true, title: 'Review me' })
        ]}
        trip={makeTrip()}
      />
    );
    await expect.element(page.getByText('Review me')).toBeVisible();
    await expect.element(page.getByText('Your review')).toBeVisible();
  });

  test.each([
    ['with a trip', makeTrip(), true],
    ['without a trip', undefined, false]
  ])('links to the trip ideas %s', async (_, trip, linked) => {
    await render(<TripIdeasPane isLoading={false} items={[]} trip={trip} />);
    const link = page.getByRole('link', { name: 'View ideas' });
    if (linked) await expect.element(link).toHaveAttribute('href', '/trips/trip-1/ideas');
    else await expect.element(link).not.toBeInTheDocument();
  });
});
