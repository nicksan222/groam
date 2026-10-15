import {
  by,
  ids,
  openApp,
  openSharedTrip,
  startWorkspaceIdea,
  uniqueSuffix
} from '@groam/app-actions/playwright';
import { expect, test } from '@groam/app-actions/playwright/test';

test('starts a new idea from workspace Ideas for the selected trip', async ({ arrange, page }) => {
  test.setTimeout(120_000);
  const suffix = uniqueSuffix();
  const firstName = `Unselected trip ${suffix}`;
  const selectedName = `Selected trip ${suffix}`;
  await arrange.createTrip({ name: firstName });
  await arrange.createTrip({ name: selectedName });
  await openApp(page);
  const ideaName = `Change the selected trip ${suffix}`;

  await startWorkspaceIdea(page, { tripName: selectedName, title: ideaName });
  // The shared trip check below proves the idea belongs to the selected trip.
  await expect(page).toHaveURL(/\/trips\/[^/]+\/ideas\/[^/]+\/overview/u);
  await expect(page.getByRole('heading', { name: ideaName })).toBeVisible();
  await expect(by(page, ids.ideaWorkspace)).toHaveAttribute('data-idea-name', /.+/u);
  await openSharedTrip(page);
  await expect(by(page, ids.tripHeading)).toHaveAttribute('data-trip-name', selectedName);
});
