import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { testIds } from '@/lib/test-ids';
import { TripDetailsEditor } from './trip-details-editor';

function makeTrip(overrides: Record<string, unknown> = {}) {
  return {
    currency: 'USD',
    dateNotes: null,
    destination: { name: 'Lisbon', status: 'known' },
    idealDurationDays: null,
    initialBudget: null,
    minimumDurationDays: null,
    name: 'Coast week',
    startDate: null,
    totalDurationDays: null,
    ...overrides
  } as unknown as TripDetail;
}

const onClose = vi.fn();

beforeEach(() => vi.clearAllMocks());

describe('TripDetailsEditor', () => {
  test('prefills the form from the trip', async () => {
    await render(
      <TripDetailsEditor
        onClose={onClose}
        trip={makeTrip({ dateNotes: 'Early summer', initialBudget: 2500, totalDurationDays: 7 })}
        update={vi.fn()}
      />
    );
    await expect.element(page.getByLabelText('Trip name')).toHaveValue('Coast week');
    await expect
      .element(page.getByLabelText('Approximate period or date notes'))
      .toHaveValue('Early summer');
    await expect.element(page.getByLabelText('Total trip length (days)')).toHaveValue(7);
    await expect.element(page.getByLabelText('Total group budget')).toHaveValue(2500);
  });

  test('saves edited details and closes on success', async () => {
    const update = vi.fn().mockResolvedValue(true);
    await render(
      <TripDetailsEditor
        onClose={onClose}
        trip={makeTrip({ startDate: '2026-05-01' })}
        update={update}
      />
    );
    await page.getByLabelText('Trip name').fill('Atlantic week');
    await page.getByLabelText('Approximate period or date notes').fill('  May  ');
    await page.getByLabelText('Total trip length (days)').fill('5');
    await page.getByLabelText('Total group budget').fill('1800');
    await page.getByTestId(testIds.editTripSave).click();
    await expect.poll(() => update.mock.calls.length).toBe(1);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        budget: { amount: 1800 },
        currency: 'USD',
        dateNotes: 'May',
        duration: { totalDays: 5 },
        name: 'Atlantic week',
        startDate: '2026-05-01'
      })
    );
    await expect.poll(() => onClose.mock.calls.length).toBe(1);
  });

  test('omits empty optional fields', async () => {
    const update = vi.fn().mockResolvedValue(true);
    await render(<TripDetailsEditor onClose={onClose} trip={makeTrip()} update={update} />);
    await page.getByTestId(testIds.editTripSave).click();
    await expect.poll(() => update.mock.calls.length).toBe(1);
    const input = update.mock.calls[0]?.[0];
    expect(input).not.toHaveProperty('budget');
    expect(input).not.toHaveProperty('duration');
    expect(input).not.toHaveProperty('startDate');
    expect(input.dateNotes).toBeUndefined();
  });

  test('stays open when the update is rejected', async () => {
    const update = vi.fn().mockResolvedValue(false);
    await render(<TripDetailsEditor onClose={onClose} trip={makeTrip()} update={update} />);
    await page.getByTestId(testIds.editTripSave).click();
    await expect.poll(() => update.mock.calls.length).toBe(1);
    expect(onClose).not.toHaveBeenCalled();
    await expect.element(page.getByLabelText('Trip name')).toBeVisible();
  });

  test('disables save for a blank name', async () => {
    await render(<TripDetailsEditor onClose={onClose} trip={makeTrip()} update={vi.fn()} />);
    await page.getByLabelText('Trip name').fill('   ');
    await expect.element(page.getByTestId(testIds.editTripSave)).toBeDisabled();
  });

  test('cancel closes without saving', async () => {
    const update = vi.fn();
    await render(<TripDetailsEditor onClose={onClose} trip={makeTrip()} update={update} />);
    await page.getByRole('button', { name: 'Cancel' }).click();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(update).not.toHaveBeenCalled();
  });

  test('locks the form while saving', async () => {
    const update = vi.fn(() => new Promise<boolean>(() => undefined));
    await render(<TripDetailsEditor onClose={onClose} trip={makeTrip()} update={update} />);
    await page.getByTestId(testIds.editTripSave).click();
    await expect.element(page.getByLabelText('Trip name')).toBeDisabled();
    await expect.element(page.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });
});
