import {
  addActivity,
  addStop,
  continueActivityPlan,
  editActivity,
  ids,
  inlineActivityEditor,
  mockDestinationSearch,
  openActivityPlan,
  openIdeaComparison,
  openIdea,
  openIdeaFromList,
  openIdeaItinerary,
  openIssue,
  openItinerary,
  openSharedTrip,
  openTripSection,
  removeActivityPlan,
  requestIdeaReview,
  returnIdeaToEditing,
  saveSevenDayRange,
  startActivityPlan,
  startIdeaFromIssue,
  uniqueSuffix
} from '@groam/app-actions/playwright';
import { expect, test } from '@groam/app-actions/playwright/test';

test('adds, edits and removes activities on a later-day idea from both entry points', async ({
  arrange,
  page
}) => {
  test.setTimeout(120_000);
  await mockDestinationSearch(page);
  const suffix = uniqueSuffix();
  const ideaName = `Later-day activities ${suffix}`;
  const tripId = await arrange.createTrip({ name: `Later-day trip ${suffix}` });
  const { proposalId } = await arrange.startIdea({ name: ideaName, tripId });
  await openIdea(page, { proposalId, tripId });
  await saveSevenDayRange(page);
  await openItinerary(page);
  await addStop(page, { name: 'Porto', notes: 'River walk', startDay: '4', endDay: '5' });

  // Days 1–3 have no destination yet, so planning starts on Day 4.
  await startActivityPlan(page);
  const editor = inlineActivityEditor(page);
  await expect(editor).toHaveAttribute('aria-label', 'Add an activity to Day 4');
  await continueActivityPlan(page, 'Porto river walk');
  await expect(editor).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Edit Porto river walk' })).toBeVisible();

  await openIdeaFromList(page, ideaName);
  await openIdeaItinerary(page);
  await editActivity(page, { title: 'Porto river walk', address: 'Ribeira, Porto' });
  await openActivityPlan(page, 'Porto river walk');
  await expect(inlineActivityEditor(page).getByTestId(ids.activityAddress)).toHaveValue(
    'Ribeira, Porto'
  );
  await removeActivityPlan(page, 'Porto river walk');
  await expect(page.getByRole('button', { name: 'Edit Porto river walk' })).toHaveCount(0);

  await addActivity(page, { destination: 'Porto, Portugal', title: 'Evening cruise' });
  await expect(page.getByRole('button', { name: 'Edit Evening cruise' })).toBeVisible();
});

test('switches destination and day, returns from comparison, and submits activity changes for review', async ({
  arrange,
  page
}) => {
  test.setTimeout(150_000);
  await mockDestinationSearch(page);
  const suffix = uniqueSuffix();
  const ideaName = `Review activity ${suffix}`;
  const tripId = await arrange.createTrip({ name: `Review itinerary ${suffix}` });
  const { proposalId } = await arrange.startIdea({ name: ideaName, tripId });
  await openIdea(page, { proposalId, tripId });
  await saveSevenDayRange(page);
  await openItinerary(page);
  await addStop(page, { name: 'Lisbon', notes: 'Old town', startDay: '1', endDay: '3' });
  await addStop(page, { name: 'Porto', notes: 'River', startDay: '4', endDay: '5' });

  await startActivityPlan(page, 5);
  await expect(inlineActivityEditor(page)).toContainText('Day 5 · Porto, Portugal');
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
  await expect(inlineActivityEditor(page).getByTestId(ids.activityAddress)).toHaveValue(
    'Cais da Ribeira 42'
  );
});

test('adds an activity to an issue-linked idea without changing the shared trip', async ({
  arrange,
  page
}) => {
  test.setTimeout(120_000);
  await mockDestinationSearch(page);
  const suffix = uniqueSuffix();
  const tripId = await arrange.createTrip({ name: `Issue itinerary ${suffix}` });
  await openIssue(
    page,
    await arrange.createIssue({
      title: `Plan a walk ${suffix}`,
      body: 'Add a day out to the trip',
      tripId
    })
  );
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
