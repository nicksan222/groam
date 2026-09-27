import {
  addActivity,
  addFirstDestination,
  addIdea,
  createTrip,
  editActivity,
  mockDestinationSearch,
  openIdeaFromList,
  openIdeaItinerary,
  openItinerary,
  signIn,
  uniqueSuffix
} from '@groam/app-actions/playwright';
import { expect, test } from '@playwright/test';

test('plans and revisits an activity before trip dates or destination days are set', async ({
  page
}) => {
  test.setTimeout(120_000);
  await mockDestinationSearch(page);
  await signIn(page);
  const suffix = uniqueSuffix();
  await createTrip(page, { name: `Flexible trip ${suffix}` });
  const ideaName = `Plan before dates ${suffix}`;
  await addIdea(page, { name: ideaName });
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
