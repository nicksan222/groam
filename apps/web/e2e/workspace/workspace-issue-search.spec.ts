import {
  issueRow,
  openApp,
  openIssuesInbox,
  searchIssues,
  uniqueSuffix
} from '@groam/app-actions/playwright';
import { expect, test } from '@groam/app-actions/playwright/test';

test('workspace issue search finds the matching issue and clears cleanly', async ({
  arrange,
  page
}) => {
  test.setTimeout(120_000);
  const suffix = uniqueSuffix();
  const first = `Museum issue ${suffix}`;
  const second = `Ferry issue ${suffix}`;
  const tripId = await arrange.createTrip({ name: `Issue search trip ${suffix}` });
  await arrange.createIssue({ body: 'Check opening hours.', title: first, tripId });
  await arrange.createIssue({ body: 'Check departure time.', title: second, tripId });
  await openApp(page);
  await openIssuesInbox(page);

  await searchIssues(page, 'Ferry issue');
  await expect(issueRow(page, second)).toBeVisible();
  await expect(issueRow(page, first)).toHaveCount(0);
  await searchIssues(page, '');
  await expect(issueRow(page, first)).toBeVisible();
  await expect(issueRow(page, second)).toBeVisible();
});
