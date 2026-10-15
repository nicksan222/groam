import {
  arrange,
  expectGone,
  ideaRow,
  openWorkspaceIdeas,
  searchIdeas,
  uniqueSuffix
} from '@groam/app-actions/vitest';
import { expect, test } from 'vite-plus/test';
import { openApp } from '@/testing/open-app';

test('workspace idea search finds the matching proposal and clears cleanly', async () => {
  const suffix = uniqueSuffix();
  const first = `Coast proposal ${suffix}`;
  const second = `Museum proposal ${suffix}`;
  const coastTripId = await arrange.createTrip({ name: `Coast trip ${suffix}` });
  await arrange.startIdea({ name: first, tripId: coastTripId });
  const cityTripId = await arrange.createTrip({ name: `City trip ${suffix}` });
  await arrange.startIdea({ name: second, tripId: cityTripId });
  await openApp();
  await openWorkspaceIdeas();

  await searchIdeas('Museum proposal');
  await expect.element(ideaRow({ title: second })).toBeVisible();
  await expectGone(ideaRow({ title: first }));
  await searchIdeas('');
  await expect.element(ideaRow({ title: second })).toBeVisible();
  await expect.element(ideaRow({ title: first })).toBeVisible();
});
