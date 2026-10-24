import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { PlannerEntry } from '@/types/trip-planner';
import { PlannerEntryCard } from './planner-entry-card';

const base = {
  endDay: 1,
  endTime: '12:00',
  key: 'k',
  location: 'Lisbon',
  period: 'morning',
  startDay: 1,
  startTime: '10:00',
  title: 'Tile museum'
} as const;

function makeActivity(
  overrides: Record<string, unknown> = {},
  entry: Record<string, unknown> = {}
): PlannerEntry {
  return {
    ...base,
    activity: {
      address: null,
      attachments: [],
      costAmount: null,
      costSplit: 'total',
      id: 'act-1',
      notes: null,
      ...overrides
    },
    kind: 'activity',
    ...entry
  } as unknown as PlannerEntry;
}

function makeTravel(durationMinutes: number | null): PlannerEntry {
  return {
    ...base,
    kind: 'travel',
    location: 'Travel',
    title: 'Train · Lisbon → Porto',
    transfer: { attachments: [], costAmount: null, durationMinutes, mode: 'train', notes: null }
  } as unknown as PlannerEntry;
}

function makeStay(): PlannerEntry {
  return {
    ...base,
    endTime: null,
    event: 'check_in',
    kind: 'stay',
    period: 'full_day',
    stay: { address: 'Alfama', attachments: [], costAmount: null, notes: null },
    title: 'Check in · Casa'
  } as unknown as PlannerEntry;
}

describe('PlannerEntryCard', () => {
  test('shows an activity with time range, location and no details block', async () => {
    await render(<PlannerEntryCard currency="USD" day={1} entry={makeActivity()} />);
    await expect.element(page.getByText('Tile museum')).toBeVisible();
    await expect.element(page.getByText('10:00–12:00')).toBeVisible();
    await expect.element(page.getByText('Lisbon', { exact: true })).toBeVisible();
    await expect.element(page.getByRole('link')).not.toBeInTheDocument();
  });

  test('flags a missing end time', async () => {
    await render(
      <PlannerEntryCard currency="USD" day={1} entry={makeActivity({}, { endTime: null })} />
    );
    await expect.element(page.getByText('End time open')).toBeVisible();
  });

  test('uses the time label override and renders the action', async () => {
    await render(
      <PlannerEntryCard
        action={<button type="button">Edit entry</button>}
        currency="USD"
        day={1}
        entry={makeActivity()}
        timeLabel="Overnight"
      />
    );
    await expect.element(page.getByText('Overnight')).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Edit entry' })).toBeVisible();
    await expect.element(page.getByText('10:00–12:00')).not.toBeInTheDocument();
  });

  test('shows a multi-day span', async () => {
    await render(
      <PlannerEntryCard
        currency="USD"
        day={1}
        entry={makeActivity({}, { endDay: 3, endTime: '09:30' })}
      />
    );
    await expect.element(page.getByText('Day 1 → Day 3 · ends 09:30')).toBeVisible();
    await expect.element(page.getByText('10:00 →')).toBeVisible();
  });

  test('shows activity details: address link, notes, cost and attachments', async () => {
    await render(
      <PlannerEntryCard
        currency="USD"
        day={1}
        entry={makeActivity({
          address: 'Rua 1, Lisbon',
          attachments: [
            { id: 'a1', name: 'Ticket.pdf', url: 'https://example.com/t.pdf' },
            { id: 'a2', name: 'Offline.pdf', url: null }
          ],
          costAmount: 8,
          costSplit: 'per_person',
          notes: 'Courtyard café'
        })}
      />
    );
    await expect
      .element(page.getByRole('link', { name: 'Rua 1, Lisbon' }))
      .toHaveAttribute(
        'href',
        'https://www.google.com/maps/search/?api=1&query=Rua%201%2C%20Lisbon'
      );
    await expect.element(page.getByText('Courtyard café')).toBeVisible();
    await expect.element(page.getByText(/8.*\/ person/)).toBeVisible();
    await expect
      .element(page.getByRole('link', { name: 'Ticket.pdf' }))
      .toHaveAttribute('href', 'https://example.com/t.pdf');
    await expect.element(page.getByText('Offline.pdf')).toBeVisible();
  });

  test.each([
    [45, '45 min'],
    [120, '2 hr'],
    [135, '2 hr 15 min']
  ])('shows %i minute travel duration', async (minutes, label) => {
    await render(<PlannerEntryCard currency="USD" day={1} entry={makeTravel(minutes)} />);
    await expect.element(page.getByText(label, { exact: true })).toBeVisible();
  });

  test('travel without a duration shows only its kind', async () => {
    await render(<PlannerEntryCard currency="USD" day={1} entry={makeTravel(null)} />);
    await expect.element(page.getByText('Travel', { exact: true })).toBeVisible();
    await expect.element(page.getByText(/\d+ (min|hr)/)).not.toBeInTheDocument();
  });

  test('stay entries show the stay address and no end-time hint', async () => {
    await render(<PlannerEntryCard currency="USD" day={1} entry={makeStay()} />);
    await expect.element(page.getByText('Check in · Casa')).toBeVisible();
    await expect.element(page.getByRole('link', { name: 'Alfama' })).toBeVisible();
    await expect.element(page.getByText('End time open')).not.toBeInTheDocument();
  });
});
