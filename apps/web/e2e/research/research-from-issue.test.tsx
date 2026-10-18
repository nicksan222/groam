import {
  arrange,
  by,
  chatMessage,
  createLinkedResearch,
  expectLinkedResearch,
  expectGone,
  ids,
  openIssue,
  openLinkedResearch,
  sendChatMessage,
  uniqueSuffix
} from '@groam/app-actions/vitest';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { openApp } from '@/journeys/open-app';

test('research started from an issue collects links from two travelers and links back', async () => {
  const suffix = uniqueSuffix();
  const subject = `Hotels near the Duomo ${suffix}`;
  const traveler = await arrange.addMember('researcher');
  const tripId = await arrange.createTrip({ name: `Research trip ${suffix}` });
  const issueId = await arrange.createIssue({
    body: 'Where should we stay in Florence?',
    title: `Pick a hotel ${suffix}`,
    tripId
  });
  await openApp();
  await openIssue(issueId);

  await createLinkedResearch(subject);
  await openLinkedResearch(subject);
  const researchPath = location.pathname;
  const ownerLink = `https://example.com/duomo-suites-${suffix}`;
  await sendChatMessage(ownerLink);
  await expectGone(page.getByText('Sending…'));

  // The same browser now belongs to the second traveler, who adds a link of their own.
  await openApp(researchPath, { as: traveler });
  await expect.element(by(ids.researchHeader)).toBeVisible();
  await expect.element(chatMessage(ownerLink)).toBeVisible();
  const travelerLink = `https://example.com/arno-rooms-${suffix}`;
  await sendChatMessage(travelerLink);
  await expectGone(page.getByText('Sending…'));
  await expect.element(chatMessage(travelerLink)).toBeVisible();

  // Back on the issue, the research is linked.
  await openApp(`/issues/${issueId}`, { as: traveler });
  await expectLinkedResearch(subject);
});
