import {
  addIdea,
  closeIdea,
  createTrip,
  filterWorkspaceIdeas,
  ideaRow,
  ids,
  requestIdeaReview,
  signIn,
  uniqueSuffix,
  updateTrip
} from '@groam/app-actions/playwright';
import { expect, test } from '@playwright/test';

test('deletes a draft idea without leaving an editable working copy', async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page);
  const suffix = uniqueSuffix();
  await createTrip(page, { name: `Abandoned trip ${suffix}` });
  const name = `Abandoned idea ${suffix}`;
  await addIdea(page, { name });
  await closeIdea(page);
  await filterWorkspaceIdeas(page, 'Settled', [name]);
  const row = ideaRow(page, name);
  await expect(row).toHaveAttribute('data-status', 'closed');
  await expect(row.getByTestId(ids.ideaContinue)).toHaveCount(0);
});

test('requires a reason to pass on an idea already in review', async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page);
  const suffix = uniqueSuffix();
  await createTrip(page, { name: `Review trip ${suffix}` });
  const name = `Pass on idea ${suffix}`;
  await addIdea(page, { name });
  await updateTrip(page, { dateNotes: 'Try a different week' });
  await requestIdeaReview(page);
  await closeIdea(page, 'The original week works better');
  await filterWorkspaceIdeas(page, 'Settled', [name]);
  const row = ideaRow(page, name);
  await expect(row).toHaveAttribute('data-status', 'closed');
  await expect(row.getByTestId(ids.ideaContinue)).toHaveCount(0);
});
