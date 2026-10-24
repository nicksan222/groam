import {
  arrange,
  by,
  currentPath,
  ids,
  openTrip,
  openTripSection,
  uniqueSuffix
} from '@groam/app-actions/vitest';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { openApp } from '@/journeys/open-app';

test('reads the plan on its own Calendar section, apart from the days', async () => {
  const suffix = uniqueSuffix();
  const tripId = await arrange.createTrip({ durationDays: 4, name: `Calendar trip ${suffix}` });
  await openApp();
  await openTrip(tripId);

  await openTripSection('plan');
  expect(document.querySelector('[data-plan-calendar]')).toBeNull();

  await openTripSection('calendar');
  expect(currentPath()).toMatch(/\/trips\/[a-z]{6}\/calendar$/u);
  const calendar = by(ids.tripCalendarPage);
  // An undated trip reads by trip day, never with made-up dates.
  await expect.element(calendar.getByText('Day 1 – Day 4')).toBeVisible();
  await expect.element(calendar.getByText('Day 4', { exact: true })).toBeVisible();
  await expect.element(page.getByRole('textbox', { name: 'Event title' })).not.toBeInTheDocument();

  await openTripSection('plan');
  await expect.element(by(ids.tripPlanPage)).toBeVisible();
  await expect.element(calendar).not.toBeInTheDocument();
});
