import {
  addIdea,
  by,
  createTrip,
  ideaRow,
  ids,
  openAppPath,
  openIdeaFromList,
  openSharedTrip,
  openTripSection,
  openWorkspaceIdeas,
  signIn,
  uniqueSuffix
} from '@groam/app-actions/playwright';
import { expect, test } from '@playwright/test';

test('starts an idea and opens first-class idea routes', async ({ page }) => {
  test.setTimeout(180_000);
  await signIn(page);
  const suffix = uniqueSuffix();
  const tripName = `Idea routes ${suffix}`;
  const ideaName = `routes/open-idea-${suffix}`;

  const tripId = await createTrip(page, { name: tripName });
  await addIdea(page, { name: ideaName });
  await openSharedTrip(page);
  await expect(by(page, ids.tripHeading)).toHaveAttribute('data-trip-name', tripName);
  await openTripSection(page, 'ideas');

  const draftRow = ideaRow(page, ideaName);
  await expect(draftRow.getByTestId(ids.ideaContinue)).toBeVisible();
  const proposalId = await draftRow.getAttribute('data-idea-id');
  expect(proposalId).toBeTruthy();

  await openWorkspaceIdeas(page);
  await expect(ideaRow(page, ideaName)).toBeVisible();

  await openIdeaFromList(page, ideaName);
  await expect(page).toHaveURL(
    new RegExp(`/trips/${tripId}/ideas/${proposalId}/overview(?:\\?.*)?$`, 'u')
  );

  await openAppPath(page, `trips/${tripId}/versions`);
  await expect(page).toHaveURL(new RegExp(`/trips/${tripId}/(versions|ideas)`, 'u'));
  await expect(by(page, ids.tripSectionIdeas).or(by(page, ids.ideasTitle))).toBeVisible();

  await openAppPath(page, `trips/${tripId}/versions?proposal=${proposalId}`);
  await expect(page).toHaveURL(
    new RegExp(`/trips/${tripId}/ideas/${proposalId}/compare(?:\\?.*)?$`, 'u')
  );
});
