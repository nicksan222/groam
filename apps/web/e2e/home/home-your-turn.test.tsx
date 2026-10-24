import {
  arrange,
  assignIssue,
  by,
  expectIssueAssignedToMe,
  homeTurnRow,
  ids,
  openFromHomeTurn,
  openHome,
  openIssue,
  uniqueSuffix
} from '@groam/app-actions/vitest';
import { expect, test } from 'vite-plus/test';
import { openApp } from '@/journeys/open-app';

test('an issue assigned to me appears on Home, and opens from there', async () => {
  const suffix = uniqueSuffix();
  const title = `Book the ferry ${suffix}`;
  const tripName = `Home turn trip ${suffix}`;
  const tripId = await arrange.createTrip({ name: tripName });
  const issueId = await arrange.createIssue({ body: 'Pick a sailing.', title, tripId });
  await openApp();
  await openIssue(issueId);
  await assignIssue({ kind: 'me' });
  await expectIssueAssignedToMe();

  await openHome();
  await expect.element(homeTurnRow(title)).toBeVisible();
  await expect.element(homeTurnRow(title)).toMatchTextContent(tripName);

  await openFromHomeTurn(title);
  await expect.element(by(ids.issueHeading)).toMatchTextContent(title);
});
