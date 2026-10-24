import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { PlannerPeriod } from '@/types/trip-planner';
import { PlannerPeriodHeading } from './planner-period-heading';

describe('PlannerPeriodHeading', () => {
  test.each<[PlannerPeriod, string]>([
    ['full_day', 'Flexible & all day'],
    ['morning', 'Morning'],
    ['afternoon', 'Afternoon'],
    ['evening', 'Evening']
  ])('renders the %s heading', async (period, label) => {
    await render(<PlannerPeriodHeading label={label} period={period} />);
    await expect.element(page.getByRole('heading', { level: 4, name: label })).toBeVisible();
  });
});
