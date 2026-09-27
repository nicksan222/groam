import {
  addIdea,
  by,
  createTrip,
  ids,
  reloadAppPage,
  requestIdeaReview,
  signIn,
  uniqueSuffix,
  updateTrip
} from '@groam/app-actions/playwright';
import { expect, test } from '@playwright/test';

test('submitting an idea for review does not allow applying it without approval', async ({
  page
}) => {
  test.setTimeout(90_000);
  await signIn(page);
  const suffix = uniqueSuffix();
  await createTrip(page, { name: `Unapproved trip ${suffix}` });
  await addIdea(page, { name: `Unapproved idea ${suffix}` });
  await updateTrip(page, { dateNotes: 'A slower weekend' });
  await requestIdeaReview(page);

  await expect(by(page, ids.applyIdea).first()).toBeVisible();
  await expect(by(page, ids.applyIdea).first()).toBeDisabled();
  await reloadAppPage(page);
  await expect(by(page, ids.applyIdea).first()).toBeDisabled();
});
