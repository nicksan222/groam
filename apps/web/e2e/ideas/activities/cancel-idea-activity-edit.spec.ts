import {
  addActivity,
  addStop,
  discardActivityChanges,
  ids,
  inlineActivityEditor,
  keepActivityPlan,
  mockDestinationSearch,
  openActivityPlan,
  openIdea,
  openIdeaFromList,
  openIdeaItinerary,
  openItinerary,
  saveSevenDayRange,
  uniqueSuffix
} from '@groam/app-actions/playwright';
import { expect, test } from '@groam/app-actions/playwright/test';

test('cancelling edits or removal leaves the saved idea activity intact', async ({
  arrange,
  page
}) => {
  test.setTimeout(120_000);
  await mockDestinationSearch(page);
  const suffix = uniqueSuffix();
  const tripId = await arrange.createTrip({ name: `Cancel edits ${suffix}` });
  const ideaName = `Keep the plan ${suffix}`;
  const { proposalId } = await arrange.startIdea({ name: ideaName, tripId });
  await openIdea(page, { proposalId, tripId });
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
  await expect(inlineActivityEditor(page).getByTestId(ids.activityAddress)).toHaveValue(
    'Original meeting point'
  );
});
