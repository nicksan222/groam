import {
  arrange,
  assignIssue,
  expectIssueInLane,
  expectIssueRefusedOnBoard,
  laneTitles,
  moveIssueOnBoard,
  openTripBoard,
  reloadAppPage,
  reorderIssueOnBoard,
  uniqueSuffix
} from '@groam/app-actions/vitest';
import { expect, test } from 'vite-plus/test';
import { openApp } from '@/journeys/open-app';

test('moves an issue across the board lanes and keeps a reordered lane after reload', async () => {
  const suffix = uniqueSuffix();
  const title = `Board ferry ${suffix}`;
  const sibling = `Board hotel ${suffix}`;
  const tripId = await arrange.createTrip({ name: `Board trip ${suffix}` });
  await arrange.createIssue({ body: 'Pick a ferry.', title, tripId });
  await arrange.createIssue({ body: 'Pick a hotel.', title: sibling, tripId });
  await openApp();
  await openTripBoard(tripId);
  await expectIssueInLane(title, 'open');

  await moveIssueOnBoard(title, 'in_progress');
  await assignIssue({ kind: 'me' });
  await openTripBoard(tripId);
  await expectIssueInLane(title, 'in_progress');
  await moveIssueOnBoard(title, 'closed');
  await moveIssueOnBoard(title, 'open');

  const direction = laneTitles('open').indexOf(title) === 0 ? 'down' : 'up';
  const order = await reorderIssueOnBoard(title, direction);
  await reloadAppPage();
  await expect.poll(() => laneTitles('open')).toEqual(order);
});

test('refuses to drop a Mandatory starter issue into Done', async () => {
  const suffix = uniqueSuffix();
  const tripId = await arrange.createTrip({ name: `Mandatory trip ${suffix}` });
  await openApp();
  await openTripBoard(tripId);

  const starter = 'Choose where to go';
  await expectIssueInLane(starter, 'open');
  await expectIssueRefusedOnBoard(starter, 'closed');
  expect(laneTitles('closed')).not.toContain(starter);
});
