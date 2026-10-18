import { render } from '@groam/vitest-config/react';
import type { ComponentProps } from 'react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripListItem, WorkspaceTripProposal } from '@/features/trips/hooks/use-trips';
import { TripWorkspaceSection } from './trip-workspace-section';

vi.mock('@/features/workspace/navigation/router', () => ({
  CanonicalLink: ({
    children,
    params,
    to,
    ...rest
  }: ComponentProps<'a'> & { params?: Record<string, string>; search?: unknown; to: string }) => (
    <a href={String(to).replace(/\$(\w+)/gu, (_, key: string) => params?.[key] ?? '')} {...rest}>
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

const NOW = Date.now();

function makeTrip(overrides: Partial<TripListItem> = {}): TripListItem {
  return {
    archivedAt: null,
    coverUrl: null,
    dateNotes: 'Late September',
    destination: 'Lisbon',
    favorite: false,
    id: 'trip-1',
    lastUpdatedAt: NOW,
    name: 'Atlantic week',
    nextAction: 'Pick a hotel',
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
    updatedAt: NOW,
    workingTripId: 'working-1',
    ...overrides
  } as unknown as WorkspaceTripProposal;
}

describe('TripWorkspaceSection', () => {
  test.each([
    ['isLoading is set', { isLoading: true, trip: makeTrip() }],
    ['there is no trip yet', { trip: undefined }]
  ])('shows a skeleton card when %s', async (_, props) => {
    await render(<TripWorkspaceSection isLoadingProposals={false} proposals={[]} {...props} />);
    await expect.element(page.getByText('Where')).toBeVisible();
    await expect.element(page.getByText('When')).toBeVisible();
    await expect.element(page.getByText('Loading ideas…', { exact: false })).toBeVisible();
    await expect
      .element(page.getByRole('heading', { name: 'Atlantic week' }))
      .not.toBeInTheDocument();
  });

  test('links the card to the trip board with its facts', async () => {
    await render(
      <TripWorkspaceSection isLoadingProposals={false} proposals={[]} trip={makeTrip()} />
    );
    await expect
      .element(page.getByRole('link', { name: 'Atlantic week' }))
      .toHaveAttribute('href', '/trips/trip-1/board');
    await expect.element(page.getByRole('heading', { name: 'Atlantic week' })).toBeVisible();
    await expect.element(page.getByText('Lisbon')).toBeVisible();
    await expect.element(page.getByText('Late September')).toBeVisible();
    await expect.element(page.getByText('Updated today')).toBeVisible();
  });

  test('falls back when destination and dates are not set', async () => {
    await render(
      <TripWorkspaceSection
        isLoadingProposals={false}
        proposals={[]}
        trip={makeTrip({ dateNotes: null, destination: null })}
      />
    );
    await expect.element(page.getByText('Not decided yet')).toBeVisible();
    await expect.element(page.getByText('Flexible dates')).toBeVisible();
  });

  test.each([
    ['an outstanding action', { outstandingActionCount: 2 }, 'NEXT STEP', 'Pick a hotel'],
    ['nothing outstanding', { outstandingActionCount: 0 }, 'YOUR PLAN', 'Continue planning'],
    [
      'an archived trip with actions',
      { archivedAt: NOW, outstandingActionCount: 2 },
      'PAST TRIP',
      'Revisit the itinerary'
    ]
  ])('shows the call to action for %s', async (_, overrides, eyebrow, text) => {
    await render(
      <TripWorkspaceSection
        isLoadingProposals={false}
        proposals={[]}
        trip={makeTrip(overrides as Partial<TripListItem>)}
      />
    );
    await expect.element(page.getByText(eyebrow)).toBeVisible();
    await expect.element(page.getByText(text)).toBeVisible();
  });

  test('marks archived trips', async () => {
    await render(
      <TripWorkspaceSection
        isLoadingProposals={false}
        proposals={[]}
        trip={makeTrip({ archivedAt: NOW })}
      />
    );
    await expect.element(page.getByText('Archived')).toBeVisible();
    await expect
      .element(page.getByRole('link', { name: 'Atlantic week' }))
      .toHaveAttribute('data-archived', 'true');
  });

  test('uses the latest idea activity for the updated label', async () => {
    await render(
      <TripWorkspaceSection
        isLoadingProposals={false}
        proposals={[makeIdea({ updatedAt: NOW + 3 * 86_400_000 })]}
        trip={makeTrip()}
      />
    );
    await expect.element(page.getByText(/Updated in 3 days/u)).toBeVisible();
  });

  test('embeds the ideas pane for the trip', async () => {
    await render(
      <TripWorkspaceSection
        isLoadingProposals={false}
        proposals={[makeIdea(), makeIdea({ id: 'idea-2', status: 'merged', title: 'Old' })]}
        trip={makeTrip()}
      />
    );
    await expect.element(page.getByText('1 open')).toBeVisible();
    await expect.element(page.getByText('1 applied')).toBeVisible();
    await expect.element(page.getByRole('link', { name: 'View ideas' })).toBeVisible();
  });

  test('shows loading ideas inside a loaded card', async () => {
    await render(<TripWorkspaceSection isLoadingProposals proposals={[]} trip={makeTrip()} />);
    await expect.element(page.getByText(/Loading ideas…/u)).toBeVisible();
    await expect.element(page.getByRole('heading', { name: 'Atlantic week' })).toBeVisible();
  });
});
