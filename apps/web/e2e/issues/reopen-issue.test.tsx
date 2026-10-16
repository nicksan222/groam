import {
  arrange,
  by,
  expectGone,
  filterIssuesByStatus,
  ids,
  issueRow,
  openIssue,
  openIssueFromInbox,
  openIssuesInbox,
  setIssueStatus,
  uniqueSuffix
} from '@groam/app-actions/vitest';
import { expect, test } from 'vite-plus/test';
import { openApp } from '@/testing/open-app';

test('reopening a closed issue moves it back into the open workspace filter', async () => {
  const suffix = uniqueSuffix();
  const title = `Reopen rainy-day plan ${suffix}`;
  const tripId = await arrange.createTrip({ name: `Issue reopen trip ${suffix}` });
  const issueId = await arrange.createIssue({ body: 'Check indoor alternatives.', title, tripId });
  await openApp();
  await openIssue(issueId);
  await setIssueStatus('closed');

  await openIssuesInbox();
  await filterIssuesByStatus('closed');
  await expect.element(issueRow(title)).toBeVisible();
  await openIssueFromInbox(title, { status: 'closed' });
  await setIssueStatus('open');
  await expect.element(by(ids.issueStatus)).toHaveAttribute('data-status', 'open');

  await openIssuesInbox();
  await filterIssuesByStatus('open');
  await expect.element(issueRow(title)).toBeVisible();
  await filterIssuesByStatus('closed');
  await expectGone(issueRow(title));
});
