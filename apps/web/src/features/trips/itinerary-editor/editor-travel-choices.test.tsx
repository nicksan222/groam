import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripDetail } from '@/types/trips';
import { EditorTravelChoices } from './editor-travel-choices';

function makeTrip(overrides: Record<string, unknown> = {}): TripDetail {
  return {
    arrivalTransfer: null,
    departureTransfer: null,
    destinations: [
      {
        activities: [],
        endDay: 2,
        id: 'lisbon',
        name: 'Lisbon',
        startDay: 1,
        transferToNext: null
      },
      { activities: [], endDay: 4, id: 'porto', name: 'Porto', startDay: 3, transferToNext: null }
    ],
    totalDurationDays: 4,
    ...overrides
  } as unknown as TripDetail;
}

test('lists the journeys available on the day and hands the chosen target back', async () => {
  const onChoose = vi.fn();
  await render(
    <EditorTravelChoices day={2} onChoose={onChoose} onClose={vi.fn()} trip={makeTrip()} />
  );
  await expect.element(page.getByRole('region', { name: 'Add travel to Day 2' })).toBeVisible();
  await page.getByRole('button', { name: 'Lisbon → Porto' }).click();
  expect(onChoose).toHaveBeenCalledWith({ fromId: 'lisbon', kind: 'destination' });
});

test.each([
  [1, 'Getting to Lisbon', { kind: 'arrival' }],
  [4, 'Getting home from Porto', { kind: 'departure' }]
])('offers boundary travel on day %i', async (day, label, target) => {
  const onChoose = vi.fn();
  await render(
    <EditorTravelChoices day={day} onChoose={onChoose} onClose={vi.fn()} trip={makeTrip()} />
  );
  await page.getByRole('button', { name: label }).click();
  expect(onChoose).toHaveBeenCalledWith(target);
});

test('says everything is planned when no journey is left', async () => {
  const trip = makeTrip({ arrivalTransfer: { id: 'a' }, departureTransfer: { id: 'd' } });
  await render(<EditorTravelChoices day={3} onChoose={vi.fn()} onClose={vi.fn()} trip={trip} />);
  await expect
    .element(page.getByText('All available journeys for this day are planned.'))
    .toBeVisible();
});

test('closes from the close button', async () => {
  const onClose = vi.fn();
  await render(
    <EditorTravelChoices day={2} onChoose={vi.fn()} onClose={onClose} trip={makeTrip()} />
  );
  await page.getByRole('button', { name: 'Close travel choices' }).click();
  expect(onClose).toHaveBeenCalledTimes(1);
});
