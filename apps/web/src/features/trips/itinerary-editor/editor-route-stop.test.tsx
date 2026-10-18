import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { Destination } from '@/types/trips';
import { EditorRouteStop } from './editor-route-stop';

const confirm = vi.hoisted(() => vi.fn());
vi.mock('@/features/workspace/workspace-shell/use-confirm-dialog', () => ({
  useConfirm: () => confirm
}));
vi.mock('@/features/trips/trip-destinations/destination-schedule-editor', () => ({
  DestinationScheduleEditor: (props: { maximumDay: number | null; minimumDay: number }) => (
    <p>
      schedule {props.minimumDay}-{props.maximumDay}
    </p>
  )
}));

function makeStop(id: string, name: string, overrides: Record<string, unknown> = {}): Destination {
  return {
    activities: [],
    coverUrl: null,
    endDay: 2,
    id,
    name,
    startDay: 1,
    stays: [],
    transferToNext: null,
    ...overrides
  } as unknown as Destination;
}

const lisbon = makeStop('lisbon', 'Lisbon', { endDay: 2, startDay: 1 });
const porto = makeStop('porto', 'Porto', { endDay: 5, startDay: 3 });
const faro = makeStop('faro', 'Faro', { endDay: 7, startDay: 6 });

function renderStop(destination: Destination, trip: Record<string, unknown> = {}) {
  const actions = {
    moveDestination: vi.fn().mockResolvedValue(true),
    removeDestination: vi.fn().mockResolvedValue(true),
    updateDestination: vi.fn().mockResolvedValue(true)
  };
  const fullTrip = {
    arrivalTransfer: null,
    departureTransfer: null,
    destinations: [lisbon, porto, faro],
    startDate: null,
    totalDurationDays: 8,
    ...trip
  };
  return {
    actions,
    result: render(
      <EditorRouteStop destination={destination} trip={fullTrip as never} {...actions} />
    )
  };
}

beforeEach(() => {
  confirm.mockReset();
  confirm.mockResolvedValue(true);
});

describe('summary', () => {
  test.each([
    ['a multi-day stop', porto, 'Stop 2', 'Days 3–5'],
    ['a one-day stop', makeStop('lisbon', 'Lisbon', { endDay: 1, startDay: 1 }), 'Stop 1', 'Day 1'],
    [
      'an unscheduled stop',
      makeStop('lisbon', 'Lisbon', { endDay: null, startDay: null }),
      'Stop 1',
      'Choose its place in your trip'
    ]
  ])('describes %s', async (_, destination, stop, days) => {
    await renderStop(destination).result;
    await expect.element(page.getByText(stop)).toBeVisible();
    await expect.element(page.getByText(days)).toBeVisible();
    await expect.element(page.getByRole('heading', { name: destination.name })).toBeVisible();
  });

  test('bounds the schedule by the neighbouring stops', async () => {
    await renderStop(porto).result;
    await expect.element(page.getByText('schedule 2-6')).toBeVisible();
  });
});

describe('reordering and removal', () => {
  test('moves a stop without confirmation when no travel is affected', async () => {
    const { actions, result } = renderStop(porto);
    await result;
    await page.getByRole('button', { name: 'Reorder or remove Porto' }).click();
    await page.getByRole('menuitem', { name: /Move before Lisbon/ }).click();
    await vi.waitFor(() =>
      expect(actions.moveDestination).toHaveBeenCalledWith('porto', 'earlier')
    );
    expect(confirm).not.toHaveBeenCalled();
  });

  test('asks first when moving would clear travel, and stops on cancel', async () => {
    confirm.mockResolvedValue(false);
    const withTravel = makeStop('lisbon', 'Lisbon', { transferToNext: { id: 't' } });
    const { actions, result } = renderStop(porto, { destinations: [withTravel, porto, faro] });
    await result;
    await page.getByRole('button', { name: 'Reorder or remove Porto' }).click();
    await page.getByRole('menuitem', { name: /Move after Faro/ }).click();
    await vi.waitFor(() =>
      expect(confirm).toHaveBeenCalledWith(
        'Move Porto?',
        'Affected travel details will be cleared.'
      )
    );
    expect(actions.moveDestination).not.toHaveBeenCalled();
  });

  test('disables the unavailable directions at the ends of the route', async () => {
    await renderStop(lisbon).result;
    await page.getByRole('button', { name: 'Reorder or remove Lisbon' }).click();
    await expect
      .element(page.getByRole('menuitem', { name: /Move before previous stop/ }))
      .toHaveAttribute('aria-disabled', 'true');
  });

  test('removes the stop after confirmation', async () => {
    const { actions, result } = renderStop(porto);
    await result;
    await page.getByRole('button', { name: 'Reorder or remove Porto' }).click();
    await page.getByRole('menuitem', { name: 'Remove stop' }).click();
    await vi.waitFor(() => expect(actions.removeDestination).toHaveBeenCalledWith('porto'));
    expect(confirm.mock.calls[0][0]).toBe('Remove Porto?');
  });

  test('keeps the stop when removal is declined', async () => {
    confirm.mockResolvedValue(false);
    const { actions, result } = renderStop(porto);
    await result;
    await page.getByRole('button', { name: 'Reorder or remove Porto' }).click();
    await page.getByRole('menuitem', { name: 'Remove stop' }).click();
    await vi.waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(actions.removeDestination).not.toHaveBeenCalled();
  });
});
