import {
  addActivity,
  addIdea,
  addStop,
  createTrip,
  discardActivityChanges,
  ids,
  keepActivityPlan,
  mockDestinationSearch,
  openActivityPlan,
  openIdeaFromList,
  openIdeaItinerary,
  openItinerary,
  saveSevenDayRange,
  signIn,
  uniqueSuffix
} from '@groam/app-actions/playwright';
import { expect, test } from '@playwright/test';

test('cancelling edits or removal leaves the saved idea activity intact', async ({ page }) => {
  test.setTimeout(120_000);
  await mockDestinationSearch(page);
  await signIn(page);
  const suffix = uniqueSuffix();
  await createTrip(page, { name: `Cancel edits ${suffix}` });
  const ideaName = `Keep the plan ${suffix}`;
  await addIdea(page, { name: ideaName });
  await saveSevenDayRange(page);
  await openItinerary(page);
  await addStop(page, { name: 'Porto', notes: 'Riverside', startDay: '1', endDay: '3' });
  await addActivity(page, {
    destination: 'Porto, Portugal',
    address: 'Original meeting point',
    title: 'Boat trip'
  });

  await discardActivityChanges(page, 'Boat trip', 'Unsaved meeting point');
  await keepActivityPlan(page, 'Boat trip');
  await openIdeaFromList(page, ideaName);
  await openIdeaItinerary(page);
  await openActivityPlan(page, 'Boat trip');
  await expect(page.getByRole('dialog').getByTestId(ids.activityAddress)).toHaveValue(
    'Original meeting point'
  );
});
