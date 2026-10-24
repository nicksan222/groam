import {
  addIssueComment,
  arrange,
  assignIssue,
  by,
  createIssue,
  expectQueueItem,
  expectPath,
  ids,
  openTripQueue,
  openIssueFromTrip,
  openTrip,
  presentAttribute,
  queueRow,
  setIssueStatus,
  uniqueSuffix
} from '@groam/app-actions/vitest';
import { expect, test } from 'vite-plus/test';
import { openApp } from '@/journeys/open-app';

test('creates a trip issue and opens it as a first-class page', async () => {
  const suffix = uniqueSuffix();
  const tripName = `Issue trip ${suffix}`;
  const issueTitle = `Rainy-day plan ${suffix}`;
  const issueBody = 'Add a backup indoor day if it rains.';

  await arrange.account();
  await openApp();
  const tripId = await openTrip(await arrange.createTrip({ name: tripName }));
  const issueId = await createIssue({ body: issueBody, title: issueTitle });
  const issueRecordId = await presentAttribute(by(ids.issueHeading), 'data-issue-id');

  await addIssueComment(`Need a museum option (${suffix})`);

  // Assigning me keeps the flow independent of ChatGPT authorization; Groam assignment is covered by
  // the assignee picker's view tests and the backend's agent-run tests.
  await assignIssue({ kind: 'me' });
  await expect.element(by(ids.issueStatus)).toBeEnabled();

  await setIssueStatus('closed');

  // The trip's Issues queue lists the closed issue among the settled ones, and opens its page.
  await openTripQueue(tripId, 'issues');
  await expectQueueItem(issueTitle, 'settled');
  await expect
    .element(queueRow(issueTitle).getByRole('link').first())
    .toHaveAttribute('href', `/issues/${issueId}`);
  await openIssueFromTrip(tripId, issueTitle, { fromSettled: true });
  await expectPath(new RegExp(`/issues/${issueId}`, 'u'));
  await expect.element(by(ids.issueHeading)).toHaveAttribute('data-issue-id', issueRecordId);
});
