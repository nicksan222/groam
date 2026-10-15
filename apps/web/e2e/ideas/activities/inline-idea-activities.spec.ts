import {
  addInlineActivity,
  addStop,
  editInlineActivity,
  ids,
  mockDestinationSearch,
  openIdea,
  openItinerary,
  saveSevenDayRange,
  uniqueSuffix
} from '@groam/app-actions/playwright';
import { expect, test } from '@groam/app-actions/playwright/test';

test('plans morning and afternoon activities directly within an idea day', async ({
  arrange,
  page
}) => {
  test.setTimeout(150_000);
  await mockDestinationSearch(page);
  const suffix = uniqueSuffix();
  const tripId = await arrange.createTrip({ name: `Inline itinerary ${suffix}` });
  const { proposalId } = await arrange.startIdea({ name: `Plan this day ${suffix}`, tripId });
  await openIdea(page, { proposalId, tripId });
  await saveSevenDayRange(page);
  await openItinerary(page);
  await addStop(page, { name: 'Lisbon', notes: 'Explore the city', startDay: '1', endDay: '3' });

  const day = page.getByRole('region', { name: 'Day 2 schedule' });
  await expect(day.getByRole('button', { name: 'Add to day' })).toBeVisible();
  await addInlineActivity(page, {
    day: 2,
    notes: 'Meet beside the bakery',
    period: 'morning',
    title: 'Market breakfast'
  });
  await addInlineActivity(page, { day: 2, period: 'afternoon', title: 'Riverside stroll' });

  // The day schedule lists the morning plan before the afternoon plan.
  const plans = day.getByRole('button', { name: /^Edit (?:Market breakfast|Riverside stroll)$/u });
  await expect(plans).toHaveCount(2);
  await expect(plans.first()).toHaveAccessibleName('Edit Market breakfast');
  await expect(plans.last()).toHaveAccessibleName('Edit Riverside stroll');
  await editInlineActivity(page, {
    address: 'Ribeira das Naus, Lisbon',
    day: 2,
    period: 'afternoon',
    title: 'Riverside stroll'
  });
  await expect(day.getByRole('button', { name: 'Edit Riverside stroll' })).toBeVisible();
  await expect(page.getByTestId(ids.activityInlineEditor)).toHaveCount(0);
});

test('switching a shared day’s destination keeps the inline activity draft', async ({
  arrange,
  page
}) => {
  test.setTimeout(150_000);
  await mockDestinationSearch(page);
  const suffix = uniqueSuffix();
  const tripId = await arrange.createTrip({ name: `Shared day ${suffix}` });
  const { proposalId } = await arrange.startIdea({ name: `Two places ${suffix}`, tripId });
  await openIdea(page, { proposalId, tripId });
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
  const sharedDay = page.getByRole('region', { name: 'Day 2 schedule' });
  // The saved plan's row names the destination chosen in the inline draft.
  await expect(
    sharedDay
      .locator('[data-slot="timeline-item"]')
      .filter({ has: page.getByRole('button', { name: 'Edit Riverside picnic' }) })
  ).toContainText('Porto');
});

test('mobile day planning keeps the inline activity form in the schedule', async ({
  arrange,
  page
}) => {
  test.setTimeout(120_000);
  await mockDestinationSearch(page);
  const suffix = uniqueSuffix();
  const tripId = await arrange.createTrip({ name: `Mobile day plan ${suffix}` });
  const { proposalId } = await arrange.startIdea({ name: `Mobile activities ${suffix}`, tripId });
  await openIdea(page, { proposalId, tripId });
  await saveSevenDayRange(page);
  await openItinerary(page);
  await addStop(page, { name: 'Porto', notes: 'River', startDay: '2', endDay: '3' });
  await page.setViewportSize({ width: 390, height: 844 });

  const day = page.getByRole('region', { name: 'Day 2 schedule' });
  await expect(day.getByRole('button', { name: 'Add to day' })).toBeVisible();
  await addInlineActivity(page, { day: 2, period: 'morning', title: 'Morning market' });
  await expect(day.getByRole('button', { name: 'Edit Morning market' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
