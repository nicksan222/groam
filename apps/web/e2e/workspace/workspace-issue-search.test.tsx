import {
  arrange,
  expectGone,
  issueRow,
  openIssuesInbox,
  searchIssues,
  uniqueSuffix
} from '@groam/app-actions/vitest';
import { expect, test } from 'vite-plus/test';
import { openApp } from '@/journeys/open-app';

test('workspace issue search finds the matching issue and clears cleanly', async () => {
  const suffix = uniqueSuffix();
  const first = `Museum issue ${suffix}`;
  const second = `Ferry issue ${suffix}`;
  const tripId = await arrange.createTrip({ name: `Issue search trip ${suffix}` });
  await arrange.createIssue({ body: 'Check opening hours.', title: first, tripId });
  await arrange.createIssue({ body: 'Check departure time.', title: second, tripId });
  await openApp();
  await openIssuesInbox();

  await searchIssues('Ferry issue');
  await expect.element(issueRow(second)).toBeVisible();
  await expectGone(issueRow(first));
  await searchIssues('');
  await expect.element(issueRow(first)).toBeVisible();
  await expect.element(issueRow(second)).toBeVisible();
});
