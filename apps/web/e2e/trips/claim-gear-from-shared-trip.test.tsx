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
  await expect.element(page.getByText('0 of 1 claimed')).toBeVisible();
  await claimGearFromSharedTrip('Stove');
  await expect.poll(() => location.pathname).toMatch(/\/ideas\/[^/]+\/packing/u);
  await expect.element(by(ids.tripPackingDraftNotice)).toBeVisible();
  await expect.element(page.getByLabelText('Name of Stove')).toBeVisible();
  await expect.element(page.getByRole('group', { name: /^.+, 1 of this item$/u })).toBeVisible();
  await expect.element(page.getByText('1 of 1 claimed')).toBeVisible();
});
