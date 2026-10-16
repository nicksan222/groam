import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { EditorDayCardProps } from '@/types/itinerary-editor';
import type { PlannerEntry } from '@/types/trip-planner';
import { EditorDayCard } from './editor-day-card';

vi.mock('./editor-route-stop', () => ({
  EditorRouteStop: (props: { destination: { name: string } }) => (
    <p>route stop {props.destination.name}</p>
  )
}));
vi.mock('./editor-inline-details', () => ({
  EditorInlineDetails: () => <p>inline details</p>
}));

const lisbon = {
  activities: [],
  coverUrl: null,
  endDay: 2,
  id: 'lisbon',
  name: 'Lisbon',
  startDay: 1,
  stays: []
};

function makeEntry(): PlannerEntry {
  return {
    activity: {
      address: null,
      attachments: [],
      costAmount: null,
      costSplit: 'per_person',
      id: 'museum',
      notes: null,
      sourceId: null,
      title: 'Tile museum'
    },
    endDay: 1,
    endTime: null,
    key: 'activity-museum',
    kind: 'activity',
    location: 'Lisbon',
    period: 'morning',
    startDay: 1,
    startTime: null,
    title: 'Tile museum'
  } as unknown as PlannerEntry;
}

function renderCard({
  day = {},
  destinations = [lisbon],
  ...overrides
}: {
  day?: Record<string, unknown>;
  destinations?: unknown[];
} & Partial<Omit<EditorDayCardProps, 'day'>> = {}) {
  const props = {
    day: { day: 1, destinations: destinations, entries: [makeEntry()], stays: [], ...day },
    detail: null,
    onAdd: vi.fn(),
    onAddDestination: vi.fn(),
    onEdit: vi.fn(),
    props: { trip: { currency: 'EUR', destinations, startDate: '2027-03-01' } },
    selection: null,
    setDetail: vi.fn(),
    setSelection: vi.fn(),
    setUploading: vi.fn(),
    uploading: false,
    ...overrides
  } as unknown as EditorDayCardProps;
  return { props, result: render(<EditorDayCard {...props} />) };
}

describe('header', () => {
  test('shows the day, its date and its places', async () => {
    await renderCard().result;
    const card = page.getByRole('region', { name: 'Day 1 schedule' });
    await expect.element(card.getByRole('heading', { name: /Day 1/ })).toBeVisible();
    await expect
      .element(card.getByRole('button', { name: 'Manage Lisbon for Day 1' }))
      .toBeVisible();
  });

  test('opens the route stop for a place', async () => {
    const { props, result } = renderCard();
    await result;
    await page.getByRole('button', { name: 'Manage Lisbon for Day 1' }).click();
    expect(props.setSelection).toHaveBeenCalledWith(null);
    expect(props.setDetail).toHaveBeenCalledWith({
      day: 1,
      destinationId: 'lisbon',
      kind: 'route'
    });
  });
});

describe('body', () => {
  test('lists the day plan with an add menu', async () => {
    await renderCard().result;
    await expect.element(page.getByRole('button', { name: 'Edit Tile museum' })).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Add to day' })).toBeVisible();
  });

  test('forwards add and edit with the day number', async () => {
    const { props, result } = renderCard();
    await result;
    await page.getByRole('button', { name: 'Edit Tile museum' }).click();
    expect(props.onEdit).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'activity-museum' }),
      1
    );
    await page.getByRole('button', { name: 'Add to day' }).click();
    await page.getByRole('menuitem', { name: 'Stay' }).click();
    expect(props.onAdd).toHaveBeenCalledWith('stay', 1);
  });

  test('shows the route stop editor for a route detail on this day', async () => {
    await renderCard({ detail: { day: 1, destinationId: 'lisbon', kind: 'route' } as never })
      .result;
    await expect.element(page.getByText('route stop Lisbon')).toBeVisible();
    await expect.element(page.getByText('inline details')).not.toBeInTheDocument();
  });

  test('ignores a route detail from another day', async () => {
    await renderCard({ detail: { day: 3, destinationId: 'lisbon', kind: 'route' } as never })
      .result;
    await expect.element(page.getByText('route stop Lisbon')).not.toBeInTheDocument();
  });

  test.each([
    [
      'an activity selection',
      { selection: { day: 1, destinationId: 'lisbon', period: 'morning' } }
    ],
    ['a stay detail', { detail: { day: 1, destinationId: 'lisbon', kind: 'stay' } }]
  ])('shows inline details for %s', async (_, overrides) => {
    await renderCard(overrides as never).result;
    await expect.element(page.getByText('inline details')).toBeVisible();
  });

  test('locks adding while an upload is running', async () => {
    await renderCard({ uploading: true }).result;
    await expect.element(page.getByRole('button', { name: 'Add to day' })).toBeDisabled();
  });
});

describe('without destinations', () => {
  test('invites adding the first destination on day one', async () => {
    const { props, result } = renderCard({ day: { entries: [] }, destinations: [] });
    await result;
    await expect.element(page.getByText('A place to start. A day to fill.')).toBeVisible();
    await page.getByRole('button', { name: 'Add first destination' }).click();
    expect(props.onAddDestination).toHaveBeenCalledTimes(1);
  });

  test('stays empty on later days', async () => {
    await renderCard({ day: { day: 2, entries: [] }, destinations: [] }).result;
    await expect
      .element(page.getByText('A place to start. A day to fill.'))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByText('Add a destination to start planning this day.'))
      .toBeVisible();
  });
});
