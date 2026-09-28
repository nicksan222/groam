import {
  by,
  createIssue,
  createPlaywrightActions,
  createTrip,
  filterIssuesByStatus,
  ids,
  issueRow,
  openAppPath,
  openIssueFromInbox,
  openIssuesInbox,
  openTripSection,
  signIn,
  uniqueSuffix
} from '@groam/app-actions/playwright';
import { expect, test } from '@playwright/test';

test('creates a trip issue and opens it as a first-class page', async ({ page }) => {
  test.setTimeout(90_000);
  await signIn(page);
  const suffix = uniqueSuffix();
  const tripName = `Issue trip ${suffix}`;
  const issueTitle = `Rainy-day plan ${suffix}`;
  const issueBody = 'Add a backup indoor day if it rains.';
  const app = createPlaywrightActions();

  const tripId = await createTrip(page, { name: tripName });
  const issueId = await createIssue(page, { body: issueBody, title: issueTitle, tripId });
  const issueRecordId = await by(page, ids.issueHeading).getAttribute('data-issue-id');
  if (!issueRecordId) throw new Error('Created issue did not expose its record ID');

  await app.addIssueComment(page, { content: `Need a museum option (${suffix})`, issueId });

  await app.assignIssue(page, { assignee: { kind: 'agent' }, issueId });
  await expect(by(page, ids.issueToggleStatus)).toBeEnabled();

  await app.setIssueStatus(page, { issueId, status: 'closed' });

  await openIssuesInbox(page);
  await filterIssuesByStatus(page, 'closed');
  const workspaceIssueLink = issueRow(page, issueTitle).locator('a').first();
  await expect(workspaceIssueLink).toHaveAttribute('href', `/issues/${issueId}`);
  await openIssueFromInbox(page, issueTitle, { status: 'closed' });
  await expect(page).toHaveURL(new RegExp(`/issues/${issueId}`, 'u'));
  await expect(by(page, ids.issueHeading)).toHaveAttribute('data-issue-id', issueRecordId);

  await openAppPath(page, `trips/${tripId}/issues`);
  await expect(page).toHaveURL(new RegExp(`/trips/${tripId}/issues`, 'u'));
  await openTripSection(page, 'issues');
  await filterIssuesByStatus(page, 'closed');
  await expect(issueRow(page, issueTitle).locator('a').first()).toHaveAttribute(
    'href',
    `/issues/${issueId}`
  );
});

test('lists workspace issues from the sidebar', async ({ page }) => {
  await signIn(page);
  await openIssuesInbox(page);
  await expect(by(page, ids.issuesTitle)).toBeVisible();
});
