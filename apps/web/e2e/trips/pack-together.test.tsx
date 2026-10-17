import {
  addGroupGear,
  addIdea,
  addPersonalPackingItem,
  arrange,
  bringGearMyself,
  by,
  ids,
  openTrip,
  openTripSection,
  packPersonalItem,
  uniqueSuffix
} from '@groam/app-actions/vitest';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { openApp } from '@/journeys/open-app';

test('packs together: group gear through an idea, plus a private list', async () => {
  const suffix = uniqueSuffix();
  await openApp();
  await openTrip(await arrange.createTrip({ name: `Pack together ${suffix}` }));

  // On the shared trip group gear is read-only and points at an idea.
  await openTripSection('packing');
  await expect.element(by(ids.tripPackingChange)).toBeVisible();
  await expect.element(by(ids.tripPackingGearAdd)).not.toBeInTheDocument();
  await expect.element(page.getByText('Only you can see this')).toBeVisible();

  // In an idea the author edits the gear and assigns themselves.
  await addIdea({ name: `pack/gear-${suffix}` });
  await openTripSection('packing');
  await addGroupGear({ label: 'Hair dryer', quantity: 3 });
  await bringGearMyself();
  await expect.element(page.getByText('1 of 3 claimed')).toBeVisible();
  await expect.element(page.getByText('Need 2 more')).toBeVisible();
  await expect.element(by(ids.tripPackingDraftNotice)).toBeVisible();

  // The personal list is the viewer's own: add an item and tick it.
  await addPersonalPackingItem('Phone charger');
  await packPersonalItem('Phone charger');
});
