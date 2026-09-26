import {
  addActivity,
  addIdea,
  addStop,
  continueActivityPlan,
  createIssue,
  createTrip,
  editActivity,
  ids,
  mockDestinationSearch,
  openActivityPlan,
  openIdeaComparison,
  openIdeaFromList,
  openIdeaItinerary,
  openItinerary,
  openSharedTrip,
  openTripSection,
  removeActivityPlan,
  requestIdeaReview,
  returnIdeaToEditing,
  saveSevenDayRange,
  signIn,
  startActivityPlan,
  startIdeaFromIssue,
  uniqueSuffix
} from '@groam/app-actions/playwright';
import { expect, test } from '@playwright/test';

test('adds, edits and removes activities on a later-day idea from both entry points', async ({
  page
}) => {
  test.setTimeout(120_000);
  await mockDestinationSearch(page);
  await signIn(page);
  const suffix = uniqueSuffix();
  const ideaName = `Later-day activities ${suffix}`;
  await createTrip(page, { name: `Later-day trip ${suffix}` });
  await addIdea(page, { name: ideaName });
  await saveSevenDayRange(page);
  await openItinerary(page);
  await addStop(page, { name: 'Porto', notes: 'River walk', startDay: '4', endDay: '5' });

  // The chooser must start on Day 4, not on an empty Day 1 with Continue disabled.
  await startActivityPlan(page);
  const chooser = page.getByRole('dialog');
  await expect(chooser.getByRole('combobox', { name: 'Day', exact: true })).toContainText('Day 4');
  await expect(chooser.getByRole('button', { name: 'Continue' })).toBeEnabled();
  await continueActivityPlan(page, 'Porto river walk');
  await expect(chooser).toBeHidden();
  await expect(page.getByRole('button', { name: 'Edit Porto river walk' })).toBeVisible();

  await openIdeaFromList(page, ideaName);
  await openIdeaItinerary(page);
  await editActivity(page, { title: 'Porto river walk', address: 'Ribeira, Porto' });
  await openActivityPlan(page, 'Porto river walk');
  await expect(page.getByRole('dialog').getByTestId(ids.activityAddress)).toHaveValue(
    'Ribeira, Porto'
  );
  await removeActivityPlan(page, 'Porto river walk');
  await expect(page.getByRole('button', { name: 'Edit Porto river walk' })).toHaveCount(0);

  await addActivity(page, { destination: 'Porto, Portugal', title: 'Evening cruise' });
  await expect(page.getByRole('button', { name: 'Edit Evening cruise' })).toBeVisible();
});

test('switches destination and day, returns from comparison, and submits activity changes for review', async ({
  page
}) => {
  test.setTimeout(150_000);
  await mockDestinationSearch(page);
  await signIn(page);
  const suffix = uniqueSuffix();
  const ideaName = `Review activity ${suffix}`;
  await createTrip(page, { name: `Review itinerary ${suffix}` });
  await addIdea(page, { name: ideaName });
  await saveSevenDayRange(page);
  await openItinerary(page);
  await addStop(page, { name: 'Lisbon', notes: 'Old town', startDay: '1', endDay: '3' });
  await addStop(page, { name: 'Porto', notes: 'River', startDay: '4', endDay: '5' });

  await startActivityPlan(page, 5);
  const chooser = page.getByRole('dialog');
  await expect(chooser.getByRole('combobox', { name: 'Destination' })).toContainText('Porto');
  await continueActivityPlan(page, 'Cruise on the Douro');
  await expect(page.getByRole('region', { name: 'Day 5 schedule' })).toContainText(
    'Cruise on the Douro'
  );

  await openIdeaComparison(page);
  await expect(page.getByTestId(ids.compareSharedTrip)).toContainText('Cruise on the Douro');
  await returnIdeaToEditing(page);
  await editActivity(page, { title: 'Cruise on the Douro', address: 'Cais da Ribeira' });
  await openIdeaFromList(page, ideaName);
  await openIdeaComparison(page);
  await requestIdeaReview(page);
  // Authors may still amend their working copy during review.
  await openIdeaFromList(page, ideaName);
  await expect(page.getByTestId(ids.ideaPrimaryAction)).toHaveText('Approve');
  await openIdeaItinerary(page);
  await editActivity(page, { title: 'Cruise on the Douro', address: 'Cais da Ribeira 42' });
  await openIdeaFromList(page, ideaName);
  await openIdeaItinerary(page);
  await openActivityPlan(page, 'Cruise on the Douro');
  await expect(page.getByRole('dialog').getByTestId(ids.activityAddress)).toHaveValue(
    'Cais da Ribeira 42'
  );
});

test('adds an activity to an issue-linked idea without changing the shared trip', async ({
  page
}) => {
  test.setTimeout(120_000);
  await mockDestinationSearch(page);
  await signIn(page);
  const suffix = uniqueSuffix();
  const tripId = await createTrip(page, { name: `Issue itinerary ${suffix}` });
  await createIssue(page, {
    title: `Plan a walk ${suffix}`,
    body: 'Add a day out to the trip',
    tripId
  });
  const ideaName = await startIdeaFromIssue(page);
  await saveSevenDayRange(page);
  await openIdeaItinerary(page);
  await addStop(page, { name: 'Lisbon', notes: 'Walk', startDay: '1', endDay: '3' });
  await addActivity(page, { destination: 'Lisbon, Portugal', title: 'Walk through Alfama' });
  await openSharedTrip(page);
  await openTripSection(page, 'itinerary');
  await expect(page.getByText('Walk through Alfama')).toHaveCount(0);
  await openTripSection(page, 'ideas');
  await openIdeaFromList(page, ideaName);
  await openIdeaItinerary(page);
  await expect(page.getByRole('button', { name: 'Edit Walk through Alfama' })).toBeVisible();
});
