import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import type { TripState } from '@/features/trips/trip-detail/trip-detail-types';
import { PlanningReadiness } from './planning-readiness';

vi.mock('@/features/trips/hooks/use-archive-trip', () => ({
  useArchiveTrip: () => ({ archive: vi.fn(), isPending: false, restore: vi.fn() })
}));

function makeProps(
  states: { hasDestination: boolean; hasDuration: boolean; hasTravelWindow: boolean },
  extra: Record<string, unknown> = {}
) {
  const completedSteps = Object.values(states).filter(Boolean).length;
  return {
    completedSteps,
    nextStep: {
      action: 'Do the next thing',
      description: 'desc',
      onClick: vi.fn(),
      title: 'What comes next'
    },
    onEditDetails: vi.fn(),
    onOpenItinerary: vi.fn(),
    states,
    ...extra
  };
}

describe('PlanningReadiness', () => {
  test('shows a busy loading card with a disabled action', async () => {
    await render(<PlanningReadiness isLoading />);
    await expect.element(page.getByText('Checking trip details…')).toBeVisible();
    await expect
      .element(page.getByRole('button', { name: /Add first destination/ }))
      .toBeDisabled();
  });

  test.each([
    [
      { hasDestination: false, hasDuration: false, hasTravelWindow: false },
      '0 of 3 complete',
      '0%'
    ],
    [
      { hasDestination: true, hasDuration: false, hasTravelWindow: false },
      '1 of 3 complete',
      '33%'
    ],
    [{ hasDestination: true, hasDuration: true, hasTravelWindow: true }, '3 of 3 complete', '100%']
  ])('reports progress %#', async (states, summary, percent) => {
    await render(<PlanningReadiness {...makeProps(states)} />);
    await expect.element(page.getByText(summary)).toBeVisible();
    await expect.element(page.getByText(percent, { exact: true })).toBeVisible();
  });

  test('checklist rows route to the right handlers', async () => {
    const props = makeProps({ hasDestination: false, hasDuration: false, hasTravelWindow: false });
    await render(<PlanningReadiness {...props} />);
    await page.getByRole('button', { name: 'Destination' }).click();
    expect(props.onOpenItinerary).toHaveBeenCalledTimes(1);
    await page.getByRole('button', { name: 'Travel window' }).click();
    await page.getByRole('button', { name: 'Trip length' }).click();
    expect(props.onEditDetails).toHaveBeenCalledTimes(2);
  });

  test('runs the next step action', async () => {
    const props = makeProps({ hasDestination: true, hasDuration: false, hasTravelWindow: false });
    await render(<PlanningReadiness {...props} />);
    await expect.element(page.getByText('What comes next')).toBeVisible();
    await page.getByRole('button', { name: 'Do the next thing' }).click();
    expect(props.nextStep.onClick).toHaveBeenCalledTimes(1);
  });

  test('offers calendar export and archive for a non-proposal trip', async () => {
    const trip = {
      archivedAt: null,
      destinations: [],
      name: 'T',
      permissions: { canArchive: true },
      proposal: null,
      startDate: null
    } as unknown as TripDetail;
    await render(
      <PlanningReadiness
        {...makeProps(
          { hasDestination: true, hasDuration: true, hasTravelWindow: true },
          { trip, tripState: {} as TripState }
        )}
      />
    );
    await expect.element(page.getByRole('button', { name: 'Export calendar' })).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Archive trip' })).toBeVisible();
  });

  test('omits calendar export for proposals', async () => {
    const trip = {
      archivedAt: null,
      destinations: [],
      name: 'T',
      permissions: { canArchive: false },
      proposal: { id: 'p1' },
      startDate: null
    } as unknown as TripDetail;
    await render(
      <PlanningReadiness
        {...makeProps(
          { hasDestination: true, hasDuration: true, hasTravelWindow: true },
          { trip, tripState: {} as TripState }
        )}
      />
    );
    await expect
      .element(page.getByRole('button', { name: 'Export calendar' }))
      .not.toBeInTheDocument();
  });
});
