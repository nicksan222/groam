import {
  ideaRow,
  openApp,
  openWorkspaceIdeas,
  searchIdeas,
  uniqueSuffix
} from '@groam/app-actions/playwright';
import { expect, test } from '@groam/app-actions/playwright/test';

test('workspace idea search finds the matching proposal and clears cleanly', async ({
  arrange,
  page
}) => {
  test.setTimeout(120_000);
  const suffix = uniqueSuffix();
  const first = `Coast proposal ${suffix}`;
  const second = `Museum proposal ${suffix}`;
  const coastTripId = await arrange.createTrip({ name: `Coast trip ${suffix}` });
  await arrange.startIdea({ name: first, tripId: coastTripId });
  const cityTripId = await arrange.createTrip({ name: `City trip ${suffix}` });
  await arrange.startIdea({ name: second, tripId: cityTripId });
  await openApp(page);
  await openWorkspaceIdeas(page);

  await searchIdeas(page, 'Museum proposal');
  await expect(ideaRow(page, second)).toBeVisible();
  await expect(ideaRow(page, first)).toHaveCount(0);
  await searchIdeas(page, '');
  await expect(ideaRow(page, second)).toBeVisible();
  await expect(ideaRow(page, first)).toBeVisible();
});
