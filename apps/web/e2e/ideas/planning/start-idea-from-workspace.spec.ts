import {
  by,
  createTrip,
  ids,
  openSharedTrip,
  signIn,
  startWorkspaceIdea,
  uniqueSuffix
} from '@groam/app-actions/playwright';
import { expect, test } from '@playwright/test';

test('starts a new idea from workspace Ideas for the selected trip', async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page);
  const suffix = uniqueSuffix();
  const firstName = `Unselected trip ${suffix}`;
  const selectedName = `Selected trip ${suffix}`;
  await createTrip(page, { name: firstName });
  const selectedTripId = await createTrip(page, { name: selectedName });
  const ideaName = `Change the selected trip ${suffix}`;

  await startWorkspaceIdea(page, { tripName: selectedName, title: ideaName });
  await expect(page).toHaveURL(new RegExp(`/trips/${selectedTripId}/ideas/[^/]+/overview`, 'u'));
  await expect(page.getByRole('heading', { name: ideaName })).toBeVisible();
  await expect(by(page, ids.ideaWorkspace)).toHaveAttribute('data-idea-name', /.+/u);
  await openSharedTrip(page);
  await expect(by(page, ids.tripHeading)).toHaveAttribute('data-trip-name', selectedName);
});
