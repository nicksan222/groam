import {
  by,
  filterIssuesByStatus,
  ids,
  issueRow,
  openIssue,
  openIssueFromInbox,
  openIssuesInbox,
  setIssueStatus,
  uniqueSuffix
} from '@groam/app-actions/playwright';
import { expect, test } from '@groam/app-actions/playwright/test';

test('reopening a closed issue moves it back into the open workspace filter', async ({
  arrange,
  page
}) => {
  test.setTimeout(120_000);
  const suffix = uniqueSuffix();
  const title = `Reopen rainy-day plan ${suffix}`;
  const tripId = await arrange.createTrip({ name: `Issue reopen trip ${suffix}` });
  const issueId = await arrange.createIssue({ body: 'Check indoor alternatives.', title, tripId });
  await openIssue(page, issueId);
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
