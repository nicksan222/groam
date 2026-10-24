import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { Stay } from '@/types/trips';
import { PlannerStayCard } from './planner-stay-card';

function makeStay(overrides: Partial<Stay> = {}): Stay {
  return {
    address: null,
    attachments: [],
    checkInDay: 1,
    checkInTime: null,
    checkOutDay: 3,
    checkOutTime: null,
    costAmount: null,
    costSplit: 'total',
    id: 'stay-1',
    notes: null,
    position: 0,
    sourceId: null,
    title: 'Casa do Pátio',
    ...overrides
  } as unknown as Stay;
}

describe('PlannerStayCard', () => {
  test('shows the minimal stay', async () => {
    await render(<PlannerStayCard currency="USD" destinationName="Lisbon" stay={makeStay()} />);
    await expect.element(page.getByText('Casa do Pátio')).toBeVisible();
    await expect.element(page.getByText('Staying overnight', { exact: true })).toBeVisible();
    await expect.element(page.getByText('Check in: Day 1', { exact: true })).toBeVisible();
    await expect.element(page.getByText('Check out: Day 3', { exact: true })).toBeVisible();
  });

  test('shows times, address, notes and cost', async () => {
    await render(
      <PlannerStayCard
        currency="USD"
        destinationName="Lisbon"
        stay={makeStay({
          address: 'Alfama, Lisbon',
          checkInTime: '15:00',
          checkOutTime: '08:00',
          costAmount: 120,
          costSplit: 'per_person',
          notes: 'Bags at reception'
        })}
      />
    );
    await expect.element(page.getByText('Check in: Day 1 · 15:00')).toBeVisible();
    await expect.element(page.getByText('Check out: Day 3 · 08:00')).toBeVisible();
    await expect.element(page.getByText('Alfama, Lisbon')).toBeVisible();
    await expect.element(page.getByText('Bags at reception')).toBeVisible();
    await expect.element(page.getByText(/120.*\/ person/)).toBeVisible();
  });

  test('links attachments that have a url and plain-labels those without', async () => {
    await render(
      <PlannerStayCard
        currency="USD"
        destinationName="Lisbon"
        stay={makeStay({
          attachments: [
            { id: 'a1', name: 'Booking.pdf', url: 'https://example.com/booking.pdf' },
            { id: 'a2', name: 'Pending.pdf', url: null }
          ] as never
        })}
      />
    );
    await expect
      .element(page.getByRole('link', { name: 'Booking.pdf' }))
      .toHaveAttribute('href', 'https://example.com/booking.pdf');
    await expect.element(page.getByText('Pending.pdf')).toBeVisible();
    await expect.element(page.getByRole('link', { name: 'Pending.pdf' })).not.toBeInTheDocument();
  });
});
