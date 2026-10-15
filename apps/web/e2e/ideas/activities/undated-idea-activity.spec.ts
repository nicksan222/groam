import {
  addActivity,
  addFirstDestination,
  editActivity,
  mockDestinationSearch,
  openIdea,
  openIdeaFromList,
  openIdeaItinerary,
  openItinerary,
  uniqueSuffix
} from '@groam/app-actions/playwright';
import { expect, test } from '@groam/app-actions/playwright/test';

test('plans and revisits an activity before trip dates or destination days are set', async ({
  arrange,
  page
}) => {
  test.setTimeout(120_000);
  await mockDestinationSearch(page);
  const suffix = uniqueSuffix();
  const tripId = await arrange.createTrip({ name: `Flexible trip ${suffix}` });
  const ideaName = `Plan before dates ${suffix}`;
  const { proposalId } = await arrange.startIdea({ name: ideaName, tripId });
  await openIdea(page, { proposalId, tripId });
  await openItinerary(page);
  await addFirstDestination(page, { name: 'Porto', notes: 'River walk' });
  await addActivity(page, { destination: 'Porto, Portugal', title: 'Explore the old town' });
  await expect(page.getByRole('region', { name: 'Day 1 schedule' })).toContainText(
    'Explore the old town'
  );
  await openIdeaFromList(page, ideaName);
  await openIdeaItinerary(page);
  await editActivity(page, { title: 'Explore the old town', address: 'Ribeira, Porto' });
});
