import {
  addIdea,
  createTrip,
  ideaRow,
  openWorkspaceIdeas,
  searchIdeas,
  signIn,
  uniqueSuffix
} from '@groam/app-actions/playwright';
import { expect, test } from '@playwright/test';

test('workspace idea search finds the matching proposal and clears cleanly', async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page);
  const suffix = uniqueSuffix();
  const first = `Coast proposal ${suffix}`;
  const second = `Museum proposal ${suffix}`;
  await createTrip(page, { name: `Coast trip ${suffix}` });
  await addIdea(page, { name: first });
  await createTrip(page, { name: `City trip ${suffix}` });
  await addIdea(page, { name: second });
  await openWorkspaceIdeas(page);

  await searchIdeas(page, 'Museum proposal');
  await expect(ideaRow(page, second)).toBeVisible();
  await expect(ideaRow(page, first)).toHaveCount(0);
  await searchIdeas(page, '');
  await expect(ideaRow(page, second)).toBeVisible();
  await expect(ideaRow(page, first)).toBeVisible();
});
