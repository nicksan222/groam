import {
  addIssueComment,
  arrange,
  by,
  ids,
  openIssue,
  openIssueFromTrip,
  uniqueSuffix
} from '@groam/app-actions/vitest';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { openApp } from '@/journeys/open-app';

test('issue comments persist across the issue page and the trip’s queue', async () => {
  const suffix = uniqueSuffix();
  const title = `Issue conversation ${suffix}`;
  const comment = `Check the museum schedule ${suffix}`;
  const tripId = await arrange.createTrip({ name: `Comment trip ${suffix}` });
  const issueId = await arrange.createIssue({ body: 'Need an indoor alternative.', title, tripId });
  await openApp();
  await openIssue(issueId);
  await addIssueComment(comment);
  await expect.poll(() => by(ids.issueComment).element().textContent?.trim()).toBe('');

  await openIssueFromTrip(tripId, title);
  await expect.element(page.getByText(comment)).toBeVisible();
  await openIssue(issueId);
  await expect.element(page.getByText(comment)).toBeVisible();
});
