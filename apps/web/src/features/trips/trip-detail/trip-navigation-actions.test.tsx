import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { testIds } from '@/lib/test-ids';
import type { TripState } from './trip-detail-types';
import { TripNavigationActions } from './trip-navigation-actions';

function trip(overrides: Partial<TripDetail> = {}): TripDetail {
  return {
    id: 'trip-1' as Id<'trips'>,
    name: 'Atlantic week',
    permissions: {
      canArchive: false,
      canEdit: true,
      canEditCover: true,
      canPropose: false,
      canRestore: false,
      isReadOnly: false
    },
    proposal: {
      author: { name: 'Alex', userId: 'user-alex' },
      baseUpdatedAt: 0,
      ideaName: 'coast-day',
      sourceTripId: 'trip-1' as Id<'trips'>,
      status: 'draft'
    },
    ...overrides
  } as TripDetail;
}

function tripState(): TripState {
  return {
    restore: vi.fn()
  } as unknown as TripState;
}

test('leaves plan and history to the tabs instead of the actions menu', async () => {
  await render(
    <TripNavigationActions
      onEdit={vi.fn()}
      section="activity"
      trip={trip({ proposal: null })}
      tripState={tripState()}
    />
  );
  await page.getByTestId(testIds.tripActions).click();
  await expect.element(page.getByText('Export calendar')).toBeInTheDocument();
  await expect.element(page.getByText('Trip plan')).not.toBeInTheDocument();
  await expect.element(page.getByText('Trip history')).not.toBeInTheDocument();
});

test('puts Delete draft in the actions menu', async () => {
  const onCloseIdea = vi.fn();
  await render(
    <TripNavigationActions
      onCloseIdea={onCloseIdea}
      onEdit={vi.fn()}
      section="overview"
      trip={trip()}
      tripState={tripState()}
    />
  );

  await page.getByTestId(testIds.tripActions).click();
  await page.getByTestId(testIds.closeIdeaHeader).click();
  expect(onCloseIdea).toHaveBeenCalledOnce();
});

test('puts Close without applying in the actions menu for a submitted idea', async () => {
  const onCloseIdea = vi.fn();
  await render(
    <TripNavigationActions
      onCloseIdea={onCloseIdea}
      onEdit={vi.fn()}
      section="overview"
      trip={trip({
        proposal: {
          author: { name: 'Alex', userId: 'user-alex' },
          baseUpdatedAt: 0,
          ideaName: 'coast-day',
          sourceTripId: 'trip-1' as Id<'trips'>,
          status: 'in_review'
        }
      })}
      tripState={tripState()}
    />
  );

  await page.getByTestId(testIds.tripActions).click();
  await expect.element(page.getByText('Close without applying')).toBeInTheDocument();
});
