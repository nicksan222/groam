import type { Id } from '@groam/backend/data-model';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import type { TripState } from './trip-detail-types';
import { TripNavigationActions } from './trip-navigation-actions';

vi.mock('@groam/ui/components/dropdown-menu', async () => {
  const { dropdownMenuTestMock } = await import('@/lib/test-mocks/dropdown-menu');
  return dropdownMenuTestMock;
});

afterEach(cleanup);

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

test('puts Delete draft in the actions menu', () => {
  const onCloseIdea = vi.fn();
  render(
    <TripNavigationActions
      onCloseIdea={onCloseIdea}
      onEdit={vi.fn()}
      section="overview"
      trip={trip()}
      tripState={tripState()}
    />
  );

  fireEvent.click(screen.getByTestId('trip-actions'));
  fireEvent.click(screen.getByTestId('close-idea-header'));
  expect(onCloseIdea).toHaveBeenCalledOnce();
});

test('puts Close without applying in the actions menu for a submitted idea', () => {
  const onCloseIdea = vi.fn();
  render(
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

  fireEvent.click(screen.getByTestId('trip-actions'));
  expect(screen.getByText('Close without applying')).toBeTruthy();
});
