import {
  addIssueComment,
  arrange,
  assignIssue,
  by,
  createIssue,
  expectIssueInLane,
  expectPath,
  filterIssuesByStatus,
  ids,
  issueCard,
  issueRow,
  openTripBoard,
  openIssueFromInbox,
  openIssuesInbox,
  openTrip,
  presentAttribute,
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

  await openIssuesInbox();
  await filterIssuesByStatus('closed');
  await expect
    .element(issueRow(issueTitle).getByRole('link').first())
    .toHaveAttribute('href', `/issues/${issueId}`);
  await openIssueFromInbox(issueTitle, { status: 'closed' });
  await expectPath(new RegExp(`/issues/${issueId}`, 'u'));
  await expect.element(by(ids.issueHeading)).toHaveAttribute('data-issue-id', issueRecordId);

  // The trip board lists the closed issue in its Done lane.
  await openTripBoard(tripId);
  await expectIssueInLane(issueTitle, 'closed');
  await expect
    .element(issueCard(issueTitle).getByRole('link').first())
    .toHaveAttribute('href', `/issues/${issueId}`);
});
