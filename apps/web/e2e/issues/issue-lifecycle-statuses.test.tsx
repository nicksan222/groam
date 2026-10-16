import {
  arrange,
  assignIssue,
  by,
  expectGone,
  expectIssueAssignedToMe,
  filterIssuesByStatus,
  ids,
  issueRow,
  openIssue,
  openIssuesInbox,
  reloadAppPage,
  setIssueStatus,
  uniqueSuffix
} from '@groam/app-actions/vitest';
import { expect, test } from 'vite-plus/test';
import { openApp } from '@/journeys/open-app';

test("moves an issue through In progress and Won't do and finds it under the matching filters", async () => {
  const suffix = uniqueSuffix();
  const title = `Lifecycle plan ${suffix}`;
  const tripId = await arrange.createTrip({ name: `Issue lifecycle trip ${suffix}` });
  const issueId = await arrange.createIssue({ body: 'Pick a dinner spot.', title, tripId });
  await openApp();
  await openIssue(issueId);

  await setIssueStatus('in_progress');

  await openIssuesInbox();
  await filterIssuesByStatus('in_progress');
  await expect.element(issueRow(title)).toBeVisible();
  // "To decide" and "In progress" both count as active.
  await filterIssuesByStatus('open');
  await expect.element(issueRow(title)).toBeVisible();
  await filterIssuesByStatus('closed');
  await expectGone(issueRow(title));

  await openIssue(issueId);
  await setIssueStatus('wont_do');

  await openIssuesInbox();
  await filterIssuesByStatus('wont_do');
  await expect.element(issueRow(title)).toBeVisible();
  await filterIssuesByStatus('closed');
  await expect.element(issueRow(title)).toBeVisible();
  await filterIssuesByStatus('open');
  await expectGone(issueRow(title));
  await filterIssuesByStatus('in_progress');
  await expectGone(issueRow(title));
});

test('assigns an issue to me from the assignee picker', async () => {
  const suffix = uniqueSuffix();
  const tripId = await arrange.createTrip({ name: `Issue assign trip ${suffix}` });
  const issueId = await arrange.createIssue({
    body: 'Book the ferry.',
    title: `Assign plan ${suffix}`,
    tripId
  });
  await openApp();
  await openIssue(issueId);

  await assignIssue({ kind: 'me' });
  await expectIssueAssignedToMe();
  await reloadAppPage();
  await expectIssueAssignedToMe();
  await expect.element(by(ids.issueHeading)).toBeVisible();
});
