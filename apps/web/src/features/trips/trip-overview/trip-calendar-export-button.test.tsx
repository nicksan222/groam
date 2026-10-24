import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { TripCalendarExportButton } from './trip-calendar-export-button';

const exportTripCalendar = vi.hoisted(() => vi.fn());

vi.mock('@/features/trips/trip-calendar-export', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/trips/trip-calendar-export')>()),
  exportTripCalendar
}));

function makeTrip(overrides: Record<string, unknown> = {}) {
  return {
    destinations: [{ activities: [], endDay: 2, startDay: 1 }],
    name: 'Portugal',
    startDate: '2026-05-01',
    ...overrides
  } as unknown as TripDetail;
}

beforeEach(() => vi.clearAllMocks());

describe('TripCalendarExportButton', () => {
  test('exports a scheduled trip', async () => {
    const trip = makeTrip();
    await render(<TripCalendarExportButton trip={trip} />);
    const button = page.getByRole('button', { name: 'Export calendar' });
    await expect.element(button).toBeEnabled();
    await button.click();
    expect(exportTripCalendar).toHaveBeenCalledWith(trip);
  });

  test.each([
    ['no start date', { startDate: null }, 'Add an exact start date to export a calendar.'],
    [
      'nothing scheduled',
      { destinations: [{ activities: [], endDay: null, startDay: null }] },
      'Schedule a stop or activity to export a calendar.'
    ]
  ])('is blocked with %s', async (_, overrides, message) => {
    await render(<TripCalendarExportButton trip={makeTrip(overrides)} />);
    await expect.element(page.getByRole('button', { name: 'Export calendar' })).toBeDisabled();
    await expect.element(page.getByText(message)).toBeVisible();
  });
});
