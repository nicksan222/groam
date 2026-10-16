import {
  addIssueComment,
  arrange,
  assignIssue,
  by,
  createIssue,
  expectPath,
  filterIssuesByStatus,
  ids,
  issueRow,
  openAppPath,
  openIssueFromInbox,
  openIssuesInbox,
  openTrip,
  openTripSection,
  presentAttribute,
  setIssueStatus,
  uniqueSuffix
} from '@groam/app-actions/vitest';
import { expect, test } from 'vite-plus/test';
import { openApp } from '@/testing/open-app';

test('creates a trip issue and opens it as a first-class page', async () => {
  const suffix = uniqueSuffix();
  const tripName = `Issue trip ${suffix}`;
  const issueTitle = `Rainy-day plan ${suffix}`;
  const issueBody = 'Add a backup indoor day if it rains.';

  const { credentials } = await arrange.account();
  await openApp();
  const tripId = await openTrip(await arrange.createTrip({ name: tripName }));
  const issueId = await createIssue({ body: issueBody, title: issueTitle });
  const issueRecordId = await presentAttribute(by(ids.issueHeading), 'data-issue-id');

  await addIssueComment(`Need a museum option (${suffix})`);

  // Assigning a traveler keeps the flow independent of AI keys; Groam assignment is covered by
  // the assignee picker's view tests and the backend's agent-run tests.
  await assignIssue({ kind: 'user', name: credentials.name });
  await expect.element(by(ids.issueToggleStatus)).toBeEnabled();

  await setIssueStatus('closed');

  await openIssuesInbox();
  await filterIssuesByStatus('closed');
  await expect
    .element(issueRow(issueTitle).getByRole('link').first())
    .toHaveAttribute('href', `/issues/${issueId}`);
  await openIssueFromInbox(issueTitle, { status: 'closed' });
  await expectPath(new RegExp(`/issues/${issueId}`, 'u'));
  await expect.element(by(ids.issueHeading)).toHaveAttribute('data-issue-id', issueRecordId);

  await openAppPath(`trips/${tripId}/issues`);
  await expectPath(new RegExp(`/trips/${tripId}/issues`, 'u'));
  await openTripSection('issues');
  await filterIssuesByStatus('closed');
  await expect
    .element(issueRow(issueTitle).getByRole('link').first())
    .toHaveAttribute('href', `/issues/${issueId}`);
});
