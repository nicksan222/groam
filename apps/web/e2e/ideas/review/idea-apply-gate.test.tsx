import {
  arrange,
  by,
  ids,
  openIdea,
  openIdeaComparison,
  reloadAppPage,
  uniqueSuffix
} from '@groam/app-actions/vitest';
import { expect, test } from 'vite-plus/test';
import { openApp } from '@/testing/open-app';

test('submitting an idea for review does not allow applying it without approval', async () => {
  const suffix = uniqueSuffix();
  const tripId = await arrange.createTrip({ name: `Unapproved trip ${suffix}` });
  const idea = await arrange.startIdea({ name: `Unapproved idea ${suffix}`, tripId });
  await arrange.updateTrip({ dateNotes: 'A slower weekend', tripId: idea.workingTripId });
  await arrange.requestIdeaReview(idea.proposalId);
  await openApp();
  await openIdea({ proposalId: idea.proposalId, tripId });
  await openIdeaComparison();

  await expect.element(by(ids.applyIdea).first()).toBeVisible();
  await expect.element(by(ids.applyIdea).first()).toBeDisabled();
  await reloadAppPage();
  await expect.element(by(ids.applyIdea).first()).toBeDisabled();
});
