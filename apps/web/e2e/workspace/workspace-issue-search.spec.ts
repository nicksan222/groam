import {
  createIssue,
  createTrip,
  issueRow,
  openAppPath,
  openIssuesInbox,
  searchIssues,
  signIn,
  uniqueSuffix
} from '@groam/app-actions/playwright';
import { expect, test } from '@playwright/test';

test('workspace issue search finds the matching issue and clears cleanly', async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page);
  const suffix = uniqueSuffix();
  const first = `Museum issue ${suffix}`;
  const second = `Ferry issue ${suffix}`;
  const tripId = await createTrip(page, { name: `Issue search trip ${suffix}` });
  await createIssue(page, { body: 'Check opening hours.', title: first, tripId });
  await openAppPath(page, `trips/${tripId}/issues`);
  await createIssue(page, { body: 'Check departure time.', title: second, tripId });
  await openIssuesInbox(page);

  await searchIssues(page, 'Ferry issue');
  await expect(issueRow(page, second)).toBeVisible();
  await expect(issueRow(page, first)).toHaveCount(0);
  await searchIssues(page, '');
  await expect(issueRow(page, first)).toBeVisible();
  await expect(issueRow(page, second)).toBeVisible();
});
