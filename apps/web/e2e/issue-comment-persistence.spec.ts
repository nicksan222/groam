import {
  by,
  createIssue,
  createPlaywrightActions,
  createTrip,
  ids,
  openIssueFromInbox,
  openIssueFromTrip,
  signIn,
  uniqueSuffix
} from '@groam/app-actions/playwright';
import { expect, test } from '@playwright/test';

test('issue comments persist across trip and workspace views', async ({ page }) => {
  test.setTimeout(90_000);
  await signIn(page);
  const suffix = uniqueSuffix();
  const title = `Issue conversation ${suffix}`;
  const comment = `Check the museum schedule ${suffix}`;
  const tripId = await createTrip(page, { name: `Comment trip ${suffix}` });
  const issueId = await createIssue(page, { body: 'Need an indoor alternative.', title, tripId });
  await createPlaywrightActions().addIssueComment(page, { content: comment, issueId });
  await expect(by(page, ids.issueComment)).toBeEmpty();

  await openIssueFromTrip(page, tripId, title);
  await expect(page.getByText(comment, { exact: true })).toBeVisible();
  await openIssueFromInbox(page, title);
  await expect(page.getByText(comment, { exact: true })).toBeVisible();
});
