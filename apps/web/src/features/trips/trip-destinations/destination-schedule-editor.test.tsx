import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { DestinationScheduleEditor } from './destination-schedule-editor';
import type { Destination } from './destination-types';

const id = (value: string) => value as Id<'tripDestinations'>;

function makeDestination(overrides: Partial<Destination> = {}): Destination {
  return {
    activities: [],
    coverStatus: null,
    coverUrl: null,
    dayNotes: null,
    endDay: null,
    id: id('lisbon'),
    latitude: 38.72,
    longitude: -9.14,
    name: 'Lisbon',
    placeId: 'place-lisbon',
    position: 0,
    sourceId: null,
    startDay: null,
    stays: [],
    transferToNext: null,
    ...overrides
  } as Destination;
}

function renderEditor(props: Partial<Parameters<typeof DestinationScheduleEditor>[0]> = {}) {
  const updateDestination = vi.fn().mockResolvedValue(true);
  const destination = props.destination ?? makeDestination();
  return {
    updateDestination,
    ready: render(
      <DestinationScheduleEditor
        canManage
        destination={destination}
        destinations={[destination]}
        maximumDay={5}
        minimumDay={1}
        startDate={null}
        tripDayCount={5}
        updateDestination={updateDestination}
        {...props}
      />
    )
  };
}

const summary = () => page.getByLabelText('Schedule & notes for Lisbon');

describe('DestinationScheduleEditor', () => {
  test.each([
    ['without notes', null, false],
    ['with notes', 'Arrive late', true]
  ])('shows read-only viewers the stop %s', async (_, dayNotes, visible) => {
    await renderEditor({ canManage: false, destination: makeDestination({ dayNotes }) }).ready;
    await expect.element(summary()).not.toBeInTheDocument();
    const notes = page.getByText('Arrive late');
    if (visible) await expect.element(notes).toBeVisible();
    else await expect.element(notes).not.toBeInTheDocument();
  });

  test('previews saved notes in the summary for managers', async () => {
    await renderEditor({ destination: makeDestination({ dayNotes: 'Arrive late' }) }).ready;
    await expect.element(summary()).toBeVisible();
    await expect.element(page.getByText('Arrive late')).toBeInTheDocument();
  });

  test('starts saved and unchanged', async () => {
    await renderEditor().ready;
    await summary().click();
    await expect.element(page.getByRole('button', { name: 'Saved' })).toBeDisabled();
    await expect.element(page.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  test('saves edited notes', async () => {
    const { updateDestination, ready } = renderEditor();
    await ready;
    await summary().click();
    await page.getByPlaceholder('Arrival, reservations, neighborhood…').fill('  Book dinner  ');
    await page.getByRole('button', { name: 'Save schedule' }).click();
    await expect.poll(() => updateDestination.mock.calls.length).toBe(1);
    expect(updateDestination).toHaveBeenCalledWith(id('lisbon'), { dayNotes: 'Book dinner' });
  });

  test('saves a chosen day range with the notes', async () => {
    const { updateDestination, ready } = renderEditor();
    await ready;
    await summary().click();
    await page.getByRole('button', { name: 'Day 2' }).click();
    await page.getByRole('button', { name: /Day 4/u }).click();
    await page.getByRole('button', { name: 'Save schedule' }).click();
    await expect.poll(() => updateDestination.mock.calls.length).toBe(1);
    expect(updateDestination).toHaveBeenCalledWith(id('lisbon'), {
      dayNotes: undefined,
      endDay: 4,
      startDay: 2
    });
  });

  test('cancel restores the saved values', async () => {
    await renderEditor({ destination: makeDestination({ dayNotes: 'Original' }) }).ready;
    await summary().click();
    const input = page.getByPlaceholder('Arrival, reservations, neighborhood…');
    await input.fill('Changed');
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect.element(input).toHaveValue('Original');
    await expect.element(page.getByRole('button', { name: 'Saved' })).toBeDisabled();
  });

  test('blocks saving a half-chosen day range', async () => {
    await renderEditor().ready;
    await summary().click();
    await page.getByRole('button', { name: 'Day 2' }).click();
    await expect.element(page.getByRole('button', { name: 'Save schedule' })).toBeDisabled();
  });

  test('hides the day picker when the trip has no day count', async () => {
    await renderEditor({ tripDayCount: null }).ready;
    await summary().click();
    await expect
      .element(page.getByRole('group', { name: 'Lisbon day range' }))
      .not.toBeInTheDocument();
  });
});
