import {
  arrange,
  by,
  ids,
  openIdea,
  openIdeaComparison,
  uniqueSuffix
} from '@groam/app-actions/vitest';
import { expect, test } from 'vite-plus/test';
import { openApp } from '@/testing/open-app';

test('revoking the only approval prevents an idea from being applied', async () => {
  const suffix = uniqueSuffix();
  const ideaName = `Approval reversal ${suffix}`;
  const tripId = await arrange.createTrip({ name: `Review reversal ${suffix}` });
  const idea = await arrange.startIdea({ name: ideaName, tripId });
  await arrange.updateTrip({ dateNotes: 'More time by the river', tripId: idea.workingTripId });
  await arrange.requestIdeaReview(idea.proposalId);
  const reviewer = await arrange.addMember('approval-reversal');
  const review = { ideaName, memberEmail: reviewer.email, tripId };

  await openApp();
  await openIdea({ proposalId: idea.proposalId, tripId });
  await openIdeaComparison();
  await expect.element(by(ids.applyIdea).first()).toBeDisabled();

  // The reviewer's own screen is covered by view tests; they act through the backend and the
  // author's screen reacts live.
  await arrange.approveIdea(review);
  await expect.element(by(ids.applyIdea).first()).toBeEnabled();

  await arrange.approveIdea({ ...review, approved: false });
  await expect.element(by(ids.applyIdea).first()).toBeDisabled();

  await arrange.approveIdea(review);
  await expect.element(by(ids.applyIdea).first()).toBeEnabled();
});
