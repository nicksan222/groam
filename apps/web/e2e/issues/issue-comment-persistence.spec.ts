import {
  by,
  createPlaywrightActions,
  ids,
  openIssue,
  openIssueFromInbox,
  openIssueFromTrip,
  uniqueSuffix
} from '@groam/app-actions/playwright';
import { expect, test } from '@groam/app-actions/playwright/test';

test('issue comments persist across trip and workspace views', async ({ arrange, page }) => {
  test.setTimeout(90_000);
  const suffix = uniqueSuffix();
  const title = `Issue conversation ${suffix}`;
  const comment = `Check the museum schedule ${suffix}`;
  const tripId = await arrange.createTrip({ name: `Comment trip ${suffix}` });
  const issueId = await arrange.createIssue({ body: 'Need an indoor alternative.', title, tripId });
  await openIssue(page, issueId);
  await createPlaywrightActions().addIssueComment(page, { content: comment, issueId });
  await expect(by(page, ids.issueComment)).toBeEmpty();

  await openIssueFromTrip(page, tripId, title);
  await expect(page.getByText(comment, { exact: true })).toBeVisible();
  await openIssueFromInbox(page, title);
  await expect(page.getByText(comment, { exact: true })).toBeVisible();
});
