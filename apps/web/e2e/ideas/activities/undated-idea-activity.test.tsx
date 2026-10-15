import {
  addActivity,
  addFirstDestination,
  arrange,
  editActivity,
  environment,
  openIdea,
  openIdeaFromList,
  openIdeaItinerary,
  openItinerary,
  uniqueSuffix
} from '@groam/app-actions/vitest';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { openApp } from '@/testing/open-app';

test('plans and revisits an activity before trip dates or destination days are set', async () => {
  await environment.mockDestinationSearch();
  const suffix = uniqueSuffix();
  const tripId = await arrange.createTrip({ name: `Flexible trip ${suffix}` });
  const ideaName = `Plan before dates ${suffix}`;
  const { proposalId } = await arrange.startIdea({ name: ideaName, tripId });
  await openApp();
  await openIdea({ proposalId, tripId });
  await openItinerary();
  await addFirstDestination({ name: 'Porto', notes: 'River walk' });
  await addActivity({ destination: 'Porto, Portugal', title: 'Explore the old town' });
  await expect
    .element(page.getByRole('region', { name: 'Day 1 schedule' }))
    .toMatchTextContent('Explore the old town');
  await openIdeaFromList(ideaName);
  await openIdeaItinerary();
  await editActivity({ title: 'Explore the old town', address: 'Ribeira, Porto' });
});
