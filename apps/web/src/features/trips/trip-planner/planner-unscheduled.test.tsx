import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripPlanner } from '@/types/trip-planner';
import { PlannerUnscheduled } from './planner-unscheduled';

const flag = {
  label: 'Train · Lisbon → Porto',
  subject: { id: 'transfer-1', type: 'destination_transfer' },
  topic: 'the train to Porto'
};

const planner = {
  days: [],
  entries: [],
  unscheduledDestinations: [],
  unscheduledTravel: [
    {
      endDay: null,
      endTime: null,
      flag,
      key: 'travel-transfer-1',
      kind: 'travel',
      location: 'Travel',
      period: 'full_day',
      startDay: null,
      startTime: null,
      title: 'Train · Lisbon → Porto',
      transfer: {
        attachments: [],
        costAmount: null,
        durationMinutes: null,
        mode: 'train',
        notes: null
      }
    }
  ]
} as unknown as TripPlanner;

test('flags travel that has no day yet', async () => {
  const onFlag = vi.fn();
  await render(<PlannerUnscheduled currency="USD" onFlag={onFlag} planner={planner} />);
  await page.getByRole('button', { name: 'Flag Train · Lisbon → Porto' }).click();
  expect(onFlag).toHaveBeenCalledWith(flag);
});

test('offers no Flag without a handler', async () => {
  await render(<PlannerUnscheduled currency="USD" planner={planner} />);
  await expect.element(page.getByText('Train · Lisbon → Porto')).toBeVisible();
  await expect.element(page.getByRole('button', { name: /^Flag/u })).not.toBeInTheDocument();
});
