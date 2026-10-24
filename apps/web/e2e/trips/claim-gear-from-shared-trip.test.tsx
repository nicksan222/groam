import {
  addGroupGear,
  addIdea,
  approveAndApplyIdea,
  arrange,
  by,
  claimGearFromSharedTrip,
  ids,
  openIdeaComparison,
  openTrip,
  openTripSection,
  requestIdeaReview,
  uniqueSuffix
} from '@groam/app-actions/vitest';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { openApp } from '@/journeys/open-app';

test('"I\'ll bring one" on the shared trip starts an idea with the claim applied', async () => {
  const suffix = uniqueSuffix();
  const tripId = await arrange.createTrip({ name: `Claim gear ${suffix}` });
  await openApp();
  await openTrip(tripId);

  // Gear reaches the shared trip through an idea, as it always does.
  await addIdea({ name: `claim/gear-${suffix}` });
  await openTripSection('packing');
  await addGroupGear({ label: 'Stove', quantity: 1 });
  await requestIdeaReview();
  await openIdeaComparison();
  await approveAndApplyIdea();

  // On the shared trip the row offers the claim; it starts an idea that lands with it applied.
  await openTrip(tripId);
  await openTripSection('packing');
  await expect.element(by(ids.tripPackingCoverage)).toHaveTextContent('0 of 1');
  await claimGearFromSharedTrip('Stove');
  await expect.poll(() => location.pathname).toMatch(/\/ideas\/[^/]+\/packing/u);
  await expect.element(by(ids.tripPackingDraftNotice)).toBeVisible();
  await expect
    .element(by(ids.tripPackingGearItem).getByTitle('Stove', { exact: true }))
    .toBeVisible();
  await expect.element(page.getByTitle('You 1', { exact: true })).toBeVisible();
  await expect.element(by(ids.tripPackingCoverage)).toHaveTextContent('1 of 1');
});
