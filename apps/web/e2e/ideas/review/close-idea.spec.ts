import {
  closeIdea,
  filterWorkspaceIdeas,
  ideaRow,
  ids,
  openIdea,
  uniqueSuffix
} from '@groam/app-actions/playwright';
import { expect, test } from '@groam/app-actions/playwright/test';

test('deletes a draft idea without leaving an editable working copy', async ({ arrange, page }) => {
  test.setTimeout(120_000);
  const suffix = uniqueSuffix();
  const tripId = await arrange.createTrip({ name: `Abandoned trip ${suffix}` });
  const name = `Abandoned idea ${suffix}`;
  const { proposalId } = await arrange.startIdea({ name, tripId });
  await openIdea(page, { proposalId, tripId });
  await closeIdea(page);
  await filterWorkspaceIdeas(page, 'Settled', [name]);
  const row = ideaRow(page, name);
  await expect(row).toHaveAttribute('data-status', 'closed');
  await expect(row.getByTestId(ids.ideaContinue)).toHaveCount(0);
});

test('requires a reason to pass on an idea already in review', async ({ arrange, page }) => {
  test.setTimeout(120_000);
  const suffix = uniqueSuffix();
  const tripId = await arrange.createTrip({ name: `Review trip ${suffix}` });
  const name = `Pass on idea ${suffix}`;
  const idea = await arrange.startIdea({ name, tripId });
  await arrange.updateTrip({ dateNotes: 'Try a different week', tripId: idea.workingTripId });
  await arrange.requestIdeaReview(idea.proposalId);
  await openIdea(page, { proposalId: idea.proposalId, tripId });
  await closeIdea(page, 'The original week works better');
  await filterWorkspaceIdeas(page, 'Settled', [name]);
  const row = ideaRow(page, name);
  await expect(row).toHaveAttribute('data-status', 'closed');
  await expect(row.getByTestId(ids.ideaContinue)).toHaveCount(0);
});
