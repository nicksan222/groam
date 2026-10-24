import {
  arrange,
  by,
  expectQueueItem,
  ids,
  openIssue,
  openIssueFromTrip,
  openTripQueue,
  setIssueStatus,
  uniqueSuffix
} from '@groam/app-actions/vitest';
import { expect, test } from 'vite-plus/test';
import { openApp } from '@/journeys/open-app';

test('reopening a closed issue moves it back into the trip’s open issues', async () => {
  const suffix = uniqueSuffix();
  const title = `Reopen rainy-day plan ${suffix}`;
  const tripId = await arrange.createTrip({ name: `Issue reopen trip ${suffix}` });
  const issueId = await arrange.createIssue({ body: 'Check indoor alternatives.', title, tripId });
  await openApp();
  await openIssue(issueId);
  await setIssueStatus('closed');

  await openTripQueue(tripId, 'issues');
  await expectQueueItem(title, 'settled');
  await openIssueFromTrip(tripId, title, { fromSettled: true });
  await setIssueStatus('open');
  await expect.element(by(ids.issueStatus)).toHaveAttribute('data-status', 'open');

  await openTripQueue(tripId, 'issues');
  await expectQueueItem(title, 'open');
});
