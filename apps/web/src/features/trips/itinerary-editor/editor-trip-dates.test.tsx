import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { ItineraryEditorProps } from '@/types/itinerary-editor';
import { EditorTripDates } from './editor-trip-dates';

const updateTripDuration = vi.hoisted(() => vi.fn());
vi.mock('@/features/trips/trip-detail/update-trip-duration', () => ({ updateTripDuration }));
vi.mock('@/features/trips/trip-overview/trip-duration-planner', () => ({
  TripDurationPlanner: (props: {
    minimumDays: number;
    onSave: (days: number, date?: string) => Promise<boolean>;
    startDate: string | null;
  }) => (
    <section aria-label="Planner stub">
      <p>minimum {props.minimumDays}</p>
      <p>start {props.startDate ?? 'none'}</p>
      <button onClick={() => void props.onSave(6, '2027-05-01')} type="button">
        save planner
      </button>
    </section>
  )
}));

function makeTrip(overrides: Record<string, unknown> = {}) {
  return {
    destinations: [
      {
        activities: [{ endDayNumber: 4 }],
        endDay: 3,
        stays: [{ checkOutDay: 5 }]
      }
    ],
    startDate: null,
    totalDurationDays: 7,
    ...overrides
  } as unknown as ItineraryEditorProps['trip'];
}

function renderDates(trip = makeTrip()) {
  const onClose = vi.fn();
  const updateTrip = vi.fn();
  return {
    onClose,
    result: render(<EditorTripDates onClose={onClose} trip={trip} updateTrip={updateTrip} />),
    updateTrip
  };
}

beforeEach(() => {
  updateTripDuration.mockReset();
  updateTripDuration.mockResolvedValue(true);
});

test('explains the dialog and derives the minimum length from the plan', async () => {
  await renderDates().result;
  await expect.element(page.getByText('Set the shape of your trip')).toBeVisible();
  await expect.element(page.getByText('minimum 5')).toBeVisible();
});

describe('trip length form', () => {
  test('is shown only when no start date is set', async () => {
    await renderDates().result;
    await expect.element(page.getByLabelText('Trip length in days')).toHaveValue(7);
  });

  test('is hidden once the trip has a start date', async () => {
    await renderDates(makeTrip({ startDate: '2027-01-01' })).result;
    await expect.element(page.getByLabelText('Trip length in days')).not.toBeInTheDocument();
    await expect.element(page.getByText('start 2027-01-01')).toBeVisible();
  });

  test('saves the length and closes on success', async () => {
    const { onClose, result, updateTrip } = renderDates();
    await result;
    await page.getByLabelText('Trip length in days').fill('9');
    await page.getByRole('button', { name: 'Save trip length' }).click();
    await vi.waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(updateTripDuration).toHaveBeenCalledWith(expect.anything(), { update: updateTrip }, 9);
  });

  test('stays open when saving fails', async () => {
    updateTripDuration.mockResolvedValue(false);
    const { onClose, result } = renderDates();
    await result;
    await page.getByRole('button', { name: 'Save trip length' }).click();
    await vi.waitFor(() => expect(updateTripDuration).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });

  test.each([
    ['below the minimum covered by the plan', '4'],
    ['above a year', '400'],
    ['not a whole number', '6.5']
  ])('disables saving for a length %s', async (_, value) => {
    await renderDates().result;
    await page.getByLabelText('Trip length in days').fill(value);
    await expect.element(page.getByRole('button', { name: 'Save trip length' })).toBeDisabled();
  });
});

describe('duration planner', () => {
  test('saves days and date, then closes', async () => {
    const { onClose, result, updateTrip } = renderDates();
    await result;
    await page.getByRole('button', { name: 'save planner' }).click();
    await vi.waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(updateTripDuration).toHaveBeenCalledWith(
      expect.anything(),
      { update: updateTrip },
      6,
      '2027-05-01'
    );
  });

  test('keeps the dialog open when the save is rejected', async () => {
    updateTripDuration.mockResolvedValue(false);
    const { onClose, result } = renderDates();
    await result;
    await page.getByRole('button', { name: 'save planner' }).click();
    await vi.waitFor(() => expect(updateTripDuration).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });
});
