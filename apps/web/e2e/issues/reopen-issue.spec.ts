import {
  by,
  createIssue,
  createTrip,
  filterIssuesByStatus,
  ids,
  issueRow,
  openIssueFromInbox,
  openIssuesInbox,
  setIssueStatus,
  signIn,
  uniqueSuffix
} from '@groam/app-actions/playwright';
import { expect, test } from '@playwright/test';

test('reopening a closed issue moves it back into the open workspace filter', async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page);
  const suffix = uniqueSuffix();
  const title = `Reopen rainy-day plan ${suffix}`;
  const tripId = await createTrip(page, { name: `Issue reopen trip ${suffix}` });
  const issueId = await createIssue(page, { body: 'Check indoor alternatives.', title, tripId });
  await setIssueStatus(page, { issueId, status: 'closed' });

  await openIssuesInbox(page);
  await filterIssuesByStatus(page, 'closed');
  await expect(issueRow(page, title)).toBeVisible();
  await openIssueFromInbox(page, title, { status: 'closed' });
  await setIssueStatus(page, { issueId, status: 'open' });
  await expect(by(page, ids.issueStatus)).toHaveAttribute('data-status', 'open');

  await openIssuesInbox(page);
  await filterIssuesByStatus(page, 'open');
  await expect(issueRow(page, title)).toBeVisible();
  await filterIssuesByStatus(page, 'closed');
  await expect(issueRow(page, title)).toHaveCount(0);
});
