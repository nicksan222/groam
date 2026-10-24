import {
  arrange,
  assignIssue,
  by,
  expectIssueAssignedToMe,
  ids,
  expectQueueItem,
  queueRowIn,
  openIssue,
  openTripQueue,
  reloadAppPage,
  setIssueStatus,
  uniqueSuffix
} from '@groam/app-actions/vitest';
import { expect, test } from 'vite-plus/test';
import { openApp } from '@/journeys/open-app';

test("moves an issue through In progress and Won't do and finds it in the trip's queue", async () => {
  const suffix = uniqueSuffix();
  const title = `Lifecycle plan ${suffix}`;
  const tripId = await arrange.createTrip({ name: `Issue lifecycle trip ${suffix}` });
  const issueId = await arrange.createIssue({ body: 'Pick a dinner spot.', title, tripId });
  await openApp();
  await openIssue(issueId);

  await setIssueStatus('in_progress');

  // "To decide" and "In progress" both count as open.
  await openTripQueue(tripId, 'issues');
  await expectQueueItem(title, 'open');

  await openIssue(issueId);
  await setIssueStatus('wont_do');

  await openTripQueue(tripId, 'issues');
  await expectQueueItem(title, 'settled');
  await expect.element(queueRowIn(title, 'open')).not.toBeInTheDocument();
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
