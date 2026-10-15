import {
  addIdea,
  by,
  ideaRow,
  ids,
  openIdeaFromList,
  openSharedTrip,
  openTrip,
  openTripSection,
  openWorkspaceIdeas,
  uniqueSuffix
} from '@groam/app-actions/playwright';
import { expect, test } from '@groam/app-actions/playwright/test';

test('starts an idea and opens first-class idea routes', async ({ arrange, page }) => {
  test.setTimeout(180_000);
  const suffix = uniqueSuffix();
  const tripName = `Idea routes ${suffix}`;
  const ideaName = `routes/open-idea-${suffix}`;

  const tripId = await openTrip(page, await arrange.createTrip({ name: tripName }));
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
    new RegExp(`/trips/${tripId}/ideas/[a-z]{6}/overview(?:\\?.*)?$`, 'u')
  );
});
