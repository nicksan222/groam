import {
  arrange,
  currentPath,
  openTripBoard,
  openTripPage,
  returnToBoard,
  uniqueSuffix
} from '@groam/app-actions/vitest';
import { expect, test } from 'vite-plus/test';
import { openApp } from '@/journeys/open-app';

test('reaches the overview and activity tabs from the board footers and returns to the board', async () => {
  const suffix = uniqueSuffix();
  const tripId = await arrange.createTrip({ name: `Plan history trip ${suffix}` });
  // Done stays a collapsed rail, without its history footer, until something lands in it.
  const issueId = await arrange.createIssue({ body: 'Settled.', title: `Done ${suffix}`, tripId });
  await arrange.setIssueStatus({ issueId, status: 'closed' });
  await openApp();
  await openTripBoard(tripId);

  await openTripPage('plan');
  expect(currentPath()).toMatch(/\/trips\/[a-z]{6}\/overview$/u);
  await returnToBoard();
  await openTripPage('history');
  expect(currentPath()).toMatch(/\/trips\/[a-z]{6}\/activity$/u);
  await returnToBoard();
  expect(currentPath()).toMatch(/\/trips\/[a-z]{6}\/board$/u);
});
