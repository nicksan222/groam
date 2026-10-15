import {
  arrange,
  by,
  ids,
  openIdea,
  returnIdeaToEditing,
  reviewIdeaChange,
  uniqueSuffix
} from '@groam/app-actions/vitest';
import { expect, test } from 'vite-plus/test';
import { openApp } from '@/testing/open-app';

// Collapsing and expanding a change card, and the mobile no-overflow check, are component-level
// and left to view tests.
test('reviews an edit, comments without blocking it, and returns to editing', async () => {
  const suffix = uniqueSuffix();
  const tripId = await arrange.createTrip({ name: `Review polish ${suffix}` });
  const idea = await arrange.startIdea({ name: `Review dates ${suffix}`, tripId });
  const note = `Prefer a relaxed weekend ${suffix}`;
  await arrange.updateTrip({ dateNotes: note, tripId: idea.workingTripId });
  await openApp();
  await openIdea({ proposalId: idea.proposalId, tripId });
  const comment = `Looks good, keeping this flexible. ${suffix}`;
  await reviewIdeaChange({ change: note, comment });
  await expect.element(by(ids.requestReview)).toBeEnabled();
  await returnIdeaToEditing();
});
