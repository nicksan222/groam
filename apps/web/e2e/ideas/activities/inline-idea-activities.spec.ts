import {
  addIdea,
  addInlineActivity,
  addStop,
  createTrip,
  editInlineActivity,
  ids,
  mockDestinationSearch,
  openItinerary,
  saveSevenDayRange,
  signIn,
  uniqueSuffix
} from '@groam/app-actions/playwright';
import { expect, test } from '@playwright/test';

test('plans morning and afternoon activities directly within an idea day', async ({ page }) => {
  test.setTimeout(150_000);
  await mockDestinationSearch(page);
  await signIn(page);
  const suffix = uniqueSuffix();
  await createTrip(page, { name: `Inline itinerary ${suffix}` });
  await addIdea(page, { name: `Plan this day ${suffix}` });
  await saveSevenDayRange(page);
  await openItinerary(page);
  await addStop(page, { name: 'Lisbon', notes: 'Explore the city', startDay: '1', endDay: '3' });

  const day = page.getByRole('region', { name: 'Day 2 schedule' });
  await expect(day.getByRole('button', { name: 'Add morning activity to Day 2' })).toBeVisible();
  await expect(day.getByRole('button', { name: 'Add afternoon activity to Day 2' })).toBeVisible();
  await expect(day.getByRole('button', { name: 'Add evening activity to Day 2' })).toBeVisible();
  await addInlineActivity(page, {
    day: 2,
    notes: 'Meet beside the bakery',
    period: 'morning',
    title: 'Market breakfast'
  });
  await addInlineActivity(page, { day: 2, period: 'afternoon', title: 'Riverside stroll' });

  await expect(day.getByRole('region', { name: 'Morning, Day 2' })).toContainText(
    'Market breakfast'
  );
  await expect(day.getByRole('region', { name: 'Afternoon, Day 2' })).toContainText(
    'Riverside stroll'
  );
  await editInlineActivity(page, {
    address: 'Ribeira das Naus, Lisbon',
    day: 2,
    title: 'Riverside stroll'
  });
  await expect(day.getByRole('button', { name: 'Edit Riverside stroll' })).toBeVisible();
  await expect(page.getByTestId(ids.activityInlineEditor)).toHaveCount(0);
});

test('switching a shared day’s destination keeps the inline activity draft', async ({ page }) => {
  test.setTimeout(150_000);
  await mockDestinationSearch(page);
  await signIn(page);
  const suffix = uniqueSuffix();
  await createTrip(page, { name: `Shared day ${suffix}` });
  await addIdea(page, { name: `Two places ${suffix}` });
  await saveSevenDayRange(page);
  await openItinerary(page);
  await addStop(page, { name: 'Lisbon', notes: 'Old town', startDay: '1', endDay: '2' });
  await addStop(page, { name: 'Porto', notes: 'River', startDay: '2', endDay: '4' });

  await addInlineActivity(page, {
    day: 2,
    destination: 'Porto, Portugal',
    expectDayReset: true,
    notes: 'Meet by the old bridge',
    period: 'afternoon',
    range: { startDay: 1, endDay: 2 },
    title: 'Riverside picnic'
  });
  await expect(
    page.getByRole('region', { name: 'Day 2 schedule' }).getByRole('button', {
      name: 'Edit Riverside picnic'
    })
  ).toContainText('Porto');
});

test('mobile day planning keeps the inline activity form in the schedule', async ({ page }) => {
  test.setTimeout(120_000);
  await mockDestinationSearch(page);
  await signIn(page);
  const suffix = uniqueSuffix();
  await createTrip(page, { name: `Mobile day plan ${suffix}` });
  await addIdea(page, { name: `Mobile activities ${suffix}` });
  await saveSevenDayRange(page);
  await openItinerary(page);
  await addStop(page, { name: 'Porto', notes: 'River', startDay: '2', endDay: '3' });
  await page.setViewportSize({ width: 390, height: 844 });

  const day = page.getByRole('region', { name: 'Day 2 schedule' });
  await expect(day.getByRole('button', { name: 'Add morning activity to Day 2' })).toBeVisible();
  await addInlineActivity(page, { day: 2, period: 'morning', title: 'Morning market' });
  await expect(day.getByRole('region', { name: 'Morning, Day 2' })).toContainText('Morning market');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
